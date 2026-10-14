export type UrgencyLevel = 'LEVEL_1_CRITICAL' | 'LEVEL_2_URGENT';

export type AlertStatus = 'PENDING' | 'SENT' | 'ACKNOWLEDGED' | 'ESCALATED' | 'MANUAL_CALLED';

export type AcknowledgeChannel = 'TELEGRAM' | 'WEB_DASHBOARD' | 'PHONE_CALL';

export type AMRType = 
  | 'CRAB' 
  | 'CRE' 
  | 'MRSA' 
  | 'VRE' 
  | 'MDR_PSEUDOMONAS' 
  | 'ESBL' 
  | 'OTHER_AMR';

export interface Ward {
  id: number;
  ward_name: string;
  telegram_chat_id?: string | null;
  department?: string | null;
  contact_phone?: string | null;
  is_active: boolean;
  created_at: string;
}

export interface CriticalResult {
  id: string;
  specimen_no: string;
  hn: string;                     // Masked e.g. 68****12
  patient_initials?: string | null;
  ward_id: number;
  ward_name?: string;
  contact_phone?: string;
  
  specimen_type: string;
  findings_detail: string;
  urgency_level: UrgencyLevel;
  
  // AMR Fields
  is_amr: boolean;
  amr_type?: AMRType | null;
  antibiogram_summary?: string | null;
  ic_action_recommended?: string | null;
  
  reported_by: string;
  reported_at: string;
  status: AlertStatus;
  
  acknowledged_by_name?: string | null;
  acknowledged_at?: string | null;
  acknowledged_channel?: AcknowledgeChannel | null;
  telegram_message_id?: number | null;
  
  manual_call_by?: string | null;
  manual_call_at?: string | null;
  manual_call_note?: string | null;
  
  created_at: string;
  updated_at: string;
}

export interface AlertLog {
  id: string;
  result_id: string;
  event_type: 'INITIAL_SEND' | 'REMINDER_10MIN' | 'ESCALATION_15MIN' | 'ACKNOWLEDGED' | 'MANUAL_CALL';
  sent_at: string;
  raw_response?: any;
}

export interface KPISummary {
  total_today: number;
  total_month: number;
  pending_count: number;
  escalated_count: number;
  acknowledged_count: number;
  median_ack_minutes: number;
  percent_within_15min: number;
  amr_total_count: number;
  amr_breakdown: { [key: string]: number };
}
