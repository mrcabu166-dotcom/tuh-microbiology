export interface ParsedTelegramAlert {
  hn: string;                 // FULL UNMASKED HN
  patient_name?: string;
  ward: string;
  specimen: string;
  organism: string;
  resistance_type?: string;   // CRAB, CRE, MRSA, VRE, ESBL, MDR, etc.
  is_amr: boolean;
  findings_detail: string;
  alert_date: Date;
  raw_message: string;
}

/**
 * Standardize Organism Names to scientific naming
 */
export function normalizeOrganism(name: string): string {
  const clean = name.trim();
  const map: { [key: string]: string } = {
    'A. baumannii': 'Acinetobacter baumannii',
    'A.baumannii': 'Acinetobacter baumannii',
    'Acinetobacter': 'Acinetobacter baumannii',
    'E. coli': 'Escherichia coli',
    'E.coli': 'Escherichia coli',
    'K. pneumoniae': 'Klebsiella pneumoniae',
    'K.pneumoniae': 'Klebsiella pneumoniae',
    'Klebsiella': 'Klebsiella pneumoniae',
    'P. aeruginosa': 'Pseudomonas aeruginosa',
    'P.aeruginosa': 'Pseudomonas aeruginosa',
    'Pseudomonas': 'Pseudomonas aeruginosa',
    'S. aureus': 'Staphylococcus aureus',
    'S.aureus': 'Staphylococcus aureus',
    'Staph aureus': 'Staphylococcus aureus',
    'E. faecium': 'Enterococcus faecium',
    'E. faecalis': 'Enterococcus faecalis',
  };

  for (const [short, full] of Object.entries(map)) {
    if (clean.toLowerCase().includes(short.toLowerCase())) {
      return full;
    }
  }
  return clean;
}

/**
 * Parses raw alert messages from Telegram group LABALEARTTUH
 * NO DATA MASKING: preserves full HN and patient information!
 */
