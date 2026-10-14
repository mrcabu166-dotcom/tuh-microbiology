-- ==============================================================================
-- Smart Critical Microbiology Alert & AMR Surveillance System
-- Thammasat University Hospital (TUH)
-- Database Schema for Supabase PostgreSQL
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Rename old wards table if it has old schema
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'wards' AND column_name = 'name_th'
    ) THEN
        ALTER TABLE wards RENAME TO legacy_environmental_wards;
    END IF;
END $$;

-- 1. WARDS TABLE
CREATE TABLE IF NOT EXISTS wards (
    id SERIAL PRIMARY KEY,
    ward_name VARCHAR(255) NOT NULL UNIQUE,
    telegram_chat_id VARCHAR(100), -- Specific ward chat ID or NULL to use default hospital bot chat ID
    department VARCHAR(255) DEFAULT 'งานการพยาบาล',
    contact_phone VARCHAR(50),      -- Direct phone extension (e.g. 9461)
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. CRITICAL RESULTS TABLE (With AMR Surveillance)
CREATE TABLE IF NOT EXISTS critical_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    specimen_no VARCHAR(100) NOT NULL,
    hn VARCHAR(50) NOT NULL,               -- Masked for PDPA e.g., 68****12
    patient_initials VARCHAR(100),         -- Patient initials e.g. ส.บ.
    ward_id INTEGER REFERENCES wards(id) ON DELETE SET NULL,
    
    specimen_type VARCHAR(100) NOT NULL,   -- Hemoculture, CSF, Sputum, Sterile Fluid, Pus, etc.
    findings_detail TEXT NOT NULL,         -- Detailed organism or microscopic finding
    urgency_level VARCHAR(50) DEFAULT 'LEVEL_1_CRITICAL', -- LEVEL_1_CRITICAL (15m), LEVEL_2_URGENT (30m)
    
    -- AMR (Antimicrobial Resistance) Fields
    is_amr BOOLEAN DEFAULT FALSE,
    amr_type VARCHAR(50),                  -- CRAB, CRE, MRSA, VRE, MDR_PSEUDOMONAS, ESBL, OTHER_AMR
    antibiogram_summary TEXT,              -- e.g. "Meropenem (R), Colistin (S)"
    ic_action_recommended TEXT,            -- e.g. "Contact Precautions / Cohort Ward"
    
    -- Reporting & Audit Trail
    reported_by VARCHAR(100) NOT NULL,     -- MT Staff Name
    reported_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(50) DEFAULT 'SENT',     -- PENDING, SENT, ACKNOWLEDGED, ESCALATED, MANUAL_CALLED
    
    -- Acknowledgement Tracking
    acknowledged_by_name VARCHAR(150),
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    acknowledged_channel VARCHAR(50),     -- TELEGRAM, WEB_DASHBOARD, PHONE_CALL
    telegram_message_id BIGINT,
    
    -- Safety Net Protocol (Manual Phone Call)
    manual_call_by VARCHAR(100),
    manual_call_at TIMESTAMP WITH TIME ZONE,
    manual_call_note TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. ALERT LOGS TABLE (For CQI & HA Audit Trails)
CREATE TABLE IF NOT EXISTS alert_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    result_id UUID REFERENCES critical_results(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,       -- INITIAL_SEND, REMINDER_10MIN, ESCALATION_15MIN, ACKNOWLEDGED, MANUAL_CALL
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    raw_response JSONB
);

-- Create Indexes for Real-time Dashboard Performance
CREATE INDEX IF NOT EXISTS idx_critical_results_status ON critical_results(status);
CREATE INDEX IF NOT EXISTS idx_critical_results_reported_at ON critical_results(reported_at DESC);
CREATE INDEX IF NOT EXISTS idx_critical_results_ward ON critical_results(ward_id);
CREATE INDEX IF NOT EXISTS idx_critical_results_amr ON critical_results(is_amr);
CREATE INDEX IF NOT EXISTS idx_alert_logs_result_id ON alert_logs(result_id);

-- Enable Row Level Security (RLS)
ALTER TABLE wards ENABLE ROW LEVEL SECURITY;
ALTER TABLE critical_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_logs ENABLE ROW LEVEL SECURITY;

-- Allow read/write policies for application access
DROP POLICY IF EXISTS "Public access for wards" ON wards;
CREATE POLICY "Public access for wards" ON wards FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access for critical_results" ON critical_results;
CREATE POLICY "Public access for critical_results" ON critical_results FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access for alert_logs" ON alert_logs;
CREATE POLICY "Public access for alert_logs" ON alert_logs FOR ALL USING (true) WITH CHECK (true);

-- 4. SEED DATA FOR TUH WARDS
INSERT INTO wards (ward_name, department, contact_phone, telegram_chat_id)
VALUES 
    ('MICU (หอผู้ป่วยหนักอายุรกรรม)', 'ฝ่ายการพยาบาล', '9461', NULL),
    ('SICU (หอผู้ป่วยหนักศัลยกรรม)', 'ฝ่ายการพยาบาล', '9462', NULL),
    ('ANICU (หอผู้ป่วยหนักศัลยกรรมระบบประสาท)', 'ฝ่ายการพยาบาล', '9463', NULL),
    ('ICU CVT (หอผู้ป่วยหนักหัวใจและหลอดเลือด)', 'ฝ่ายการพยาบาล', '9464', NULL),
    ('ศัลยกรรมอุบัติเหตุ 1 (ชั้น 4)', 'ฝ่ายการพยาบาล', '9471', NULL),
    ('อายุรกรรมกิตติวัฒนา 2 (ชั้น 5)', 'ฝ่ายการพยาบาล', '9472', NULL),
    ('หอผู้ป่วยกักกันโรค (Isolation Ward)', 'งานควบคุมการติดเชื้อ', '9480', NULL),
    ('กุมารเวชกรรม (หอผู้ป่วยเด็ก 1)', 'ฝ่ายการพยาบาล', '9485', NULL),
    ('สูติ-นรีเวชกรรม 2 (ชั้น 6)', 'ฝ่ายการพยาบาล', '9490', NULL),
    ('ห้องฉุกเฉิน (ER)', 'ฝ่ายการพยาบาล', '9119', NULL)
ON CONFLICT (ward_name) DO UPDATE 
SET contact_phone = EXCLUDED.contact_phone, department = EXCLUDED.department;
