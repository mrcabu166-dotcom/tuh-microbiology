import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'daily'; // 'daily' | 'weekly' | 'monthly'

    let dateFilter = `alert_date >= CURRENT_DATE`;
    let timeGrouping = `TO_CHAR(alert_date, 'HH24:00')`;

    if (period === 'weekly') {
      dateFilter = `alert_date >= NOW() - INTERVAL '7 days'`;
      timeGrouping = `TO_CHAR(alert_date, 'DD Mon')`;
    } else if (period === 'monthly') {
      dateFilter = `alert_date >= NOW() - INTERVAL '30 days'`;
      timeGrouping = `TO_CHAR(alert_date, 'DD Mon')`;
    }

    // 1. Overall Totals
    const statsRes = await query(`
      SELECT 
        COUNT(*) as total_alerts,
        COUNT(*) FILTER (WHERE is_amr = true) as amr_count,
        COUNT(*) FILTER (WHERE specimen ILIKE '%hemo%' OR specimen ILIKE '%csf%' OR specimen ILIKE '%เลือด%') as sterile_count
      FROM microbiology_alerts
      WHERE ${dateFilter}
    `);
    const totalAlerts = parseInt(statsRes.rows[0]?.total_alerts || '0', 10);
    const amrCount = parseInt(statsRes.rows[0]?.amr_count || '0', 10);
    const sterileCount = parseInt(statsRes.rows[0]?.sterile_count || '0', 10);
    const amrPercentage = totalAlerts > 0 ? Math.round((amrCount / totalAlerts) * 1000) / 10 : 0;

    // 2. Top Organisms
    const orgRes = await query(`
      SELECT organism, COUNT(*) as count
      FROM microbiology_alerts
      WHERE ${dateFilter}
      GROUP BY organism
      ORDER BY count DESC
      LIMIT 6
    `);
    const topOrganisms = orgRes.rows.map((r) => ({
      organism: r.organism,
      count: parseInt(r.count, 10),
      percentage: totalAlerts > 0 ? Math.round((parseInt(r.count, 10) / totalAlerts) * 1000) / 10 : 0,
    }));

    // 3. Top Wards
    const wardRes = await query(`
      SELECT ward, COUNT(*) as count
      FROM microbiology_alerts
      WHERE ${dateFilter}
      GROUP BY ward
      ORDER BY count DESC
      LIMIT 6
    `);
    const topWards = wardRes.rows.map((r) => ({
      ward: r.ward,
      count: parseInt(r.count, 10),
      percentage: totalAlerts > 0 ? Math.round((parseInt(r.count, 10) / totalAlerts) * 1000) / 10 : 0,
    }));

    // 4. Resistance Breakdown
    const resBreakdown = await query(`
      SELECT COALESCE(resistance_type, 'ทั่วไป (Non-MDRO)') as type, COUNT(*) as count
      FROM microbiology_alerts
      WHERE ${dateFilter}
      GROUP BY type
      ORDER BY count DESC
    `);
    const resistanceBreakdown = resBreakdown.rows.map((r) => ({
      type: r.type,
      count: parseInt(r.count, 10),
    }));

    // 5. Trend Timeline Data
    const trendRes = await query(`
      SELECT 
        ${timeGrouping} as label,
        MIN(alert_date) as sort_time,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE is_amr = true) as amr
      FROM microbiology_alerts
      WHERE ${dateFilter}
      GROUP BY label
      ORDER BY sort_time ASC
    `);
    const trendTimeline = trendRes.rows.map((r) => ({
      label: r.label,
      total: parseInt(r.total, 10),
      amr: parseInt(r.amr, 10),
    }));

    // 6. Alert Records (Unmasked full data)
    const listRes = await query(`
      SELECT 
        id, alert_date, hn, patient_name, ward, specimen, 
        organism, resistance_type, is_amr, findings_detail, raw_message
      FROM microbiology_alerts
      WHERE ${dateFilter}
      ORDER BY alert_date DESC
      LIMIT 200
    `);

    return NextResponse.json({
      success: true,
      period,
      summary: {
        total_alerts: totalAlerts,
        amr_count: amrCount,
        amr_percentage: amrPercentage,
        sterile_count: sterileCount,
      },
      top_organisms: topOrganisms,
      top_wards: topWards,
      resistance_breakdown: resistanceBreakdown,
      trend_timeline: trendTimeline,
      alerts: listRes.rows,
    });
  } catch (err: any) {
    console.error('Error fetching summary dashboard data:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
