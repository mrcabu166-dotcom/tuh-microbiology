import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import {
  answerCallbackQuery,
  updateTelegramMessageAcknowledged,
} from '@/lib/telegram';
import { CriticalResult, Ward } from '@/types';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const update = await request.json();

    // 1. Handle Callback Query (Inline Button Click)
    if (update.callback_query) {
      const cq = update.callback_query;
      const data: string = cq.data || '';
      const callbackQueryId = cq.id;

      if (data.startsWith('ack:')) {
        const resultId = data.replace('ack:', '').trim();

        // Extract user display name from Telegram
        const user = cq.from;
        let displayName = user.first_name || '';
        if (user.last_name) displayName += ` ${user.last_name}`;
        if (user.username) displayName += ` (@${user.username})`;
        displayName = displayName.trim() || `User ID: ${user.id}`;

        // Fetch current alert
        const alertRes = await query(
          `SELECT cr.*, w.ward_name, w.telegram_chat_id, w.contact_phone
           FROM critical_results cr
           LEFT JOIN wards w ON cr.ward_id = w.id
           WHERE cr.id = $1`,
          [resultId]
        );

        if (alertRes.rows.length === 0) {
          await answerCallbackQuery(callbackQueryId, '❌ ไม่พบข้อมูลผลตรวจวิกฤตนี้', true);
          return NextResponse.json({ ok: true });
        }

        const alert: CriticalResult = alertRes.rows[0];

        if (alert.status === 'ACKNOWLEDGED') {
          await answerCallbackQuery(
            callbackQueryId,
            `ℹ️ ผลนี้ได้รับการรับทราบไปแล้วโดย ${alert.acknowledged_by_name || 'เจ้าหน้าที่'}`,
            true
          );
          return NextResponse.json({ ok: true });
        }

        const now = new Date();

        // Update database record
        await query(
          `UPDATE critical_results
           SET status = 'ACKNOWLEDGED',
               acknowledged_by_name = $1,
               acknowledged_at = $2,
               acknowledged_channel = 'TELEGRAM',
               updated_at = $2
           WHERE id = $3`,
          [displayName, now, resultId]
        );

        // Log audit trail
        await query(
          `INSERT INTO alert_logs (result_id, event_type, sent_at, raw_response)
           VALUES ($1, 'ACKNOWLEDGED', $2, $3)`,
          [resultId, now, JSON.stringify({ channel: 'TELEGRAM', by: displayName, user_id: user.id })]
        );

        // Answer callback query with toast
        await answerCallbackQuery(
          callbackQueryId,
          '✅ บันทึกการรับทราบผลเรียบร้อยแล้ว ขอบคุณครับ',
          false
        );

        // Dynamically edit message to remove button
        if (cq.message && cq.message.message_id) {
          const ward: Ward = {
            id: alert.ward_id,
            ward_name: alert.ward_name || '',
            telegram_chat_id: (alert as any).telegram_chat_id,
            contact_phone: alert.contact_phone,
            is_active: true,
            created_at: '',
          };
          alert.telegram_message_id = cq.message.message_id;
          await updateTelegramMessageAcknowledged(
            alert,
            displayName,
            'TELEGRAM',
            now,
            ward
          );
        }

        return NextResponse.json({ ok: true });
      }
    }

    // 2. Handle /id or /start command in chat (Helper for hospital admin to find chat ID)
    if (update.message && update.message.text) {
      const text = update.message.text.trim();
      const chatId = update.message.chat.id;
      const chatTitle = update.message.chat.title || update.message.chat.first_name || 'แชทนี้';

      if (text.startsWith('/id') || text.startsWith('/start')) {
        const token = process.env.TELEGRAM_BOT_TOKEN;
        if (token) {
          const infoMsg = `🏥 *Smart Critical Microbiology Alert Bot*\nโรงพยาบาลธรรมศาสตร์เฉลิมพระเกียรติ\n\n📌 *ข้อมูลแชทกลุ่มนี้:*\n• ชื่อกลุ่ม: *${chatTitle}*\n• Chat ID: \`${chatId}\`\n\n(นำ Chat ID นี้ไประบุในตารางหอผู้ป่วยหรือไฟล์ .env เพื่อรับแจ้งเตือน)`;
          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: infoMsg,
              parse_mode: 'Markdown',
            }),
          });
        }
      }
      // If not a command, try parsing as microbiology alert
      const { parseTelegramAlert } = await import('@/lib/hermesParser');
      const parsed = parseTelegramAlert(text);
      if (parsed) {
        await query(
          `INSERT INTO microbiology_alerts (
            telegram_message_id, telegram_chat_id, chat_title, alert_date,
            hn, patient_name, ward, specimen, organism, resistance_type,
            is_amr, findings_detail, raw_message
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
          [
            update.message.message_id || null,
            String(chatId),
            chatTitle,
            parsed.alert_date,
            parsed.hn,
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
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('Error handling Telegram webhook:', err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
