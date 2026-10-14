import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { parseTelegramAlert } from '@/lib/hermesParser';

export const dynamic = 'force-dynamic';

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;

/**
 * Saves parsed alert into microbiology_alerts table (Unmasked data)
 */
async function saveAlert(parsed: ReturnType<typeof parseTelegramAlert>, messageId?: number, chatId?: string, chatTitle?: string) {
  if (!parsed) return null;

  // Duplicate check: same HN + organism + within 24 hours
  const dupCheck = await query(
    `SELECT id FROM microbiology_alerts 
     WHERE hn = $1 AND organism = $2 AND alert_date >= NOW() - INTERVAL '24 hours'`,
    [parsed.hn, parsed.organism]
  );

  if (dupCheck.rows.length > 0) {
    return { duplicate: true, id: dupCheck.rows[0].id };
  }

  const insertRes = await query(
    `INSERT INTO microbiology_alerts (
      telegram_message_id, telegram_chat_id, chat_title, alert_date,
      hn, patient_name, ward, specimen, organism, resistance_type,
      is_amr, findings_detail, raw_message
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    RETURNING *`,
    [
      messageId || null,
      chatId || process.env.TELEGRAM_CHAT_ID || '-1003285766063',
      chatTitle || 'LABALEARTTUH',
      parsed.alert_date,
      parsed.hn, // FULL UNMASKED HN
      parsed.patient_name || null,
      parsed.ward,
      parsed.specimen,
      parsed.organism,
      parsed.resistance_type || null,
      parsed.is_amr,
      parsed.findings_detail,
      parsed.raw_message,
    ]
  );

  return { duplicate: false, alert: insertRes.rows[0] };
}

/**
 * GET: Polls Telegram Bot getUpdates to fetch and ingest messages from LABALEARTTUH
 */
export async function GET() {
  if (!TOKEN) {
    return NextResponse.json({ success: false, error: 'TELEGRAM_BOT_TOKEN is missing in .env' }, { status: 400 });
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${TOKEN}/getUpdates?offset=-50&timeout=2`);
    const data = await res.json();
    const updates = data.result || [];

    const ingested: any[] = [];

    for (const u of updates) {
      const msg = u.message || u.channel_post;
      if (!msg || !msg.text) continue;

      const chat = msg.chat || {};
      const chatTitle = chat.title || 'LABALEARTTUH';

      const parsed = parseTelegramAlert(msg.text);
      if (parsed) {
        const saveRes = await saveAlert(parsed, msg.message_id, chat.id ? String(chat.id) : undefined, chatTitle);
        if (saveRes && !saveRes.duplicate) {
          ingested.push(saveRes.alert);
        }
      }
    }

    return NextResponse.json({
      success: true,
      updates_found: updates.length,
      ingested_count: ingested.length,
      ingested,
    });
  } catch (err: any) {
    console.error('Error syncing from Telegram:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/**
 * POST: Manually ingest alert text pasted by staff from Telegram group LABALEARTTUH
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const rawText = body.text;

    if (!rawText || !rawText.trim()) {
      return NextResponse.json({ success: false, error: 'กรุณาระบุข้อความแจ้งเตือน' }, { status: 400 });
    }

    // Support single or multiple alert messages in one paste
    const chunks = rawText.split(/(?=(?:CRAB|CRE|MRSA|VRE|ESBL|MDR|Alert|🚨|HN:)\s*)/i).filter((c: string) => c.trim().length > 10);
    const textList = chunks.length > 0 ? chunks : [rawText];

    const results: any[] = [];

    for (const block of textList) {
      const parsed = parseTelegramAlert(block);
      if (parsed) {
        const res = await saveAlert(parsed, undefined, undefined, 'LABALEARTTUH');
        if (res && !res.duplicate) {
          results.push(res.alert);
        }
      }
    }

    if (results.length === 0) {
      // Fallback: try parsing whole text
      const parsed = parseTelegramAlert(rawText);
      if (parsed) {
        const res = await saveAlert(parsed, undefined, undefined, 'LABALEARTTUH');
        if (res) results.push(res.alert || res);
      }
    }

    return NextResponse.json({
      success: true,
      message: `นำเข้าข้อมูลการแจ้งเตือนจาก LABALEARTTUH สำเร็จ (${results.length} รายการ)`,
      imported_count: results.length,
      alerts: results,
    });
  } catch (err: any) {
    console.error('Error importing Telegram text:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
