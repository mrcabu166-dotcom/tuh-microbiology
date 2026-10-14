import { CriticalResult, Ward } from '@/types';

const DEFAULT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const DEFAULT_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '';

interface TelegramResponse {
  ok: boolean;
  result?: any;
  description?: string;
  error_code?: number;
}

/**
 * Format date/time in Thai locale (Bangkok GMT+7)
 */
export function formatThaiDateTime(dateString: string | Date): string {
  const date = new Date(dateString);
  return date.toLocaleString('th-TH', {
    timeZone: 'Asia/Bangkok',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    day: '2-digit',
    month: 'short',
    year: '2-digit',
  });
}

/**
 * Sends initial Critical Microbiology / AMR alert to target Ward Telegram chat
 */
export async function sendCriticalAlert(
  result: CriticalResult,
  ward?: Ward | null
): Promise<{ ok: boolean; message_id?: number; error?: string }> {
  const token = DEFAULT_TOKEN;
  const chatId = ward?.telegram_chat_id || DEFAULT_CHAT_ID;

  if (!token || !chatId) {
    console.warn('⚠️ Telegram Token or Chat ID is not configured.');
    return { ok: false, error: 'Telegram credentials missing' };
  }

  const timeFormatted = formatThaiDateTime(result.reported_at);
  const wardName = ward?.ward_name || 'หอผู้ป่วยไม่ระบุ';
  const wardPhone = ward?.contact_phone || 'โทรศัพท์ต่อสายภายใน';

  let message = `🚨 *แจ้งเตือนผลตรวจวิกฤต (Critical Microbiology Alert)*\n`;
  
  if (result.is_amr) {
    message += `🧬 *[AMR ALERT: พบเชื้อดื้อยาสำคัญ - ${result.amr_type || 'MDRO'}]*\n`;
  }
  
  message += `━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `🔬 *สิ่งส่งตรวจ:* ${result.specimen_type} | 📄 *Lab No:* \`${result.specimen_no}\`\n`;
  message += `👤 *HN:* \`${result.hn}\`${result.patient_initials ? ` (${result.patient_initials})` : ''}\n`;
  message += `🏢 *หอผู้ป่วย:* ${wardName} (เบอร์ภายใน: *${wardPhone}*)\n`;
  message += `⚠️ *ผลตรวจวิเคราะห์:* *${result.findings_detail}*\n`;
  
  if (result.is_amr && result.antibiogram_summary) {
    message += `💊 *ความไวต่อยา (AST):* ${result.antibiogram_summary}\n`;
  }
  
  if (result.is_amr && result.ic_action_recommended) {
    message += `🛡️ *มาตรการ IC:* *${result.ic_action_recommended}*\n`;
  }

  message += `👨‍🔬 *ผู้รายงาน:* ทน.ม. ${result.reported_by}\n`;
  message += `🕒 *เวลาออกผล:* ${timeFormatted} น.\n`;
  message += `━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `⚠️ *โปรดกดยืนยันรับทราบผลทันทีเพื่อความปลอดภัยของผู้ป่วย*`;

  // Inline Keyboard with Callback Query
  const replyMarkup = {
    inline_keyboard: [
      [
        {
          text: '✅ กดยืนยันรับทราบผล (Acknowledge)',
          callback_data: `ack:${result.id}`,
        },
      ],
    ],
  };

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown',
        reply_markup: replyMarkup,
      }),
    });

    const data: TelegramResponse = await res.json();
    if (data.ok && data.result) {
      return { ok: true, message_id: data.result.message_id };
    } else {
      console.error('Telegram sendMessage error:', data.description);
      return { ok: false, error: data.description };
    }
  } catch (err: any) {
    console.error('Failed to post to Telegram:', err);
    return { ok: false, error: err.message };
  }
}

/**
 * Updates original Telegram message to remove button and append acknowledgement details
 */
export async function updateTelegramMessageAcknowledged(
  result: CriticalResult,
  ackByName: string,
  channel: string,
  ackAt: string | Date,
  ward?: Ward | null
): Promise<{ ok: boolean; error?: string }> {
  const token = DEFAULT_TOKEN;
  const chatId = ward?.telegram_chat_id || DEFAULT_CHAT_ID;
  const messageId = result.telegram_message_id;

  if (!token || !chatId || !messageId) {
    return { ok: false, error: 'Cannot update: missing token, chatId, or messageId' };
  }

  const timeFormatted = formatThaiDateTime(result.reported_at);
  const ackTimeFormatted = formatThaiDateTime(ackAt);
  const wardName = ward?.ward_name || 'หอผู้ป่วย';

  let channelLabel = 'Telegram Bot';
  if (channel === 'WEB_DASHBOARD') channelLabel = 'Web Dashboard (คอมพิวเตอร์)';
  if (channel === 'PHONE_CALL') channelLabel = 'โทรศัพท์สายด่วน (Manual Phone Call)';

  let message = `🚨 *แจ้งเตือนผลตรวจวิกฤต (Critical Microbiology Alert)*\n`;
  if (result.is_amr) {
    message += `🧬 *[AMR ALERT: พบเชื้อดื้อยาสำคัญ - ${result.amr_type || 'MDRO'}]*\n`;
  }
  message += `━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `🔬 *สิ่งส่งตรวจ:* ${result.specimen_type} | 📄 *Lab No:* \`${result.specimen_no}\`\n`;
  message += `👤 *HN:* \`${result.hn}\`${result.patient_initials ? ` (${result.patient_initials})` : ''}\n`;
  message += `🏢 *หอผู้ป่วย:* ${wardName}\n`;
  message += `⚠️ *ผลตรวจวิเคราะห์:* *${result.findings_detail}*\n`;
  if (result.is_amr && result.antibiogram_summary) {
    message += `💊 *ความไวต่อยา (AST):* ${result.antibiogram_summary}\n`;
  }
  message += `🕒 *เวลาออกผล:* ${timeFormatted} น.\n`;
  message += `━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `✅ *ได้รับการยืนยันรับทราบผลเรียบร้อยแล้ว*\n`;
  message += `👤 *ผู้รับทราบ:* ${ackByName}\n`;
  message += `🕒 *เวลารับทราบ:* ${ackTimeFormatted} น.\n`;
  message += `📱 *ช่องทางยืนยัน:* ${channelLabel}\n`;
  message += `━━━━━━━━━━━━━━━━━━━━━━━━━`;

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        text: message,
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: [] }, // Remove buttons
      }),
    });

    const data: TelegramResponse = await res.json();
    return { ok: data.ok, error: data.description };
  } catch (err: any) {
    console.error('Failed to edit Telegram message:', err);
    return { ok: false, error: err.message };
  }
}

/**
 * Sends a single gentle reminder at 10 minutes if unacknowledged
 */
export async function sendGentleReminder(
  result: CriticalResult,
  ward?: Ward | null
): Promise<{ ok: boolean; error?: string }> {
  const token = DEFAULT_TOKEN;
  const chatId = ward?.telegram_chat_id || DEFAULT_CHAT_ID;

  if (!token || !chatId) return { ok: false, error: 'Telegram credentials missing' };

  const wardName = ward?.ward_name || 'หอผู้ป่วย';
  const wardPhone = ward?.contact_phone || 'สายใน';

  let message = `⚠️ *[แจ้งเตือนซ้ำ 10 นาที] ผลตรวจวิกฤตยังไม่ได้รับการรับทราบ*\n`;
  message += `━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `🔬 *สิ่งส่งตรวจ:* ${result.specimen_type} | 👤 *HN:* \`${result.hn}\`\n`;
  message += `🏢 *หอผู้ป่วย:* ${wardName} (เบอร์ภายใน: *${wardPhone}*)\n`;
  message += `⚠️ *ผลตรวจ:* *${result.findings_detail}*\n`;
  message += `━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `กรุณากดยืนยันรับทราบผล หรือยืนยันผ่านหน้า Web Dashboard เพื่อความปลอดภัยของผู้ป่วย`;

  const replyMarkup = {
    inline_keyboard: [
      [
        {
          text: '✅ กดยืนยันรับทราบผล (Acknowledge)',
          callback_data: `ack:${result.id}`,
        },
      ],
    ],
  };

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown',
        reply_markup: replyMarkup,
      }),
    });

    const data: TelegramResponse = await res.json();
    return { ok: data.ok, error: data.description };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}

/**
 * Sends a single escalation notice at 15 minutes (Danger Zone)
 */
export async function sendSingleEscalationNotice(
  result: CriticalResult,
  ward?: Ward | null
): Promise<{ ok: boolean; error?: string }> {
  const token = DEFAULT_TOKEN;
  const chatId = ward?.telegram_chat_id || DEFAULT_CHAT_ID;

  if (!token || !chatId) return { ok: false, error: 'Telegram credentials missing' };

  const wardName = ward?.ward_name || 'หอผู้ป่วย';
  const wardPhone = ward?.contact_phone || 'สายใน';

  let message = `🚨 *[ESCALATION - เกินกำหนด 15 นาที!]*\n`;
  message += `━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `⚠️ ผลตรวจวิกฤตยังไม่ได้รับการตอบรับเกิน 15 นาที!\n`;
  message += `🔬 *สิ่งส่งตรวจ:* ${result.specimen_type} | 👤 *HN:* \`${result.hn}\`\n`;
  message += `🏢 *หอผู้ป่วย:* ${wardName} (เบอร์ภายใน: *${wardPhone}*)\n`;
  message += `📞 *ห้องปฏิบัติการจุลชีววิทยากำลังประสานงานติดต่อทางโทรศัพท์สายตรงตาม Safety Net Protocol*\n`;
  message += `━━━━━━━━━━━━━━━━━━━━━━━━━`;

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown',
      }),
    });

    const data: TelegramResponse = await res.json();
    return { ok: data.ok, error: data.description };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}

/**
 * Answers Telegram callback queries (shows a popup toast on Telegram app)
 */
export async function answerCallbackQuery(
  callbackQueryId: string,
  text: string,
  showAlert: boolean = false
) {
  const token = DEFAULT_TOKEN;
  if (!token) return;

  try {
    await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text,
        show_alert: showAlert,
      }),
    });
  } catch (err) {
    console.error('Failed to answer callback query:', err);
  }
}
