import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { sendGentleReminder, sendSingleEscalationNotice } from '@/lib/telegram';
import { CriticalResult, Ward } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 1. Fetch unacknowledged alerts that are at least 10 minutes old
    const unackRes = await query(`
      SELECT 
        cr.*, 
        w.ward_name, 
        w.contact_phone, 
        w.telegram_chat_id,
        EXTRACT(EPOCH FROM (NOW() - cr.reported_at)) / 60 as minutes_elapsed
      FROM critical_results cr
      LEFT JOIN wards w ON cr.ward_id = w.id
      WHERE cr.status IN ('PENDING', 'SENT', 'ESCALATED')
        AND cr.reported_at >= NOW() - INTERVAL '24 hours'
    `);

    const alerts = unackRes.rows;
    const actionsTaken: any[] = [];

    for (const alert of alerts) {
      const minutesElapsed = parseFloat(alert.minutes_elapsed);
      const ward: Ward = {
        id: alert.ward_id,
        ward_name: alert.ward_name || '',
        telegram_chat_id: alert.telegram_chat_id,
        contact_phone: alert.contact_phone,
        is_active: true,
        created_at: '',
      };

      // Check existing logs for this result to avoid duplicate messages
      const logRes = await query(
        'SELECT event_type FROM alert_logs WHERE result_id = $1',
        [alert.id]
      );
      const sentEvents = new Set(logRes.rows.map(r => r.event_type));

      // CASE 1: 10 - 15 minutes elapsed -> Single Gentle Reminder
      if (minutesElapsed >= 10 && minutesElapsed < 15) {
        if (!sentEvents.has('REMINDER_10MIN')) {
          const res = await sendGentleReminder(alert, ward);
          await query(
            `INSERT INTO alert_logs (result_id, event_type, sent_at, raw_response)
             VALUES ($1, 'REMINDER_10MIN', NOW(), $2)`,
            [alert.id, JSON.stringify(res)]
          );
          actionsTaken.push({ id: alert.id, action: 'REMINDER_10MIN', success: res.ok });
        }
      }

      // CASE 2: >= 15 minutes elapsed -> Single Escalation Notice (No repetitive spam)
      if (minutesElapsed >= 15) {
        // Update status to ESCALATED if not already
        if (alert.status !== 'ESCALATED') {
          await query(
            `UPDATE critical_results SET status = 'ESCALATED', updated_at = NOW() WHERE id = $1`,
            [alert.id]
          );
        }

        if (!sentEvents.has('ESCALATION_15MIN')) {
          const res = await sendSingleEscalationNotice(alert, ward);
          await query(
            `INSERT INTO alert_logs (result_id, event_type, sent_at, raw_response)
             VALUES ($1, 'ESCALATION_15MIN', NOW(), $2)`,
            [alert.id, JSON.stringify(res)]
          );
          actionsTaken.push({ id: alert.id, action: 'ESCALATION_15MIN', success: res.ok });
        }
      }
    }

    return NextResponse.json({
      success: true,
      processed_count: alerts.length,
      actions: actionsTaken,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('Error in reminder cron worker:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
