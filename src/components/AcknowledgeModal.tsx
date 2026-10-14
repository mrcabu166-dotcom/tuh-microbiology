'use client';

import React, { useState } from 'react';
import { CriticalResult } from '@/types';
import { CheckCircle2, X, User, Clock, AlertTriangle } from 'lucide-react';

interface AcknowledgeModalProps {
  alert: CriticalResult | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AcknowledgeModal({
  alert,
  onClose,
  onSuccess,
}: AcknowledgeModalProps) {
  const [acknowledgedByName, setAcknowledgedByName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!alert) return null;

  const quickRoles = [
    'พว. พยาบาลเวรประจำหอผู้ป่วย',
    'พว. หัวหน้าเวร (In-charge)',
    'พญ./นพ. แพทย์เจ้าของไข้',
    'พญ./นพ. แพทย์ประจำบ้าน (Resident)',
    'ทน.ม. รับแจ้งทางโทรศัพท์',
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = acknowledgedByName.trim() || 'เจ้าหน้าที่ประจำหอผู้ป่วย';

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/alerts/${alert.id}/acknowledge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acknowledged_by_name: name }),
      });

      const data = await res.json();
      if (data.success) {
        onSuccess();
        onClose();
      } else {
        setError(data.error || 'เกิดข้อผิดพลาดในการบันทึก');
      }
    } catch (err: any) {
      setError(err.message || 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 px-6 py-4 flex items-center justify-between text-white">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-6 h-6 text-emerald-200" />
            <h3 className="font-bold text-lg">ยืนยันรับทราบผลตรวจวิกฤต (Web Acknowledge)</h3>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Summary Box */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm space-y-2">
            <div className="flex justify-between items-center text-slate-600">
              <span>หอผู้ป่วย:</span>
              <span className="font-semibold text-slate-800">{alert.ward_name || 'ไม่ระบุ'}</span>
            </div>
            <div className="flex justify-between items-center text-slate-600">
              <span>สิ่งส่งตรวจ / Lab No:</span>
              <span className="font-medium text-slate-800">{alert.specimen_type} ({alert.specimen_no})</span>
            </div>
            <div className="flex justify-between items-center text-slate-600">
              <span>HN ผู้ป่วย:</span>
              <span className="font-mono font-bold text-slate-900 bg-amber-100 px-2 py-0.5 rounded text-xs">{alert.hn}</span>
            </div>
            <div className="pt-2 border-t border-slate-200">
              <span className="text-slate-500 block text-xs">ผลตรวจวิเคราะห์:</span>
              <p className="font-bold text-red-600 mt-0.5">{alert.findings_detail}</p>
            </div>
          </div>

          {/* Quick Select Buttons */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              เลือกบทบาท/ตำแหน่งผู้รับทราบผลด่วน:
            </label>
            <div className="flex flex-wrap gap-1.5">
              {quickRoles.map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => setAcknowledgedByName(role)}
                  className={`text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${
                    acknowledgedByName === role
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>

          {/* Input field */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              ชื่อ-นามสกุล / ตำแหน่งผู้รับทราบผล:
            </label>
            <div className="relative">
              <User className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={acknowledgedByName}
                onChange={(e) => setAcknowledgedByName(e.target.value)}
                placeholder="เช่น พว. สมศรี ใจดี (พยาบาลเวร MICU)"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium text-slate-800"
                required
              />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="pt-2 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold text-sm rounded-xl shadow-md transition-all flex items-center space-x-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'กำลังบันทึก...' : 'ยืนยันรับทราบผลตรวจ'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
