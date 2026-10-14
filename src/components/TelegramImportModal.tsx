'use client';

import React, { useState } from 'react';
import { Send, X, Dna, FileText, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

interface TelegramImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function TelegramImportModal({
  isOpen,
  onClose,
  onSuccess,
}: TelegramImportModalProps) {
  const [text, setText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAutoSyncing, setIsAutoSyncing] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  if (!isOpen) return null;

  // Paste Sample Format
  const pasteSample = () => {
    setText(
`CRAB Alert
HN: 123456
Ward: MICU
Specimen: Sputum
Organism: Acinetobacter baumannii
Resistance: Carbapenem Resistant
Date: 2026-06-24`
    );
  };

  // Submit manual text to Hermes Parser
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/telegram/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      const data = await res.json();
      if (data.success) {
        setFeedback({
          type: 'success',
          message: data.message || 'นำเข้าข้อมูลเข้าสู่ Dashboard สำเร็จ!',
        });
        setText('');
        onSuccess();
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        setFeedback({ type: 'error', message: data.error || 'ไม่สามารถแปลงข้อมูลได้' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Trigger auto-sync from Telegram getUpdates
  const handleAutoSync = async () => {
    setIsAutoSyncing(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/telegram/sync');
      const data = await res.json();
      if (data.success) {
        setFeedback({
          type: 'success',
          message: `ดึงข้อมูลจาก Telegram แล้ว ตรวจพบข้อความใหม่ ${data.ingested_count || 0} รายการ`,
        });
        onSuccess();
      } else {
        setFeedback({ type: 'error', message: data.error || 'เกิดข้อผิดพลาดในการดึงข้อมูล' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'ไม่สามารถเชื่อมต่อ Telegram ได้' });
    } finally {
      setIsAutoSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-4 flex items-center justify-between text-white">
          <div className="flex items-center space-x-2">
            <span className="text-xl">📥</span>
            <div>
              <h3 className="font-bold text-lg">นำเข้าข้อความแจ้งเตือนจากกลุ่ม LABALEARTTUH</h3>
              <p className="text-xs text-blue-100">ดึงข้อความอัตโนมัติหรือวางข้อความเพื่อบันทึกเข้า Dashboard โดยไม่ปิดบังข้อมูล</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {feedback && (
            <div
              className={`p-3 rounded-xl flex items-center space-x-2 text-xs font-semibold ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
          )}

          {/* Quick Auto-fetch button */}
          <div className="flex items-center justify-between bg-blue-50/60 border border-blue-200 p-3 rounded-xl">
            <div>
              <div className="text-xs text-blue-900 font-bold">
                ดึงข้อความสดจาก Telegram Group LABALEARTTUH
              </div>
              <div className="text-[11px] text-blue-700 font-mono">Chat ID: -1003285766063</div>
            </div>
            <button
              onClick={handleAutoSync}
              disabled={isAutoSyncing}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow flex items-center space-x-1 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isAutoSyncing ? 'animate-spin' : ''}`} />
              <span>{isAutoSyncing ? 'กำลังดึง...' : 'ดึงข้อมูลสด'}</span>
            </button>
          </div>

          {/* Manual Paste Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700">
                หรือคัดลอกข้อความแจ้งเตือนมาวางที่นี่:
              </label>
              <button
                type="button"
                onClick={pasteSample}
                className="text-[11px] text-blue-600 hover:underline font-semibold"
              >
                + ตัวอย่างข้อความ AMR
              </button>
            </div>

            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={6}
              placeholder={`วางข้อความจาก Telegram เช่น:\nCRAB Alert\nHN: 123456\nWard: MICU\nSpecimen: Sputum\nOrganism: Acinetobacter baumannii\nResistance: Carbapenem Resistant`}
              className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              required
            />

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                ปิด
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !text.trim()}
                className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow transition-all flex items-center space-x-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'กำลังแปลงข้อมูล...' : 'แปลงข้อมูลลง Dashboard'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
