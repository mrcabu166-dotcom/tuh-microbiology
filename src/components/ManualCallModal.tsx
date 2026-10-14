'use client';

import React, { useState } from 'react';
import { CriticalResult } from '@/types';
import { PhoneCall, X, User, Phone, FileText, CheckCircle } from 'lucide-react';

interface ManualCallModalProps {
  alert: CriticalResult | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ManualCallModal({
  alert,
  onClose,
  onSuccess,
}: ManualCallModalProps) {
  const [callerName, setCallerName] = useState('ทน.ม. มานพ นันตาบุตร');
  const [recipientName, setRecipientName] = useState('');
  const [callNote, setCallNote] = useState('');
  const [closeAlert, setCloseAlert] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!alert) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientName.trim()) {
      setError('กรุณาระบุชื่อพยาบาลหรือแพทย์ผู้รับสาย');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/alerts/${alert.id}/manual-call`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caller_name: callerName.trim(),
          recipient_name: recipientName.trim(),
          call_note: callNote.trim(),
          close_alert: closeAlert,
        }),
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
        <div className="bg-gradient-to-r from-red-600 to-rose-700 px-6 py-4 flex items-center justify-between text-white">
          <div className="flex items-center space-x-2">
            <PhoneCall className="w-6 h-6 text-rose-200 animate-pulse" />
            <div>
              <h3 className="font-bold text-lg">Safety Net Protocol: โทรรายงานผลวิกฤต</h3>
              <p className="text-xs text-rose-100">บันทึกการโทรรายงานตรงกรณีฉุกเฉิน/เกิน 15 นาที</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Ward Phone Alert Box */}
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 flex items-center justify-between">
            <div>
              <span className="text-xs text-red-600 font-bold uppercase tracking-wider block">
                เบอร์โทรศัพท์สายตรงหอผู้ป่วย:
              </span>
              <span className="text-lg font-bold text-slate-900">{alert.ward_name}</span>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-500 block">เบอร์ต่อภายใน</span>
              <span className="text-2xl font-black text-red-600 font-mono tracking-wide">
                ☎️ {alert.contact_phone || '9460'}
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ชื่อนักเทคนิคการแพทย์ผู้โทรรายงาน:
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={callerName}
                  onChange={(e) => setCallerName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-800 focus:ring-2 focus:ring-red-500 focus:outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ชื่อพยาบาล / แพทย์ผู้รับสายโทรศัพท์ (จำเป็น):
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="เช่น พว. วิภาภรณ์ (พยาบาลเวร)"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-800 focus:ring-2 focus:ring-red-500 focus:outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                บันทึกการสนทนา / รายละเอียดเพิ่มเติม:
              </label>
              <div className="relative">
                <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <textarea
                  value={callNote}
                  onChange={(e) => setCallNote(e.target.value)}
                  placeholder="เช่น แจ้งผล Hemoculture GNB ให้ทราบแล้ว พยาบาลกำลังรายงานแพทย์เวรเพื่อเริ่มยา Meropenem"
                  rows={2}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-1">
              <input
                type="checkbox"
                id="closeAlertCheck"
                checked={closeAlert}
                onChange={(e) => setCloseAlert(e.target.checked)}
                className="w-4 h-4 text-red-600 rounded border-slate-300 focus:ring-red-500 cursor-pointer"
              />
              <label htmlFor="closeAlertCheck" className="text-xs font-semibold text-slate-700 cursor-pointer">
                ถือว่าเป็นการรับทราบผลสมบูรณ์ และปิดการติดตามรายการนี้ (Mark as Acknowledged)
              </label>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600">
              {error}
            </div>
          )}

          <div className="pt-2 flex items-center justify-end space-x-3 border-t border-slate-100">
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
              className="px-5 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold text-sm rounded-xl shadow-md transition-all flex items-center space-x-2"
            >
              <CheckCircle className="w-4 h-4" />
              <span>{isSubmitting ? 'กำลังบันทึก...' : 'บันทึกการโทรรายงาน'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
