'use client';

import React, { useState } from 'react';
import { Ward, AMRType } from '@/types';
import {
  Send,
  Sparkles,
  AlertOctagon,
  ShieldCheck,
  Dna,
  CheckCircle2,
  AlertCircle,
  Building2,
  FileSpreadsheet,
} from 'lucide-react';

interface AlertEntryFormProps {
  wards: Ward[];
  onSuccess: () => void;
}

export default function AlertEntryForm({ wards, onSuccess }: AlertEntryFormProps) {
  const [specimenNo, setSpecimenNo] = useState('');
  const [hn, setHn] = useState('');
  const [patientInitials, setPatientInitials] = useState('');
  const [wardId, setWardId] = useState<number>(wards[0]?.id || 1);
  const [specimenType, setSpecimenType] = useState('Hemoculture (เลือด)');
  const [findingsDetail, setFindingsDetail] = useState('');
  const [urgencyLevel, setUrgencyLevel] = useState<'LEVEL_1_CRITICAL' | 'LEVEL_2_URGENT'>('LEVEL_1_CRITICAL');
  
  // AMR State
  const [isAmr, setIsAmr] = useState(false);
  const [amrType, setAmrType] = useState<AMRType | ''>('');
  const [antibiogramSummary, setAntibiogramSummary] = useState('');
  const [icActionRecommended, setIcActionRecommended] = useState('');
  
  const [reportedBy, setReportedBy] = useState('ทน.ม. มานพ นันตาบุตร');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Keep full unmasked HN (no asterisks)
  const handleHnChange = (val: string) => {
    setHn(val.trim());
  };

  // Predefined Quick Template Handlers
  const applyTemplate = (
    type: string,
    finding: string,
    amr: boolean = false,
    aType: AMRType | '' = '',
    ast: string = '',
    ic: string = ''
  ) => {
    setSpecimenType(type);
    setFindingsDetail(finding);
    setIsAmr(amr);
    setAmrType(aType);
    setAntibiogramSummary(ast);
    setIcActionRecommended(ic);
    setFeedback(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!specimenNo.trim() || !hn.trim() || !findingsDetail.trim()) {
      setFeedback({ type: 'error', message: 'กรุณากรอกข้อมูล Lab No, HN และผลวิเคราะห์' });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          specimen_no: specimenNo.trim(),
          hn: hn.trim(),
          patient_initials: patientInitials.trim() || null,
          ward_id: Number(wardId),
          specimen_type: specimenType.trim(),
          findings_detail: findingsDetail.trim(),
          urgency_level: urgencyLevel,
          is_amr: isAmr,
          amr_type: isAmr ? amrType : null,
          antibiogram_summary: isAmr ? antibiogramSummary.trim() : null,
          ic_action_recommended: isAmr ? icActionRecommended.trim() : null,
          reported_by: reportedBy.trim(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        setFeedback({
          type: 'success',
          message: `✅ ส่งแจ้งเตือนสำเร็จ! ระบบได้ส่งข้อความเข้ากลุ่ม Telegram เรียบร้อยแล้ว`,
        });
        // Reset form
        setSpecimenNo('');
        setHn('');
        setPatientInitials('');
        setFindingsDetail('');
        setIsAmr(false);
        setAmrType('');
        setAntibiogramSummary('');
        setIcActionRecommended('');
        onSuccess();
      } else {
        setFeedback({ type: 'error', message: data.error || 'เกิดข้อผิดพลาดในการบันทึก' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'ไม่สามารถเชื่อมต่อระบบได้' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Quick Select Template Cards */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
        <div className="flex items-center space-x-2 text-slate-800">
          <Sparkles className="w-5 h-5 text-amber-500" />
          <h3 className="font-bold text-base">ปุ่มลัดเลือกผลวิกฤตและเชื้อดื้อยามาตรฐาน (Quick Criteria)</h3>
        </div>

        {/* 1. Hemoculture Category */}
        <div>
          <span className="text-xs font-bold text-rose-700 uppercase tracking-wider block mb-2">
            🩸 ผลเพาะเชื้อจากเลือดเป็นบวก (Positive Hemoculture)
          </span>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() =>
                applyTemplate(
                  'Hemoculture (เลือด)',
                  'พบเชื้อแบคทีเรีย Gram negative bacilli (GNB)',
                  false
                )
              }
              className="p-3 bg-rose-50/60 hover:bg-rose-100 text-rose-900 border border-rose-200 rounded-xl text-left text-xs font-semibold transition-colors"
            >
              <div className="font-bold">Gram Negative Bacilli (GNB)</div>
              <div className="text-[11px] text-rose-600">สงสัยเชื้อลำไส้ / Pseudomonas / Acineto</div>
            </button>

            <button
              type="button"
              onClick={() =>
                applyTemplate(
                  'Hemoculture (เลือด)',
                  'พบเชื้อ Gram positive cocci in clusters (Staphylococcus spp.)',
                  false
                )
              }
              className="p-3 bg-rose-50/60 hover:bg-rose-100 text-rose-900 border border-rose-200 rounded-xl text-left text-xs font-semibold transition-colors"
            >
              <div className="font-bold">Gram Positive Cocci in Clusters</div>
              <div className="text-[11px] text-rose-600">Staphylococcus aureus / CoNS</div>
            </button>

            <button
              type="button"
              onClick={() =>
                applyTemplate('Hemoculture (เลือด)', 'พบเชื้อยีสต์ (Yeast / Candida spp.)', false)
              }
              className="p-3 bg-rose-50/60 hover:bg-rose-100 text-rose-900 border border-rose-200 rounded-xl text-left text-xs font-semibold transition-colors"
            >
              <div className="font-bold">Yeast / Fungus Positive</div>
              <div className="text-[11px] text-rose-600">Candidemia / Fungemia</div>
            </button>
          </div>
        </div>

        {/* 2. AMR & MDROs Category */}
        <div className="pt-3 border-t border-slate-100">
          <span className="text-xs font-bold text-purple-700 uppercase tracking-wider block mb-2 flex items-center space-x-1">
            <Dna className="w-4 h-4 text-purple-600" />
            <span>🧬 เชื้อดื้อยาสำคัญทางคลินิก (AMR / MDRO Surveillance)</span>
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
            <button
              type="button"
              onClick={() =>
                applyTemplate(
                  'Sputum (เสมหะ)',
                  'Acinetobacter baumannii (Carbapenem Resistant)',
                  true,
                  'CRAB',
                  'Meropenem (R), Imipenem (R), Colistin (S)',
                  'ติดป้าย Contact Precautions ทันที สวมถุงมือ/กาวน์ แยกห้องหรือ Cohort'
                )
              }
              className="p-2.5 bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 rounded-xl text-center text-xs font-bold transition-colors"
            >
              <div>🦠 CRAB</div>
              <div className="text-[10px] text-purple-600 font-normal">A. baumannii</div>
            </button>

            <button
              type="button"
              onClick={() =>
                applyTemplate(
                  'Urine (ปัสสาวะ)',
                  'Klebsiella pneumoniae (Carbapenem Resistant - CRE)',
                  true,
                  'CRE',
                  'Ertapenem (R), Meropenem (R), Amikacin (S)',
                  'Contact Precautions ขั้นสูงสุด ระวังการปนเปื้อนสายสวนปัสสาวะ'
                )
              }
              className="p-2.5 bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 rounded-xl text-center text-xs font-bold transition-colors"
            >
              <div>🦠 CRE</div>
              <div className="text-[10px] text-purple-600 font-normal">K. pneumoniae</div>
            </button>

            <button
              type="button"
              onClick={() =>
                applyTemplate(
                  'Pus / Wound',
                  'Staphylococcus aureus (Methicillin Resistant - MRSA)',
                  true,
                  'MRSA',
                  'Oxacillin (R), Cefoxitin (R), Vancomycin (S)',
                  'Contact Precautions ระวังการทำแผลและสุขอนามัยมือ'
                )
              }
              className="p-2.5 bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 rounded-xl text-center text-xs font-bold transition-colors"
            >
              <div>🦠 MRSA</div>
              <div className="text-[10px] text-purple-600 font-normal">S. aureus</div>
            </button>

            <button
              type="button"
              onClick={() =>
                applyTemplate(
                  'Urine / Blood',
                  'Enterococcus faecium (Vancomycin Resistant - VRE)',
                  true,
                  'VRE',
                  'Vancomycin (R), Linezolid (S)',
                  'Contact Precautions เข้มงวด ทำลายเชื้อสิ่งแวดล้อมสม่ำเสมอ'
                )
              }
              className="p-2.5 bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 rounded-xl text-center text-xs font-bold transition-colors"
            >
              <div>🦠 VRE</div>
              <div className="text-[10px] text-purple-600 font-normal">Enterococcus</div>
            </button>

            <button
              type="button"
              onClick={() =>
                applyTemplate(
                  'Sputum (เสมหะ)',
                  'Pseudomonas aeruginosa (Multi-Drug Resistant - MDR)',
                  true,
                  'MDR_PSEUDOMONAS',
                  'Ceftazidime (R), Ciprofloxacin (R), Meropenem (R)',
                  'Contact Precautions เฝ้าระวังเครื่องช่วยหายใจ'
                )
              }
              className="p-2.5 bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 rounded-xl text-center text-xs font-bold transition-colors"
            >
              <div>🦠 MDR-PSA</div>
              <div className="text-[10px] text-purple-600 font-normal">P. aeruginosa</div>
            </button>

            <button
              type="button"
              onClick={() =>
                applyTemplate(
                  'Urine (ปัสสาวะ)',
                  'Escherichia coli (ESBL producer)',
                  true,
                  'ESBL',
                  'Ceftriaxone (R), Cefotaxime (R), Meropenem (S)',
                  'Contact Precautions ล้างมือก่อนและหลังสัมผัสผู้ป่วย'
                )
              }
              className="p-2.5 bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 rounded-xl text-center text-xs font-bold transition-colors"
            >
              <div>🦠 ESBL</div>
              <div className="text-[10px] text-purple-600 font-normal">E. coli / Kleb</div>
            </button>
          </div>
        </div>

        {/* 3. CSF / Sterile Body Fluid Category */}
        <div className="pt-3 border-t border-slate-100">
          <span className="text-xs font-bold text-sky-700 uppercase tracking-wider block mb-2">
            🧠 น้ำไขสันหลังและสิ่งส่งตรวจปราศจากเชื้อ (CSF / Sterile Body Fluids)
          </span>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() =>
                applyTemplate(
                  'CSF (น้ำไขสันหลัง)',
                  'พบ Gram negative diplococci (Intracellular) - สงสัย N. meningitidis',
                  false
                )
              }
              className="p-2.5 bg-sky-50 hover:bg-sky-100 text-sky-900 border border-sky-200 rounded-xl text-left text-xs font-semibold transition-colors"
            >
              <div className="font-bold">CSF Gram Stain: Gram Negative Diplococci</div>
              <div className="text-[11px] text-sky-600">สงสัยเยื่อหุ้มสมองอักเสบ Neisseria meningitidis</div>
            </button>

            <button
              type="button"
              onClick={() =>
                applyTemplate(
                  'CSF (น้ำไขสันหลัง)',
                  'พบ Cryptococcus spp. (India ink preparation positive)',
                  false
                )
              }
              className="p-2.5 bg-sky-50 hover:bg-sky-100 text-sky-900 border border-sky-200 rounded-xl text-left text-xs font-semibold transition-colors"
            >
              <div className="font-bold">CSF: Cryptococcus spp. (India Ink Positive)</div>
              <div className="text-[11px] text-sky-600">Cryptococcal meningitis</div>
            </button>
          </div>
        </div>
      </div>

      {/* Main Entry Form */}
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <AlertOctagon className="w-6 h-6 text-red-600" />
            <h2 className="font-bold text-lg text-slate-900">แบบบันทึกรายงานผลวิกฤตทางจุลชีววิทยา & เชื้อดื้อยา</h2>
          </div>
          <span className="text-xs text-slate-400">โรงพยาบาลธรรมศาสตร์เฉลิมพระเกียรติ</span>
        </div>

        {feedback && (
          <div
            className={`p-4 rounded-xl flex items-center space-x-3 text-sm font-medium ${
              feedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Lab Specimen Number */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              เลขที่สิ่งส่งตรวจ (Specimen Lab No.) *
            </label>
            <input
              type="text"
              value={specimenNo}
              onChange={(e) => setSpecimenNo(e.target.value)}
              placeholder="เช่น HE-690905-001 หรือ SP-690905-08"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono text-slate-900 focus:ring-2 focus:ring-red-500 focus:outline-none"
              required
            />
          </div>

          {/* Masked HN */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              HN ผู้ป่วย (ปิดบังอัตโนมัติ PDPA) *
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={hn}
                onChange={(e) => handleHnChange(e.target.value)}
                placeholder="กรอก HN เช่น 68123456 -> 68****56"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono font-bold text-slate-900 focus:ring-2 focus:ring-red-500 focus:outline-none"
                required
              />
              <input
                type="text"
                value={patientInitials}
                onChange={(e) => setPatientInitials(e.target.value)}
                placeholder="ชื่อย่อ (ส.บ.)"
                title="ชื่อย่อผู้ป่วย"
                className="w-32 px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-red-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Ward Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              หอผู้ป่วยเป้าหมาย (Target Ward) *
            </label>
            <div className="relative">
              <select
                value={wardId}
                onChange={(e) => setWardId(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-red-500 focus:outline-none cursor-pointer"
                required
              >
                {wards.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.ward_name} (เบอร์ต่อ: {w.contact_phone || '9460'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Specimen Type */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              ชนิดสิ่งส่งตรวจ (Specimen Type) *
            </label>
            <input
              type="text"
              value={specimenType}
              onChange={(e) => setSpecimenType(e.target.value)}
              placeholder="เช่น Hemoculture, Sputum, CSF, Urine, Pus"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-red-500 focus:outline-none"
              required
            />
          </div>
        </div>

        {/* Findings Detail */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            ผลการตรวจวิเคราะห์วิกฤต (Critical Findings Detail) *
          </label>
          <textarea
            value={findingsDetail}
            onChange={(e) => setFindingsDetail(e.target.value)}
            rows={2}
            placeholder="เช่น พบเชื้อแบคทีเรีย Gram negative bacilli (GNB), Acinetobacter baumannii, etc."
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-red-600 focus:ring-2 focus:ring-red-500 focus:outline-none"
            required
          />
        </div>

        {/* AMR Section (Toggleable) */}
        <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <label className="flex items-center space-x-2 text-sm font-bold text-purple-950 cursor-pointer">
              <input
                type="checkbox"
                checked={isAmr}
                onChange={(e) => setIsAmr(e.target.checked)}
                className="w-4 h-4 text-purple-600 rounded border-purple-300 focus:ring-purple-500 cursor-pointer"
              />
              <span>ระบุเป็นเคสเฝ้าระวังเชื้อดื้อยา (AMR / MDRO Case)</span>
            </label>
            {isAmr && (
              <span className="text-[11px] bg-purple-200 text-purple-800 font-bold px-2 py-0.5 rounded-full">
                Active AMR
              </span>
            )}
          </div>

          {isAmr && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
              <div>
                <label className="block text-xs font-semibold text-purple-900 mb-1">
                  ประเภทเชื้อดื้อยา (AMR Type):
                </label>
                <select
                  value={amrType}
                  onChange={(e) => setAmrType(e.target.value as AMRType)}
                  className="w-full px-3 py-2 bg-white border border-purple-300 rounded-lg text-xs font-bold text-purple-900 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                >
                  <option value="">-- เลือกประเภทเชื้อดื้อยา --</option>
                  <option value="CRAB">CRAB (A. baumannii ดื้อ Carbapenem)</option>
                  <option value="CRE">CRE (Enterobacterales ดื้อ Carbapenem)</option>
                  <option value="MRSA">MRSA (S. aureus ดื้อ Methicillin)</option>
                  <option value="VRE">VRE (Enterococcus ดื้อ Vancomycin)</option>
                  <option value="MDR_PSEUDOMONAS">MDR-Pseudomonas aeruginosa</option>
                  <option value="ESBL">ESBL Producer</option>
                  <option value="OTHER_AMR">เชื้อดื้อยาสำคัญอื่น ๆ</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-purple-900 mb-1">
                  ผลความไวต่อยา (Antibiogram / AST):
                </label>
                <input
                  type="text"
                  value={antibiogramSummary}
                  onChange={(e) => setAntibiogramSummary(e.target.value)}
                  placeholder="เช่น Meropenem (R), Colistin (S)"
                  className="w-full px-3 py-2 bg-white border border-purple-300 rounded-lg text-xs text-purple-950 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-purple-900 mb-1">
                  มาตรการควบคุมการติดเชื้อ (IC Precautions):
                </label>
                <input
                  type="text"
                  value={icActionRecommended}
                  onChange={(e) => setIcActionRecommended(e.target.value)}
                  placeholder="เช่น ติดป้าย Contact Precautions ทันที"
                  className="w-full px-3 py-2 bg-white border border-purple-300 rounded-lg text-xs text-purple-950 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Urgency Level & Reporter */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              ระดับความวิกฤต (Urgency Target Level)
            </label>
            <div className="flex space-x-3">
              <label className="flex items-center space-x-2 text-xs font-semibold text-slate-800 cursor-pointer">
                <input
                  type="radio"
                  name="urgency"
                  value="LEVEL_1_CRITICAL"
                  checked={urgencyLevel === 'LEVEL_1_CRITICAL'}
                  onChange={() => setUrgencyLevel('LEVEL_1_CRITICAL')}
                  className="w-4 h-4 text-red-600 focus:ring-red-500"
                />
                <span className="text-red-700 font-bold">Level 1: Critical (เป้าหมาย &le; 15 นาที)</span>
              </label>

              <label className="flex items-center space-x-2 text-xs font-semibold text-slate-800 cursor-pointer">
                <input
                  type="radio"
                  name="urgency"
                  value="LEVEL_2_URGENT"
                  checked={urgencyLevel === 'LEVEL_2_URGENT'}
                  onChange={() => setUrgencyLevel('LEVEL_2_URGENT')}
                  className="w-4 h-4 text-amber-600 focus:ring-amber-500"
                />
                <span className="text-amber-700 font-bold">Level 2: Urgent (&le; 30 นาที)</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              ผู้รายงานผล (นักเทคนิคการแพทย์ MT) *
            </label>
            <input
              type="text"
              value={reportedBy}
              onChange={(e) => setReportedBy(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:ring-2 focus:ring-red-500 focus:outline-none"
              required
            />
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-3.5 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-lg transition-all flex items-center space-x-2 hover:shadow-xl"
          >
            <Send className="w-4 h-4" />
            <span>{isSubmitting ? 'กำลังส่งแจ้งเตือน...' : '⚡ ยืนยันและส่งแจ้งเตือนทันที (Send Alert)'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
