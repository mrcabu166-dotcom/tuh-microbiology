import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL not found in .env")

conn = psycopg2.connect(DATABASE_URL)
cur = conn.cursor()

# Check if there are already records
cur.execute("SELECT COUNT(*) FROM critical_results")
count = cur.fetchone()[0]

if count == 0:
    print("Inserting realistic mock critical results for TUH...")
    sql = """
    INSERT INTO critical_results (
        specimen_no, hn, patient_initials, ward_id,
        specimen_type, findings_detail, urgency_level,
        is_amr, amr_type, antibiogram_summary, ic_action_recommended,
        reported_by, reported_at, status, acknowledged_by_name, acknowledged_at, acknowledged_channel
    ) VALUES
    -- 1. Pending result (<10 min)
    (
        'HE-690905-001', '68****12', 'ส.บ.', 1,
        'Hemoculture (เลือด)', 'พบเชื้อแบคทีเรีย Gram negative bacilli (GNB)', 'LEVEL_1_CRITICAL',
        false, null, null, null,
        'ทน.ม. มานพ นันตาบุตร', NOW() - INTERVAL '3 minutes', 'SENT', null, null, null
    ),
    -- 2. AMR Result: CRAB in Reminder zone (11 min)
    (
        'SP-690905-008', '68****45', 'ว.พ.', 1,
        'Sputum (เสมหะ)', 'Acinetobacter baumannii (Carbapenem Resistant - CRAB)', 'LEVEL_1_CRITICAL',
        true, 'CRAB', 'Meropenem (R), Imipenem (R), Colistin (S)', 'ติดป้าย Contact Precautions ทันที สวมถุงมือ/กาวน์ แยกห้องหรือ Cohort',
        'ทน.ม. ปราญชลี หรั่งอ่อน', NOW() - INTERVAL '11 minutes', 'SENT', null, null, null
    ),
    -- 3. AMR Result: CRE in Danger Zone / Escalated (>15 min)
    (
        'UR-690905-014', '68****89', 'น.จ.', 2,
        'Urine (ปัสสาวะ)', 'Klebsiella pneumoniae (Carbapenem Resistant - CRE)', 'LEVEL_1_CRITICAL',
        true, 'CRE', 'Ertapenem (R), Meropenem (R), Amikacin (S)', 'Contact Precautions ขั้นสูงสุด ระวังการปนเปื้อนสายสวนปัสสาวะ',
        'ทน.ม. มานพ นันตาบุตร', NOW() - INTERVAL '18 minutes', 'ESCALATED', null, null, null
    ),
    -- 4. Completed / Acknowledged via Web Dashboard
    (
        'CSF-690905-003', '68****34', 'ก.ม.', 3,
        'CSF (น้ำไขสันหลัง)', 'พบ Cryptococcus spp. (India ink preparation positive)', 'LEVEL_1_CRITICAL',
        false, null, null, null,
        'ทน.ม. ปราญชลี หรั่งอ่อน', NOW() - INTERVAL '45 minutes', 'ACKNOWLEDGED', 'พว. สุภาพร (พยาบาลเวร ANICU)', NOW() - INTERVAL '41 minutes', 'WEB_DASHBOARD'
    );
    """
    cur.execute(sql)
    conn.commit()
    print("Seeded 4 mock critical results successfully!")
else:
    print(f"Database already has {count} critical results. Skipping mock seeding.")

cur.close()
conn.close()
