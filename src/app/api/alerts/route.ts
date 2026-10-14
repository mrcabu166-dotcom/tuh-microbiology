import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { sendCriticalAlert } from '@/lib/telegram';
import { CriticalResult, Ward } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filterAmr = searchParams.get('amr') === 'true';
    const statusFilter = searchParams.get('status');

    let sql = `
      SELECT 
        cr.*, 
        w.ward_name, 
        w.contact_phone, 
        w.telegram_chat_id 
      FROM critical_results cr
      LEFT JOIN wards w ON cr.ward_id = w.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filterAmr) {
      sql += ` AND cr.is_amr = true`;
    }

    if (statusFilter && statusFilter !== 'ALL') {
      params.push(statusFilter);
      sql += ` AND cr.status = $${params.length}`;
    }

    sql += ` ORDER BY cr.reported_at DESC LIMIT 100`;

    const res = await query(sql, params);
    const alerts: CriticalResult[] = res.rows;

    // Calculate CQI & HA KPI Metrics
    const kpiRes = await query(`
      SELECT 
        COUNT(*) FILTER (WHERE reported_at >= CURRENT_DATE) as total_today,
        COUNT(*) FILTER (WHERE reported_at >= DATE_TRUNC('month', CURRENT_DATE)) as total_month,
        COUNT(*) FILTER (WHERE status IN ('PENDING', 'SENT')) as pending_count,
        COUNT(*) FILTER (WHERE status = 'ESCALATED') as escalated_count,
        COUNT(*) FILTER (WHERE status IN ('ACKNOWLEDGED', 'MANUAL_CALLED') AND reported_at >= CURRENT_DATE) as acknowledged_count,
        COUNT(*) FILTER (WHERE is_amr = true AND reported_at >= DATE_TRUNC('month', CURRENT_DATE)) as amr_total_count,
        PERCENTILE_CONT(0.5) WITHIN GROUP (
          ORDER BY EXTRACT(EPOCH FROM (acknowledged_at - reported_at)) / 60
        ) FILTER (WHERE acknowledged_at IS NOT NULL AND reported_at >= DATE_TRUNC('month', CURRENT_DATE)) as median_ack_minutes,
        COUNT(*) FILTER (
          WHERE acknowledged_at IS NOT NULL 
          AND EXTRACT(EPOCH FROM (acknowledged_at - reported_at)) / 60 <= 15
          AND reported_at >= DATE_TRUNC('month', CURRENT_DATE)
        ) as ack_within_15m_count,
        COUNT(*) FILTER (
          WHERE acknowledged_at IS NOT NULL 
          AND reported_at >= DATE_TRUNC('month', CURRENT_DATE)
        ) as total_ack_count
      FROM critical_results
    `);

    // AMR Breakdown
    const amrRes = await query(`
      SELECT amr_type, COUNT(*) as count 
      FROM critical_results 
      WHERE is_amr = true AND reported_at >= DATE_TRUNC('month', CURRENT_DATE)
      GROUP BY amr_type
    `);

    const amrBreakdown: { [key: string]: number } = {};
    amrRes.rows.forEach(r => {
      if (r.amr_type) amrBreakdown[r.amr_type] = parseInt(r.count, 10);
    });

    const kRow = kpiRes.rows[0] || {};
    const totalAck = parseInt(kRow.total_ack_count || '0', 10);
    const within15m = parseInt(kRow.ack_within_15m_count || '0', 10);
    const percentWithin15 = totalAck > 0 ? Math.round((within15m / totalAck) * 1000) / 10 : 100;

    return NextResponse.json({
      success: true,
      alerts,
      kpi: {
        total_today: parseInt(kRow.total_today || '0', 10),
        total_month: parseInt(kRow.total_month || '0', 10),
        pending_count: parseInt(kRow.pending_count || '0', 10),
        escalated_count: parseInt(kRow.escalated_count || '0', 10),
        acknowledged_count: parseInt(kRow.acknowledged_count || '0', 10),
        median_ack_minutes: Math.round((parseFloat(kRow.median_ack_minutes || '0')) * 10) / 10,
        percent_within_15min: percentWithin15,
        amr_total_count: parseInt(kRow.amr_total_count || '0', 10),
        amr_breakdown: amrBreakdown,
      },
    });
  } catch (err: any) {
    console.error('Error fetching alerts:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      specimen_no,
      hn,
      patient_initials,
      ward_id,
      specimen_type,
      findings_detail,
      urgency_level = 'LEVEL_1_CRITICAL',
      is_amr = false,
      amr_type = null,
      antibiogram_summary = null,
      ic_action_recommended = null,
      reported_by,
    } = body;

    if (!specimen_no || !hn || !ward_id || !specimen_type || !findings_detail || !reported_by) {
      return NextResponse.json(
        { success: false, error: 'กรุณากรอกข้อมูลสำคัญให้ครบถ้วน' },
        { status: 400 }
      );
    }

    // Fetch Ward details for contact info and Telegram chat ID
    const wardRes = await query('SELECT * FROM wards WHERE id = $1', [ward_id]);
    const ward: Ward | null = wardRes.rows[0] || null;

    // Insert critical result
    const insertRes = await query(
      `INSERT INTO critical_results (
        specimen_no, hn, patient_initials, ward_id,
        specimen_type, findings_detail, urgency_level,
        is_amr, amr_type, antibiogram_summary, ic_action_recommended,
        reported_by, reported_at, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), 'SENT')
      RETURNING *`,
      [
        specimen_no.trim(),
        hn.trim(),
        patient_initials?.trim() || null,
        ward_id,
        specimen_type.trim(),
        findings_detail.trim(),
        urgency_level,
        Boolean(is_amr),
        amr_type || null,
        antibiogram_summary || null,
        ic_action_recommended || null,
        reported_by.trim(),
      ]
    );

    const createdAlert: CriticalResult = insertRes.rows[0];

    // Trigger Telegram notification
    const tgResult = await sendCriticalAlert(createdAlert, ward);

    if (tgResult.ok && tgResult.message_id) {
      // Save telegram_message_id for future inline button dynamic editing
      await query(
        'UPDATE critical_results SET telegram_message_id = $1 WHERE id = $2',
        [tgResult.message_id, createdAlert.id]
      );
      createdAlert.telegram_message_id = tgResult.message_id;
    }

    // Also insert into microbiology_alerts for surveillance dashboard (Unmasked HN & Details)
    let parsedOrganism = findings_detail.trim();
    if (is_amr) {
      if (amr_type === 'CRAB') parsedOrganism = 'Acinetobacter baumannii';
      else if (amr_type === 'CRE') parsedOrganism = 'Klebsiella pneumoniae';
      else if (amr_type === 'MRSA') parsedOrganism = 'Staphylococcus aureus';
      else if (amr_type === 'VRE') parsedOrganism = 'Enterococcus faecium';
      else if (amr_type === 'ESBL') parsedOrganism = 'Escherichia coli';
      else if (amr_type === 'MDR_PSEUDOMONAS') parsedOrganism = 'Pseudomonas aeruginosa';
    }

    await query(
      `INSERT INTO microbiology_alerts (
        telegram_message_id, telegram_chat_id, chat_title, alert_date,
        hn, patient_name, ward, specimen, organism, resistance_type,
        is_amr, findings_detail, raw_message
      ) VALUES ($1, $2, $3, NOW(), $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        tgResult.message_id || null,
        ward?.telegram_chat_id || process.env.TELEGRAM_CHAT_ID || '-1003285766063',
        'LABALEARTTUH',
        hn.trim(), // Unmasked HN
        patient_initials?.trim() || null,
        ward?.ward_name || 'MICU',
        specimen_type.trim(),
        parsedOrganism,
        is_amr ? (amr_type || 'AMR') : null,
        Boolean(is_amr),
        findings_detail.trim(),
        `🚨 แจ้งเตือนผลตรวจวิกฤต\nHN: ${hn.trim()}\nWard: ${ward?.ward_name || ''}\nSpecimen: ${specimen_type}\nResult: ${findings_detail}`,
      ]
    );

    return NextResponse.json({
      success: true,
      alert: createdAlert,
      telegram: tgResult,
    });
  } catch (err: any) {
    console.error('Error creating critical alert:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
