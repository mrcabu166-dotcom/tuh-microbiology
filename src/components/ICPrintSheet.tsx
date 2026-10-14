'use client';

import React from 'react';
import { Printer, X } from 'lucide-react';

interface AlertItem {
  id: number | string;
  alert_date: string;
  hn: string;
  patient_name: string | null;
  ward: string;
  specimen: string;
  organism: string;
  resistance_type: string | null;
  is_amr: boolean;
  findings_detail: string;
}

interface ICPrintSheetProps {
  isOpen: boolean;
  onClose: () => void;
  alerts: AlertItem[];
  periodLabel: string;
}

export default function ICPrintSheet({
  isOpen,
  onClose,
  alerts,
  periodLabel,
}: ICPrintSheetProps) {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const amrAlerts = alerts.filter((a) => a.is_amr);
  const criticalAlerts = alerts.filter((a) => !a.is_amr);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto max-h-[95vh]">
        {/* Modal Controls (Hidden in Print) */}
        <div className="bg-slate-900 text-white px-6 py-3 flex items-center justify-between print:hidden shrink-0">
          <div className="flex items-center space-x-2">
            <Printer className="w-5 h-5 text-indigo-400" />
            <h3 className="font-bold text-sm">
              พิมพ์ใบรายงานการเฝ้าระวังเชื้อดื้อยา IC ประจำวัน (Printable Rounding Sheet)
            </h3>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow flex items-center space-x-1.5 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>พิมพ์เอกสาร (Print A4)</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Area */}
        <div className="p-8 overflow-y-auto flex-1 font-sans text-slate-900 bg-white" id="printable-sheet">
          <style jsx global>{`
            @media print {
              body * {
                visibility: hidden;
              }
              #printable-sheet,
              #printable-sheet * {
                visibility: visible;
              }
              #printable-sheet {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                padding: 0;
                margin: 0;
              }
            }
          `}</style>

          {/* Hospital Header */}
          <div className="border-b-2 border-slate-900 pb-4 mb-4 flex items-center justify-between">
            <div>
              <h1 className="text-lg font-black tracking-tight text-slate-900">
                โรงพยาบาลธรรมศาสตร์เฉลิมพระเกียรติ (Thammasat University Hospital)
              </h1>
              <h2 className="text-sm font-bold text-slate-700">
                หน่วยควบคุมและป้องกันการติดเชื้อในโรงพยาบาล (IC) ร่วมกับ งานจุลชีววิทยา ภาควิชาพยาธิวิทยา
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                ใบรายงานสรุปการเฝ้าระวังเชื้อดื้อยาและผลวิกฤตสำหรับการตรวจเยี่ยมหอผู้ป่วย (IC Daily Rounding Sheet)
              </p>
            </div>
            <div className="text-right text-xs font-mono">
              <div className="font-bold">วันที่พิมพ์: {new Date().toLocaleDateString('th-TH')}</div>
              <div>เวลา: {new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.</div>
              <div className="text-slate-500">ช่วงข้อมูล: {periodLabel}</div>
            </div>
          </div>

          {/* Summary Stats Strip */}
          <div className="grid grid-cols-4 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-300 text-xs mb-5">
            <div>
              <span className="text-slate-500 block text-[11px]">เคสแจ้งเตือนทั้งหมด</span>
              <span className="font-black text-base text-slate-900">{alerts.length} รายการ</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">พบเชื้อดื้อยา (AMR)</span>
              <span className="font-black text-base text-red-700">{amrAlerts.length} ราย</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">ผลเลือด/CSF วิกฤต</span>
              <span className="font-black text-base text-amber-700">
                {alerts.filter(a => a.specimen.toLowerCase().includes('hemo') || a.specimen.toLowerCase().includes('csf') || a.specimen.toLowerCase().includes('เลือด')).length} ราย
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">หอผู้ป่วยที่มีเคส</span>
              <span className="font-black text-base text-slate-900">
                {new Set(alerts.map(a => a.ward)).size} หอผู้ป่วย
              </span>
            </div>
          </div>

          {/* Table */}
          <table className="w-full text-left text-[11px] border-collapse border border-slate-300 mb-6">
            <thead>
              <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                <th className="p-2 border-r border-slate-300 text-center w-8">ที่</th>
                <th className="p-2 border-r border-slate-300 w-24">HN ผู้ป่วย</th>
                <th className="p-2 border-r border-slate-300 w-32">ชื่อ-สกุล</th>
                <th className="p-2 border-r border-slate-300 w-28">หอผู้ป่วย</th>
                <th className="p-2 border-r border-slate-300 w-24">สิ่งส่งตรวจ</th>
                <th className="p-2 border-r border-slate-300">เชื้อก่อโรค & การดื้อยา</th>
                <th className="p-2 border-r border-slate-300 w-36">มาตรการแยกโรค (IC)</th>
                <th className="p-2 border-slate-300 w-32">บันทึกตรวจเยี่ยม / เซ็นชื่อ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300">
              {alerts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-slate-400">
                    ไม่มีรายการแจ้งเตือนในช่วงเวลานี้
                  </td>
                </tr>
              ) : (
                alerts.map((item, idx) => {
                  let icAction = 'Standard Precautions';
                  if (item.resistance_type?.includes('CRAB') || item.resistance_type?.includes('CRE')) {
                    icAction = 'Contact (กาวน์+ถุงมือ/แยกห้อง)';
                  } else if (item.resistance_type?.includes('MRSA') || item.resistance_type?.includes('VRE')) {
                    icAction = 'Contact (ล้างมือ 5 moments)';
                  } else if (item.resistance_type?.includes('ESBL')) {
                    icAction = 'Standard + ระวังสารคัดหลั่ง';
                  }

                  return (
                    <tr key={item.id} className={item.is_amr ? 'bg-red-50/20' : ''}>
                      <td className="p-2 border-r border-slate-300 text-center font-mono">{idx + 1}</td>
                      <td className="p-2 border-r border-slate-300 font-mono font-bold text-slate-900">
                        {item.hn}
                      </td>
                      <td className="p-2 border-r border-slate-300 font-semibold">{item.patient_name || '-'}</td>
                      <td className="p-2 border-r border-slate-300 font-medium">{item.ward}</td>
                      <td className="p-2 border-r border-slate-300">{item.specimen}</td>
                      <td className="p-2 border-r border-slate-300">
                        <span className="italic font-bold">{item.organism}</span>
                        {item.resistance_type && (
                          <span className="ml-1 font-bold text-red-700">({item.resistance_type})</span>
                        )}
                      </td>
                      <td className="p-2 border-r border-slate-300 font-semibold text-[10px] text-slate-800">
                        {icAction}
                      </td>
                      <td className="p-2 border-slate-300 border-b border-dashed border-slate-300">
                        {/* Blank space for handwritten notes on IC round */}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-12 pt-6 text-xs text-center border-t border-slate-300">
            <div>
              <p className="text-slate-500 mb-8">ลงชื่อพยาบาลผู้ตรวจเยี่ยม (ICN):</p>
              <p className="font-bold border-b border-dotted border-slate-500 inline-block w-48 pb-1"></p>
              <p className="text-slate-500 mt-1">(พยาบาลควบคุมการติดเชื้อ)</p>
            </div>
            <div>
              <p className="text-slate-500 mb-8">ลงชื่อแพทย์ผู้รับผิดชอบ / แพทย์ ID:</p>
              <p className="font-bold border-b border-dotted border-slate-500 inline-block w-48 pb-1"></p>
              <p className="text-slate-500 mt-1">(แพทย์ผู้ดูแลการใช้ยาปฏิชีวนะ)</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
