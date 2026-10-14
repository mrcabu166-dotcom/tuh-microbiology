-- ==============================================================================
-- LABALEARTTUH Microbiology & AMR Surveillance Alert Table
-- Thammasat University Hospital (TUH)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS microbiology_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    telegram_message_id BIGINT,
    telegram_chat_id VARCHAR(100),
    chat_title VARCHAR(255) DEFAULT 'LABALEARTTUH',
    alert_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    hn VARCHAR(100) NOT NULL,            -- FULL UNMASKED HN (e.g. 68123456)
    patient_name VARCHAR(255),
    ward VARCHAR(255) NOT NULL,
    specimen VARCHAR(255),
    organism VARCHAR(255) NOT NULL,
    resistance_type VARCHAR(100),        -- CRAB, CRE, MRSA, VRE, ESBL, MDR, etc.
    is_amr BOOLEAN DEFAULT FALSE,
    findings_detail TEXT,
    raw_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_microbiology_alerts_date ON microbiology_alerts(alert_date DESC);
CREATE INDEX IF NOT EXISTS idx_microbiology_alerts_ward ON microbiology_alerts(ward);
CREATE INDEX IF NOT EXISTS idx_microbiology_alerts_organism ON microbiology_alerts(organism);
CREATE INDEX IF NOT EXISTS idx_microbiology_alerts_amr ON microbiology_alerts(is_amr);

ALTER TABLE microbiology_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public access for microbiology_alerts" ON microbiology_alerts;
CREATE POLICY "Public access for microbiology_alerts" ON microbiology_alerts FOR ALL USING (true) WITH CHECK (true);
