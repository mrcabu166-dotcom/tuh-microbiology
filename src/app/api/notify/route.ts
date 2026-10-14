import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { parseTelegramAlert } from '@/lib/hermesParser';

export const dynamic = 'force-dynamic';

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '-1003285766063';

/**
 * POST /api/notify
 * 
 * Unified Notification & Database Ingestion Endpoint:
 * 1. Sends the alert message to Telegram group LABALEARTTUH (-5294922475)
 * 2. Simultaneously saves the unmasked alert into microbiology_alerts table
 * 3. Immediately available for Daily/Weekly/Monthly Surveillance Dashboard
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    let hn = body.hn || '';
    let patientName = body.patient_name || body.patient || null;
    let ward = body.ward || 'MICU';
    let specimen = body.specimen || 'Hemoculture';
    let organism = body.organism || '';
    let resistanceType = body.resistance_type || body.resistance || null;
    let isAmr = Boolean(body.is_amr);
    let findingsDetail = body.findings_detail || body.result || '';
    let rawMessage = body.text || '';

    // If raw text was provided, parse it
    if (body.text && !body.hn) {
      const parsed = parseTelegramAlert(body.text);
      if (parsed) {
        hn = parsed.hn;
        patientName = parsed.patient_name || null;
        ward = parsed.ward;
        specimen = parsed.specimen;
        organism = parsed.organism;
        resistanceType = parsed.resistance_type || null;
        isAmr = parsed.is_amr;
        findingsDetail = parsed.findings_detail;
        rawMessage = parsed.raw_message;
      }
    }

    if (!hn || hn === 'UNKNOWN_HN') {
      if (!rawMessage) {
        return NextResponse.json(
          { success: false, error: 'กรุณาระบุเลข HN หรือข้อความแจ้งเตือน (text)' },
          { status: 400 }
        );
      }
    }

    // 1. Construct Telegram Alert Message if not provided
    if (!rawMessage) {
      rawMessage = `🚨 *แจ้งเตือนผลตรวจวิกฤต (Critical Microbiology Alert)*\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `👤 *HN:* \`${hn}\`${patientName ? ` (${patientName})` : ''}\n` +
        `🏢 *หอผู้ป่วย:* ${ward}\n` +
        `🔬 *สิ่งส่งตรวจ:* ${specimen}\n` +
        `⚠️ *เชื้อก่อโรค:* *${organism || findingsDetail}*\n` +
        (resistanceType ? `🧬 *การดื้อยา:* *${resistanceType}*\n` : '') +
        `🕒 *เวลา:* ${new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `*กลุ่ม: LABALEARTTUH*`;
    }

    // 2. Send to Telegram Group LABALEARTTUH
    let telegramSent = false;
    let telegramMessageId: number | null = null;
    let telegramError: string | null = null;

    if (TELEGRAM_TOKEN && TELEGRAM_CHAT_ID) {
      try {
        const tgRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: TELEGRAM_CHAT_ID,
            text: rawMessage,
            parse_mode: 'Markdown',
          }),
        });
        const tgData = await tgRes.json();
        if (tgData.ok && tgData.result) {
          telegramSent = true;
          telegramMessageId = tgData.result.message_id;
        } else {
          telegramError = tgData.description || 'Telegram API returned not ok';
        }
      } catch (err: any) {
        telegramError = err.message;
      }
    }

    // 3. Save directly into PostgreSQL database (microbiology_alerts) - Unmasked!
    const insertRes = await query(
      `INSERT INTO microbiology_alerts (
        telegram_message_id, telegram_chat_id, chat_title, alert_date,
        hn, patient_name, ward, specimen, organism, resistance_type,
        is_amr, findings_detail, raw_message
      ) VALUES ($1, $2, $3, NOW(), $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        telegramMessageId,
        TELEGRAM_CHAT_ID,
        'LABALEARTTUH',
        hn, // Full unmasked HN
        patientName,
        ward,
        specimen,
        organism || findingsDetail,
        resistanceType,
        isAmr,
        findingsDetail || organism,
        rawMessage,
      ]
    );

    const savedAlert = insertRes.rows[0];

    return NextResponse.json({
      success: true,
      message: 'บอทได้ทำการส่งแจ้งเตือนและบันทึกข้อมูลเข้าฐานข้อมูล Dashboard เรียบร้อยแล้ว',
      telegram_sent: telegramSent,
      telegram_message_id: telegramMessageId,
      telegram_error: telegramError,
      alert: savedAlert,
    });
  } catch (err: any) {
    console.error('Error in /api/notify:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
