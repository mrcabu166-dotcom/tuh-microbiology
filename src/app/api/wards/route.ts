import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const res = await query(
      'SELECT id, ward_name, department, contact_phone, telegram_chat_id FROM wards WHERE is_active = true ORDER BY id ASC'
    );
    return NextResponse.json({ success: true, wards: res.rows });
  } catch (err: any) {
    console.error('Error fetching wards:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
