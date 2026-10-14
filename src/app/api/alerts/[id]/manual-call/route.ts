import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { updateTelegramMessageAcknowledged } from '@/lib/telegram';
import { CriticalResult, Ward } from '@/types';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const alertId = params.id;
    const body = await request.json();
    const {
      caller_name = 'ทน.ม. ผู้ปฏิบัติการ',
      recipient_name = '',
      call_note = '',
      close_alert = true,
    } = body;

    if (!recipient_name) {
      return NextResponse.json(
        { success: false, error: 'กรุณาระบุชื่อพยาบาล/แพทย์ผู้รับสายโทรศัพท์' },
        { status: 400 }
      );
    }

    const alertRes = await query(
      `SELECT cr.*, w.ward_name, w.telegram_chat_id, w.contact_phone
       FROM critical_results cr
       LEFT JOIN wards w ON cr.ward_id = w.id
       WHERE cr.id = $1`,
      [alertId]
    );

    if (alertRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'ไม่พบรายการผลวิกฤตนี้' }, { status: 404 });
    }

    const alert: CriticalResult = alertRes.rows[0];
    const now = new Date();
    const fullNote = `โทรแจ้ง: ${recipient_name}${call_note ? ` (${call_note})` : ''}`;

    let newStatus = alert.status;
    let ackBy = alert.acknowledged_by_name;
    let ackAt = alert.acknowledged_at;
    let ackChannel = alert.acknowledged_channel;

    if (close_alert) {
      newStatus = 'ACKNOWLEDGED';
      ackBy = recipient_name;
      ackAt = now.toISOString();
      ackChannel = 'PHONE_CALL';
    } else {
      newStatus = 'MANUAL_CALLED';
    }

    const updateRes = await query(
      `UPDATE critical_results
       SET status = $1,
           manual_call_by = $2,
           manual_call_at = $3,
           manual_call_note = $4,
           acknowledged_by_name = COALESCE($5, acknowledged_by_name),
           acknowledged_at = COALESCE($6, acknowledged_at),
           acknowledged_channel = COALESCE($7, acknowledged_channel),
           updated_at = $3
       WHERE id = $8
       RETURNING *`,
      [newStatus, caller_name, now, fullNote, ackBy, ackAt, ackChannel, alertId]
    );

    const updatedAlert: CriticalResult = updateRes.rows[0];

    // Log MANUAL_CALL in alert_logs
    await query(
      `INSERT INTO alert_logs (result_id, event_type, sent_at, raw_response)
       VALUES ($1, 'MANUAL_CALL', $2, $3)`,
      [alertId, now, JSON.stringify({ caller: caller_name, recipient: recipient_name, note: call_note })]
    );

    // Update Telegram message if alert is closed
    if (close_alert && alert.telegram_message_id) {
      const ward: Ward = {
        id: alert.ward_id,
        ward_name: alert.ward_name || '',
        telegram_chat_id: (alert as any).telegram_chat_id,
        contact_phone: alert.contact_phone,
        is_active: true,
        created_at: '',
      };
      await updateTelegramMessageAcknowledged(
        alert,
        recipient_name,
        'PHONE_CALL',
        now,
        ward
      );
    }

    return NextResponse.json({
      success: true,
      message: 'บันทึกการโทรรายงานผลเรียบร้อยแล้ว',
      alert: updatedAlert,
    });
  } catch (err: any) {
    console.error('Error logging manual phone call:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
