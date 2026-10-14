'use client';

import React, { useState } from 'react';
import {
  Send,
  X,
  Dna,
  AlertTriangle,
  Building2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

interface SendAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const COMMON_WARDS = [
  'MICU',
  'SICU',
  'ANICU',
  'ICU CVT',
  'อายุรกรรมกิตติวัฒนา 2',
  'อายุรกรรมชาย',
  'อายุรกรรมหญิง',
  'ศัลยกรรมอุบัติเหตุ 1',
  'ศัลยกรรมทั่วไป',
  'กุมารเวชกรรม',
  'ห้องฉุกเฉิน (ER)',
];

const SPECIMENS = [
  'Hemoculture (เลือด)',
  'Sputum (เสมหะ)',
  'Urine (ปัสสาวะ)',
  'CSF (น้ำไขสันหลัง)',
  'Pus / Wound (หนอง/แผล)',
  'Pleural fluid (น้ำในช่องเยื่อหุ้มปอด)',
  'Ascitic fluid (น้ำในช่องท้อง)',
  'Swab',
];

export default function SendAlertModal({
  isOpen,
  onClose,
  onSuccess,
}: SendAlertModalProps) {
  const [hn, setHn] = useState('');
  const [patientName, setPatientName] = useState('');
  const [ward, setWard] = useState('MICU');
  const [specimen, setSpecimen] = useState('Hemoculture (เลือด)');
  const [organism, setOrganism] = useState('');
  const [resistanceType, setResistanceType] = useState('');
  const [isAmr, setIsAmr] = useState(false);
  const [findingsDetail, setFindingsDetail] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  if (!isOpen) return null;

  // Predefined Quick Templates
  const applyTemplate = (
    tplSpecimen: string,
    tplOrganism: string,
    tplResistance: string,
    tplIsAmr: boolean,
    tplFinding: string
  ) => {
    setSpecimen(tplSpecimen);
    setOrganism(tplOrganism);
    setResistanceType(tplResistance);
    setIsAmr(tplIsAmr);
    setFindingsDetail(tplFinding);
    setFeedback(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hn.trim() || (!organism.trim() && !findingsDetail.trim())) {
      setFeedback({ type: 'error', message: 'กรุณากรอกเลข HN และเชื้อที่ตรวจพบ/ผลวิเคราะห์' });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hn: hn.trim(),
          patient_name: patientName.trim() || null,
          ward,
          specimen,
          organism: organism.trim(),
          resistance_type: isAmr ? (resistanceType || 'AMR') : (resistanceType || null),
          is_amr: isAmr,
          findings_detail: findingsDetail.trim() || organism.trim(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        setFeedback({
          type: 'success',
          message: '🚀 ส่งแจ้งเตือนเข้ากลุ่ม Telegram LABALEARTTUH และบันทึกลง Dashboard เรียบร้อยแล้ว!',
        });

        // Reset form
        setHn('');
        setPatientName('');
        setOrganism('');
        setResistanceType('');
        setIsAmr(false);
        setFindingsDetail('');

        onSuccess();
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        setFeedback({ type: 'error', message: data.error || 'เกิดข้อผิดพลาดในการส่งข้อมูล' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 via-rose-600 to-indigo-700 px-6 py-4 flex items-center justify-between text-white shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <Send className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base md:text-lg">
                ส่งแจ้งเตือนผลวิกฤต & บันทึกลง Dashboard
              </h3>
              <p className="text-xs text-rose-100">
                บอทจะส่งเข้ากลุ่ม Telegram LABALEARTTUH และบันทึกเข้าฐานข้อมูลทันที (ไม่ปิดบัง HN)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
          {feedback && (
            <div
              className={`p-3.5 rounded-xl flex items-center space-x-2 font-semibold ${
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

          {/* Quick Template Chips */}
          <div className="space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div className="flex items-center space-x-1.5 font-bold text-slate-700">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>เทมเพลตด่วน (Quick Templates):</span>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              <button
                type="button"
                onClick={() =>
                  applyTemplate(
                    'Sputum (เสมหะ)',
                    'Acinetobacter baumannii',
                    'CRAB',
                    true,
                    'Acinetobacter baumannii (CRAB Alert: Carbapenem Resistant)'
                  )
                }
                className="px-2.5 py-1 bg-red-100 text-red-800 hover:bg-red-200 rounded-lg font-bold transition-colors"
              >
                🚨 CRAB (Sputum)
              </button>

              <button
                type="button"
                onClick={() =>
                  applyTemplate(
                    'Urine (ปัสสาวะ)',
                    'Klebsiella pneumoniae',
                    'CRE',
                    true,
                    'Klebsiella pneumoniae (CRE Alert: Carbapenem Resistant)'
                  )
                }
                className="px-2.5 py-1 bg-orange-100 text-orange-800 hover:bg-orange-200 rounded-lg font-bold transition-colors"
              >
                ⚠️ CRE (Urine)
              </button>

              <button
                type="button"
                onClick={() =>
                  applyTemplate(
                    'Pus / Wound (หนอง/แผล)',
                    'Staphylococcus aureus',
                    'MRSA',
                    true,
                    'Staphylococcus aureus (MRSA Alert: Methicillin Resistant)'
                  )
                }
                className="px-2.5 py-1 bg-purple-100 text-purple-800 hover:bg-purple-200 rounded-lg font-bold transition-colors"
              >
                🧬 MRSA (Wound)
              </button>

              <button
                type="button"
                onClick={() =>
                  applyTemplate(
                    'Urine (ปัสสาวะ)',
                    'Enterococcus faecium',
                    'VRE',
                    true,
                    'Enterococcus faecium (VRE Alert: Vancomycin Resistant)'
                  )
                }
                className="px-2.5 py-1 bg-violet-100 text-violet-800 hover:bg-violet-200 rounded-lg font-bold transition-colors"
              >
                🧬 VRE (Urine)
              </button>

              <button
                type="button"
                onClick={() =>
                  applyTemplate(
                    'Urine (ปัสสาวะ)',
                    'Escherichia coli',
                    'ESBL',
                    true,
                    'Escherichia coli (ESBL producer)'
                  )
                }
                className="px-2.5 py-1 bg-sky-100 text-sky-800 hover:bg-sky-200 rounded-lg font-bold transition-colors"
              >
                💊 ESBL (E. coli)
              </button>

              <button
                type="button"
                onClick={() =>
                  applyTemplate(
                    'Hemoculture (เลือด)',
                    'Gram negative bacilli (GNB)',
                    '',
                    false,
                    'Hemoculture Positive: Gram negative bacilli (GNB)'
                  )
                }
                className="px-2.5 py-1 bg-blue-100 text-blue-800 hover:bg-blue-200 rounded-lg font-bold transition-colors"
              >
                🩸 Hemoculture GNB
              </button>

              <button
                type="button"
                onClick={() =>
                  applyTemplate(
                    'CSF (น้ำไขสันหลัง)',
                    'Cryptococcus spp.',
                    '',
                    false,
                    'CSF Positive: Cryptococcus spp. (India ink positive)'
                  )
                }
                className="px-2.5 py-1 bg-amber-100 text-amber-800 hover:bg-amber-200 rounded-lg font-bold transition-colors"
              >
                🧠 CSF Cryptococcus
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* HN (Unmasked) */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  เลข HN (ไม่ปิดบังข้อมูล) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={hn}
                  onChange={(e) => setHn(e.target.value)}
                  placeholder="เช่น 68120451 หรือ 123456"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-red-500 focus:outline-none"
                  required
                />
              </div>

              {/* Patient Name */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  ชื่อ-นามสกุลผู้ป่วย
                </label>
                <input
                  type="text"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  placeholder="เช่น นายสมชาย ใจดี"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>

              {/* Ward */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  หอผู้ป่วย (Ward) <span className="text-red-500">*</span>
                </label>
                <select
                  value={ward}
                  onChange={(e) => setWard(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-red-500 focus:outline-none"
                >
                  {COMMON_WARDS.map((w) => (
                    <option key={w} value={w}>
                      {w}
                    </option>
                  ))}
                </select>
              </div>

              {/* Specimen */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  สิ่งส่งตรวจ (Specimen) <span className="text-red-500">*</span>
                </label>
                <select
                  value={specimen}
                  onChange={(e) => setSpecimen(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-red-500 focus:outline-none"
                >
                  {SPECIMENS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              {/* Organism */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  เชื้อที่ตรวจพบ (Organism) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={organism}
                  onChange={(e) => setOrganism(e.target.value)}
                  placeholder="เช่น Acinetobacter baumannii, Klebsiella..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs italic font-semibold text-slate-900 focus:ring-2 focus:ring-red-500 focus:outline-none"
                  required
                />
              </div>

              {/* Resistance Tag */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-slate-700">
                    การดื้อยา (AMR Classification)
                  </label>
                  <label className="flex items-center space-x-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isAmr}
                      onChange={(e) => setIsAmr(e.target.checked)}
                      className="rounded text-red-600 focus:ring-red-500"
                    />
                    <span className="font-bold text-red-600">เป็นเชื้อดื้อยา AMR</span>
                  </label>
                </div>
                <select
                  value={resistanceType}
                  onChange={(e) => {
                    setResistanceType(e.target.value);
                    if (e.target.value) setIsAmr(true);
                  }}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-red-500 focus:outline-none"
                >
                  <option value="">ไม่มี (ผลวิกฤตทั่วไป / Non-MDRO)</option>
                  <option value="CRAB">🚨 CRAB (Acinetobacter Carbapenem-Resistant)</option>
                  <option value="CRE">⚠️ CRE (Enterobacterales Carbapenem-Resistant)</option>
                  <option value="MRSA">🧬 MRSA (Methicillin-Resistant S. aureus)</option>
                  <option value="VRE">🧬 VRE (Vancomycin-Resistant Enterococcus)</option>
                  <option value="ESBL">💊 ESBL (Extended-Spectrum Beta-Lactamase)</option>
                  <option value="MDR">⚡ MDR (Multidrug-Resistant Organism)</option>
                </select>
              </div>
            </div>

            {/* Findings Detail */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                รายละเอียดผลตรวจ / ข้อความที่จะส่งเข้า Telegram
              </label>
              <textarea
                value={findingsDetail}
                onChange={(e) => setFindingsDetail(e.target.value)}
                rows={3}
                placeholder="ระบุรายละเอียดผลวิกฤต ความไวต่อยา หรือคำแนะนำ IC..."
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-800 focus:ring-2 focus:ring-red-500 focus:outline-none"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 bg-gradient-to-r from-red-600 via-rose-600 to-indigo-700 hover:from-red-700 hover:to-indigo-800 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center space-x-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'กำลังส่งแจ้งเตือนและบันทึก...' : 'ส่งแจ้งเตือนเข้า Telegram & บันทึกลงระบบ'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