export function parseTelegramAlert(text: string): ParsedTelegramAlert | null {
  if (!text || typeof text !== 'string') return null;

  const raw = text.trim();

  // 1. Extract FULL UNMASKED HN (e.g. HN: 123456, HN 68123456, HN. 123456, เลข HN: 123456)
  let hn = '';
  const hnMatch = 
    raw.match(/(?:HN|H\.N\.|เลข\s*HN|รหัสผู้ป่วย)\s*[:=.\s]?\s*([0-9a-zA-Z]+)/i) ||
    raw.match(/HN\s*[:=]?\s*([0-9a-zA-Z]+)/i);

  if (hnMatch) {
    hn = hnMatch[1].trim(); // Keep raw full HN
  } else {
    // Look for standalone 6 to 8 digit number
    const numMatch = raw.match(/\b\d{6,8}\b/);
    if (numMatch) {
      hn = numMatch[0];
    } else {
      hn = 'UNKNOWN_HN';
    }
  }

  // 2. Extract Patient Name (if provided)
  let patientName = '';
  const nameMatch = 
    raw.match(/(?:Name|Patient|ชื่อ-สกุล|ชื่อผู้ป่วย|ชื่อ)\s*[:=.\s]?\s*([^\n\r,]+)/i);
  if (nameMatch) {
    patientName = nameMatch[1].trim();
  }

  // 3. Extract Ward
  let ward = 'MICU';
  const wardMatch = 
    raw.match(/(?:Ward|หอผู้ป่วย|ตึก|แผนก)\s*[:=.\s]?\s*([^\n\r,]+)/i);
  if (wardMatch) {
    ward = wardMatch[1].trim();
  } else {
    if (/MICU/i.test(raw)) ward = 'MICU';
    else if (/SICU/i.test(raw)) ward = 'SICU';
    else if (/ANICU/i.test(raw)) ward = 'ANICU';
    else if (/ICU\s*CVT|CVT/i.test(raw)) ward = 'ICU CVT';
    else if (/ศัลยกรรมอุบัติเหตุ/i.test(raw)) ward = 'ศัลยกรรมอุบัติเหตุ 1';
    else if (/กิตติวัฒนา/i.test(raw)) ward = 'อายุรกรรมกิตติวัฒนา 2';
    else if (/อายุรกรรม/i.test(raw)) ward = 'อายุรกรรม';
    else if (/ศัลยกรรม/i.test(raw)) ward = 'ศัลยกรรม';
    else if (/เด็ก|กุมาร/i.test(raw)) ward = 'กุมารเวชกรรม';
    else if (/ER|ฉุกเฉิน/i.test(raw)) ward = 'ห้องฉุกเฉิน (ER)';
  }

  // 4. Extract Specimen
  let specimen = 'Hemoculture';
  const specMatch = 
    raw.match(/(?:Specimen|สิ่งส่งตรวจ|ชนิดสิ่งส่งตรวจ|ตัวอย่าง)\s*[:=.\s]?\s*([^\n\r,]+)/i);
  if (specMatch) {
    specimen = specMatch[1].trim();
  } else {
    if (/sputum|เสมหะ/i.test(raw)) specimen = 'Sputum';
    else if (/urine|ปัสสาวะ/i.test(raw)) specimen = 'Urine';
    else if (/csf|น้ำไขสันหลัง/i.test(raw)) specimen = 'CSF';
    else if (/hemo|เลือด|blood/i.test(raw)) specimen = 'Hemoculture';
    else if (/pus|หนอง|wound|แผล/i.test(raw)) specimen = 'Pus / Wound';
    else if (/swab/i.test(raw)) specimen = 'Swab';
  }

  // 5. Extract Organism & AMR
  let organism = '';
  const orgMatch = 
    raw.match(/(?:Organism|เชื้อ|เชื้อที่พบ|ผลเพาะเชื้อ|Culture|Result|ผลตรวจ|ผลวิกฤต)\s*[:=.\s]?\s*([^\n\r,]+)/i);
  if (orgMatch) {
    organism = normalizeOrganism(orgMatch[1]);
  }

  // Extract Resistance
  let resistanceType = '';
  const resMatch = raw.match(/Resistance\s*[:=]?\s*([^\n\r,]+)/i) || raw.match(/การดื้อยา\s*[:=]?\s*([^\n\r,]+)/i);
  if (resMatch) {
    resistanceType = resMatch[1].trim();
  }

  // Detect AMR classification
  let isAmr = false;
  if (/CRAB/i.test(raw) || (/Carbapenem/i.test(raw) && /Acineto/i.test(raw))) {
    isAmr = true;
    resistanceType = resistanceType || 'CRAB';
    if (!organism) organism = 'Acinetobacter baumannii';
  } else if (/CRE/i.test(raw) || (/Carbapenem/i.test(raw) && /Entero|Kleb/i.test(raw))) {
    isAmr = true;
    resistanceType = resistanceType || 'CRE';
    if (!organism) organism = 'Klebsiella pneumoniae';
  } else if (/MRSA/i.test(raw) || (/Methicillin/i.test(raw) && /Staph/i.test(raw))) {
    isAmr = true;
    resistanceType = resistanceType || 'MRSA';
    if (!organism) organism = 'Staphylococcus aureus';
  } else if (/VRE/i.test(raw) || (/Vancomycin/i.test(raw) && /Entero/i.test(raw))) {
    isAmr = true;
    resistanceType = resistanceType || 'VRE';
    if (!organism) organism = 'Enterococcus faecium';
  } else if (/ESBL/i.test(raw)) {
    isAmr = true;
    resistanceType = resistanceType || 'ESBL';
    if (!organism) organism = 'Escherichia coli';
  } else if (/MDR|XDR|PDR/i.test(raw)) {
    isAmr = true;
    resistanceType = resistanceType || 'MDR';
    if (!organism) organism = 'Pseudomonas aeruginosa';
  }

  // Fallback organism if still empty
  if (!organism) {
    if (/GNB|Gram negative bacilli/i.test(raw)) organism = 'Gram negative bacilli (GNB)';
    else if (/GPC|Gram positive cocci/i.test(raw)) organism = 'Gram positive cocci (GPC)';
    else if (/Yeast|Candida/i.test(raw)) organism = 'Yeast / Candida spp.';
    else organism = 'เชื้อก่อโรคทางจุลชีววิทยา';
  }

  // 6. Extract Date
  let alertDate = new Date();
  const dateMatch = raw.match(/Date\s*[:=]?\s*([0-9]{4}-[0-9]{2}-[0-9]{2})/i) || raw.match(/วันที่\s*[:=]?\s*([^\n\r,]+)/i);
  if (dateMatch) {
    const parsedDate = new Date(dateMatch[1]);
    if (!isNaN(parsedDate.getTime())) {
      alertDate = parsedDate;
    }
  }

  // Findings detail summary
  let findingsDetail = organism;
  if (resistanceType) {
    findingsDetail += ` (${resistanceType})`;
  }

  return {
    hn,
    patient_name: patientName || undefined,
    ward,
    specimen,
    organism,
    resistance_type: resistanceType || undefined,
    is_amr: isAmr,
    findings_detail: findingsDetail,
    alert_date: alertDate,
    raw_message: raw,
  };
}
