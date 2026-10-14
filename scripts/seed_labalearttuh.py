import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

conn = psycopg2.connect(os.getenv('DATABASE_URL'))
cur = conn.cursor()

# Clean existing records in microbiology_alerts to start fresh with real LABALEARTTUH data
cur.execute("DELETE FROM microbiology_alerts")

print("Seeding realistic LABALEARTTUH alerts across Today, This Week, and This Month...")

sql = """
INSERT INTO microbiology_alerts (
    telegram_chat_id, chat_title, alert_date,
    hn, patient_name, ward, specimen, organism, resistance_type, is_amr, findings_detail, raw_message
) VALUES
-- TODAY (Daily Alerts)
(
    '-5294922475', 'LABALEARTTUH', NOW() - INTERVAL '35 minutes',
    '123456', 'นายสมพงษ์ บุญเรือง', 'MICU', 'Sputum', 'Acinetobacter baumannii', 'CRAB', true,
    'Acinetobacter baumannii (CRAB Alert)',
    'CRAB Alert\\nHN: 123456\\nWard: MICU\\nSpecimen: Sputum\\nOrganism: Acinetobacter baumannii\\nResistance: Carbapenem Resistant\\nDate: 2026-09-05'
),
(
    '-5294922475', 'LABALEARTTUH', NOW() - INTERVAL '2 hours',
    '68120451', 'นางวาสนา โชคเจริญ', 'SICU', 'Hemoculture', 'Gram negative bacilli (GNB)', null, false,
    'Hemoculture Positive: Gram negative bacilli (GNB)',
    '🚨 แจ้งเตือนผลตรวจวิกฤต (Critical Alert)\\nHN: 68120451\\nWard: SICU\\nSpecimen: Hemoculture\\nResult: Gram negative bacilli (GNB)'
),
(
    '-5294922475', 'LABALEARTTUH', NOW() - INTERVAL '4 hours',
    '68199214', 'น.ส.กัญญารัตน์ สดใส', 'อายุรกรรมกิตติวัฒนา 2', 'Urine', 'Klebsiella pneumoniae', 'CRE', true,
    'Klebsiella pneumoniae (CRE Alert)',
    'CRE Alert\\nHN: 68199214\\nWard: อายุรกรรมกิตติวัฒนา 2\\nSpecimen: Urine\\nOrganism: Klebsiella pneumoniae\\nResistance: Carbapenem Resistant'
),
(
    '-5294922475', 'LABALEARTTUH', NOW() - INTERVAL '7 hours',
    '68155421', 'นายประวิทย์ รัตนชัย', 'ศัลยกรรมอุบัติเหตุ 1', 'Pus / Wound', 'Staphylococcus aureus', 'MRSA', true,
    'Staphylococcus aureus (MRSA Alert)',
    'MRSA Alert\\nHN: 68155421\\nWard: ศัลยกรรมอุบัติเหตุ 1\\nSpecimen: Pus / Wound\\nOrganism: Staphylococcus aureus\\nResistance: Methicillin Resistant'
),

-- THIS WEEK (Past 2 - 6 days)
(
    '-5294922475', 'LABALEARTTUH', NOW() - INTERVAL '1 day',
    '68102394', 'นายธีรภัทร มณีงาม', 'MICU', 'Sputum', 'Acinetobacter baumannii', 'CRAB', true,
    'Acinetobacter baumannii (CRAB Alert)',
    'CRAB Alert\\nHN: 68102394\\nWard: MICU\\nSpecimen: Sputum\\nOrganism: Acinetobacter baumannii\\nResistance: Carbapenem Resistant'
),
(
    '-5294922475', 'LABALEARTTUH', NOW() - INTERVAL '2 days',
    '68134902', 'นางมยุรี วงศ์สว่าง', 'ICU CVT', 'Hemoculture', 'Gram positive cocci in clusters (GPC)', null, false,
    'Hemoculture Positive: GPC in clusters',
    'Hemoculture Alert\\nHN: 68134902\\nWard: ICU CVT\\nSpecimen: Hemoculture\\nResult: GPC in clusters'
),
(
    '-5294922475', 'LABALEARTTUH', NOW() - INTERVAL '3 days',
    '68144821', 'นายอำนาจ พลอยดี', 'SICU', 'Sputum', 'Pseudomonas aeruginosa', 'MDR', true,
    'Pseudomonas aeruginosa (MDR-PSA Alert)',
    'MDR Alert\\nHN: 68144821\\nWard: SICU\\nSpecimen: Sputum\\nOrganism: Pseudomonas aeruginosa\\nResistance: Multidrug Resistant'
),
(
    '-5294922475', 'LABALEARTTUH', NOW() - INTERVAL '4 days',
    '68188231', 'นางสาวจินตนา เกตุแก้ว', 'ANICU', 'CSF', 'Cryptococcus spp.', null, false,
    'CSF Positive: Cryptococcus spp. (India ink positive)',
    'CSF Critical Alert\\nHN: 68188231\\nWard: ANICU\\nSpecimen: CSF\\nResult: Cryptococcus spp.'
),
(
    '-5294922475', 'LABALEARTTUH', NOW() - INTERVAL '5 days',
    '68172901', 'นายบุญมา ทรัพย์คง', 'กุมารเวชกรรม', 'Urine', 'Enterococcus faecium', 'VRE', true,
    'Enterococcus faecium (VRE Alert)',
    'VRE Alert\\nHN: 68172901\\nWard: กุมารเวชกรรม\\nSpecimen: Urine\\nOrganism: Enterococcus faecium\\nResistance: Vancomycin Resistant'
),
(
    '-5294922475', 'LABALEARTTUH', NOW() - INTERVAL '6 days',
    '68160012', 'นางสุวรรณา มีพร้อม', 'อายุรกรรมกิตติวัฒนา 2', 'Urine', 'Escherichia coli', 'ESBL', true,
    'Escherichia coli (ESBL producer)',
    'ESBL Alert\\nHN: 68160012\\nWard: อายุรกรรมกิตติวัฒนา 2\\nSpecimen: Urine\\nOrganism: Escherichia coli\\nResistance: ESBL'
),

-- THIS MONTH (Past 7 - 28 days)
(
    '-5294922475', 'LABALEARTTUH', NOW() - INTERVAL '8 days',
    '68112349', 'นายประสิทธิ์ สุขสม', 'MICU', 'Sputum', 'Acinetobacter baumannii', 'CRAB', true,
    'Acinetobacter baumannii (CRAB Alert)',
    'CRAB Alert\\nHN: 68112349\\nWard: MICU\\nSpecimen: Sputum\\nOrganism: Acinetobacter baumannii\\nResistance: Carbapenem Resistant'
),
(
    '-5294922475', 'LABALEARTTUH', NOW() - INTERVAL '12 days',
    '68099812', 'นางพิมพา ชูศรี', 'SICU', 'Urine', 'Klebsiella pneumoniae', 'CRE', true,
    'Klebsiella pneumoniae (CRE Alert)',
    'CRE Alert\\nHN: 68099812\\nWard: SICU\\nSpecimen: Urine\\nOrganism: Klebsiella pneumoniae\\nResistance: Carbapenem Resistant'
),
(
    '-5294922475', 'LABALEARTTUH', NOW() - INTERVAL '15 days',
    '68087612', 'นายสมคิด ยิ่งยง', 'ศัลยกรรมอุบัติเหตุ 1', 'Pus / Wound', 'Staphylococcus aureus', 'MRSA', true,
    'Staphylococcus aureus (MRSA Alert)',
    'MRSA Alert\\nHN: 68087612\\nWard: ศัลยกรรมอุบัติเหตุ 1\\nSpecimen: Pus / Wound\\nOrganism: Staphylococcus aureus'
),
(
    '-5294922475', 'LABALEARTTUH', NOW() - INTERVAL '20 days',
    '68076543', 'นายณรงค์ เด่นดวง', 'ห้องฉุกเฉิน (ER)', 'Hemoculture', 'Gram negative bacilli (GNB)', null, false,
    'Hemoculture Positive: GNB',
    'Critical Alert\\nHN: 68076543\\nWard: ห้องฉุกเฉิน (ER)\\nSpecimen: Hemoculture'
),
(
    '-5294922475', 'LABALEARTTUH', NOW() - INTERVAL '25 days',
    '68065432', 'นางกานดา พูลเพิ่ม', 'MICU', 'Sputum', 'Acinetobacter baumannii', 'CRAB', true,
    'Acinetobacter baumannii (CRAB Alert)',
    'CRAB Alert\\nHN: 68065432\\nWard: MICU\\nSpecimen: Sputum\\nOrganism: Acinetobacter baumannii'
);
"""

cur.execute(sql)
conn.commit()
print("Seeded LABALEARTTUH alert records successfully!")
cur.close()
conn.close()
