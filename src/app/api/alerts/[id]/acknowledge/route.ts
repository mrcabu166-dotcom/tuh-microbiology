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
    const body = await request.json().catch(() => ({}));
    const acknowledgedByName = body.acknowledged_by_name?.trim() || 'เจ้าหน้าที่ประจำหอผู้ป่วย';

    // 1. Fetch current alert and ward
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

    if (alert.status === 'ACKNOWLEDGED') {
      return NextResponse.json({
        success: true,
        message: 'รายการนี้ได้รับการกดยืนยันรับทราบผลไปก่อนหน้านี้แล้ว',
        alert,
      });
    }

    const now = new Date();

    // 2. Update status in Database
    const updateRes = await query(
      `UPDATE critical_results
       SET status = 'ACKNOWLEDGED',
           acknowledged_by_name = $1,
           acknowledged_at = $2,
           acknowledged_channel = 'WEB_DASHBOARD',
           updated_at = $2
       WHERE id = $3
       RETURNING *`,
      [acknowledgedByName, now, alertId]
    );

    const updatedAlert: CriticalResult = updateRes.rows[0];

    // 3. Log event in alert_logs
    await query(
      `INSERT INTO alert_logs (result_id, event_type, sent_at, raw_response)
       VALUES ($1, 'ACKNOWLEDGED', $2, $3)`,
      [alertId, now, JSON.stringify({ channel: 'WEB_DASHBOARD', by: acknowledgedByName })]
    );

    // 4. Dynamically update Telegram message to remove button
    if (alert.telegram_message_id) {
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
        acknowledgedByName,
        'WEB_DASHBOARD',
        now,
        ward
      );
    }

    return NextResponse.json({
      success: true,
      message: 'ยืนยันรับทราบผลตรวจเรียบร้อยแล้ว',
      alert: updatedAlert,
    });
  } catch (err: any) {
    console.error('Error acknowledging alert on web:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
