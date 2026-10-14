'use client';

import React, { useState, useEffect } from 'react';
import { CriticalResult } from '@/types';
import {
  Clock,
  PhoneCall,
  CheckCircle2,
  AlertTriangle,
  Flame,
  ShieldAlert,
  Search,
  Filter,
  RefreshCw,
  Building2,
  FileText,
  User,
  ExternalLink,
} from 'lucide-react';
import AcknowledgeModal from './AcknowledgeModal';
import ManualCallModal from './ManualCallModal';

interface LiveKanbanBoardProps {
  alerts: CriticalResult[];
  onRefresh: () => void;
  isLoading: boolean;
}

export default function LiveKanbanBoard({
  alerts,
  onRefresh,
  isLoading,
}: LiveKanbanBoardProps) {
  const [selectedAlertForAck, setSelectedAlertForAck] = useState<CriticalResult | null>(null);
  const [selectedAlertForCall, setSelectedAlertForCall] = useState<CriticalResult | null>(null);
  const [filterType, setFilterType] = useState<'ALL' | 'AMR_ONLY' | 'HEMO_ONLY'>('ALL');
  const [showAcknowledged, setShowAcknowledged] = useState(false);
  const [now, setNow] = useState(Date.now());

  // Live timer tick every second for real-time elapsed time
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Helper to format elapsed stopwatch time
  const getElapsedInfo = (reportedAt: string) => {
    const elapsedMs = Math.max(0, now - new Date(reportedAt).getTime());
    const totalMinutes = Math.floor(elapsedMs / 60000);
    const seconds = Math.floor((elapsedMs % 60000) / 1000);
    const formatted = `${totalMinutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')} นาที`;

    return {
      minutes: totalMinutes,
      formatted,
      isOver15: totalMinutes >= 15,
      isOver10: totalMinutes >= 10 && totalMinutes < 15,
    };
  };

  // Filter alerts
  const filteredAlerts = alerts.filter((alert) => {
    if (filterType === 'AMR_ONLY' && !alert.is_amr) return false;
    if (filterType === 'HEMO_ONLY' && !alert.specimen_type.toLowerCase().includes('hemo') && !alert.specimen_type.includes('เลือด')) return false;
    return true;
  });

  // Categorize active alerts
  const colPending: CriticalResult[] = [];
  const colReminder: CriticalResult[] = [];
  const colEscalated: CriticalResult[] = [];
  const colCompleted: CriticalResult[] = [];

  filteredAlerts.forEach((alert) => {
    if (alert.status === 'ACKNOWLEDGED' || alert.status === 'MANUAL_CALLED') {
      colCompleted.push(alert);
      return;
    }

    const { minutes } = getElapsedInfo(alert.reported_at);
    if (minutes >= 15 || alert.status === 'ESCALATED') {
      colEscalated.push(alert);
    } else if (minutes >= 10) {
      colReminder.push(alert);
    } else {
      colPending.push(alert);
    }
  });

  return (
    <div className="space-y-6">
      {/* Control & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-4">
        {/* Filter Pills */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setFilterType('ALL')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors ${
              filterType === 'ALL'
                ? 'bg-slate-900 text-white shadow'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            📋 ทั้งหมด ({filteredAlerts.length})
          </button>
          <button
            onClick={() => setFilterType('AMR_ONLY')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center space-x-1.5 ${
              filterType === 'AMR_ONLY'
                ? 'bg-purple-700 text-white shadow'
                : 'bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100'
            }`}
          >
            <span>🧬 เฉพาะเชื้อดื้อยา AMR</span>
            <span className="bg-white/20 px-1.5 py-0.2 rounded-full text-[10px]">
              {alerts.filter((a) => a.is_amr).length}
            </span>
          </button>
          <button
            onClick={() => setFilterType('HEMO_ONLY')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center space-x-1.5 ${
              filterType === 'HEMO_ONLY'
                ? 'bg-rose-700 text-white shadow'
                : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
            }`}
          >
            <span>🩸 ผลเพาะเชื้อเลือด (Hemoculture)</span>
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-3">
          <label className="flex items-center space-x-2 text-xs font-semibold text-slate-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showAcknowledged}
              onChange={(e) => setShowAcknowledged(e.target.checked)}
              className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
            />
            <span>แสดงรายการรับทราบแล้ว ({colCompleted.length})</span>
          </label>

          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors disabled:opacity-50 flex items-center space-x-1 text-xs font-semibold"
            title="รีเฟรชข้อมูล"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-emerald-600' : ''}`} />
            <span className="hidden sm:inline">รีเฟรช</span>
          </button>
        </div>
      </div>

      {/* Safety Net Banner for Active Escalated Alerts */}
      {colEscalated.length > 0 && (
        <div className="bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white p-4 rounded-2xl shadow-lg border-2 border-red-300 flex items-center justify-between animate-pulse">
          <div className="flex items-center space-x-3">
            <Flame className="w-8 h-8 text-yellow-300 animate-bounce" />
            <div>
              <h4 className="font-bold text-base">🚨 มีผลวิกฤตเกินกำหนด 15 นาที ({colEscalated.length} รายการ)!</h4>
              <p className="text-xs text-red-100">
                กรุณาต่อสายตรงไปยังหอผู้ป่วยตาม Safety Net Protocol ทันทีเพื่อความปลอดภัยสูงสุดของผู้ป่วย
              </p>
            </div>
          </div>
          <span className="bg-white text-red-700 font-bold px-3 py-1 rounded-xl text-xs shadow">
            DANGER ZONE
          </span>
        </div>
      )}

      {/* Kanban 3-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Column 1: Pending (<10 min) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 px-4 py-3 rounded-2xl">
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping"></span>
              <h3 className="font-bold text-sm text-emerald-900">ส่งแล้ว / รอรับทราบ (&lt; 10 นาที)</h3>
            </div>
            <span className="bg-emerald-200/60 text-emerald-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
              {colPending.length}
            </span>
          </div>

          <div className="space-y-4">
            {colPending.length === 0 ? (
              <div className="bg-white/60 border border-dashed border-slate-300 rounded-2xl p-8 text-center text-slate-400 text-xs">
                ไม่มีรายการรอรับทราบในช่วงเวลานี้
              </div>
            ) : (
              colPending.map((alert) => (
                <AlertCard
                  key={alert.id}
                  alert={alert}
                  now={now}
                  onAck={() => setSelectedAlertForAck(alert)}
                  onCall={() => setSelectedAlertForCall(alert)}
                />
              ))
            )}
          </div>
        </div>

        {/* Column 2: Gentle Reminder (10 - 15 min) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between bg-amber-50 border border-amber-200 px-4 py-3 rounded-2xl">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-amber-600" />
              <h3 className="font-bold text-sm text-amber-900">เตือนครั้งที่ 1 (10 - 15 นาที)</h3>
            </div>
            <span className="bg-amber-200/60 text-amber-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
              {colReminder.length}
            </span>
          </div>

          <div className="space-y-4">
            {colReminder.length === 0 ? (
              <div className="bg-white/60 border border-dashed border-slate-300 rounded-2xl p-8 text-center text-slate-400 text-xs">
                ไม่มีรายการค้างในกลุ่ม 10-15 นาที
              </div>
            ) : (
              colReminder.map((alert) => (
                <AlertCard
                  key={alert.id}
                  alert={alert}
                  now={now}
                  onAck={() => setSelectedAlertForAck(alert)}
                  onCall={() => setSelectedAlertForCall(alert)}
                />
              ))
            )}
          </div>
        </div>

        {/* Column 3: Escalated (>15 min Danger Zone) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between bg-red-50 border border-red-200 px-4 py-3 rounded-2xl">
            <div className="flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4 text-red-600 animate-bounce" />
              <h3 className="font-bold text-sm text-red-900">เกิน 15 นาที (Escalated Danger Zone)</h3>
            </div>
            <span className="bg-red-200/60 text-red-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
              {colEscalated.length}
            </span>
          </div>

          <div className="space-y-4">
            {colEscalated.length === 0 ? (
              <div className="bg-white/60 border border-dashed border-slate-300 rounded-2xl p-8 text-center text-slate-400 text-xs">
                ไม่มีรายการเกินกำหนดเวลา (ดีเยี่ยม! 🎉)
              </div>
            ) : (
              colEscalated.map((alert) => (
                <AlertCard
                  key={alert.id}
                  alert={alert}
                  now={now}
                  isEscalated
                  onAck={() => setSelectedAlertForAck(alert)}
                  onCall={() => setSelectedAlertForCall(alert)}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Completed / Acknowledged Today Section */}
      {showAcknowledged && colCompleted.length > 0 && (
        <div className="mt-8 pt-6 border-t border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <h3 className="font-bold text-slate-800">รายการที่ยืนยันรับทราบแล้ววันนี้ ({colCompleted.length})</h3>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {colCompleted.map((alert) => (
              <div
                key={alert.id}
                className="bg-white p-4 rounded-2xl border border-slate-200 opacity-80 hover:opacity-100 transition-opacity space-y-2 text-xs"
              >
                <div className="flex justify-between items-center text-slate-500">
                  <span className="font-mono font-bold text-slate-700">{alert.specimen_no}</span>
                  <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                    ✅ รับทราบแล้ว
                  </span>
                </div>
                <div className="font-bold text-sm text-slate-800">{alert.ward_name}</div>
                <div className="text-slate-600 line-clamp-1">{alert.findings_detail}</div>
                <div className="pt-2 border-t border-slate-100 text-slate-500 flex justify-between">
                  <span>ผู้รับ: {alert.acknowledged_by_name || '-'}</span>
                  <span>ช่องทาง: {alert.acknowledged_channel || 'Telegram'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Acknowledge Modal */}
      <AcknowledgeModal
        alert={selectedAlertForAck}
        onClose={() => setSelectedAlertForAck(null)}
        onSuccess={onRefresh}
      />

      {/* Manual Phone Call Modal */}
      <ManualCallModal
        alert={selectedAlertForCall}
        onClose={() => setSelectedAlertForCall(null)}
        onSuccess={onRefresh}
      />
    </div>
  );
}

// Individual Alert Card Component
function AlertCard({
  alert,
  now,
  isEscalated = false,
  onAck,
  onCall,
}: {
  alert: CriticalResult;
  now: number;
  isEscalated?: boolean;
  onAck: () => void;
  onCall: () => void;
}) {
  const elapsedMs = Math.max(0, now - new Date(alert.reported_at).getTime());
  const totalMinutes = Math.floor(elapsedMs / 60000);
  const seconds = Math.floor((elapsedMs % 60000) / 1000);
  const timeFormatted = `${totalMinutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  const reportedTime = new Date(alert.reported_at).toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      className={`bg-white rounded-2xl p-4 shadow-sm border transition-all hover:shadow-md ${
        isEscalated
          ? 'border-2 border-red-500 danger-zone-card bg-red-50/20'
          : totalMinutes >= 10
          ? 'border-amber-400 bg-amber-50/10'
          : 'border-slate-200'
      }`}
    >
      {/* Top Header: Ward & Live Stopwatch */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <div className="flex items-center space-x-1.5">
          <Building2 className="w-4 h-4 text-slate-500" />
          <span className="font-bold text-sm text-slate-900">{alert.ward_name}</span>
        </div>
        <div
          className={`flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-mono font-bold ${
            isEscalated
              ? 'bg-red-600 text-white animate-pulse'
              : totalMinutes >= 10
              ? 'bg-amber-100 text-amber-800'
              : 'bg-emerald-100 text-emerald-800'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>{timeFormatted}</span>
        </div>
      </div>

      {/* AMR Highlight Tag if applicable */}
      {alert.is_amr && (
        <div className="mt-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-2.5 py-1 rounded-xl text-xs font-bold flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-1.5">
            <span>🧬</span>
            <span>AMR ALERT: {alert.amr_type || 'MDRO'}</span>
          </div>
          <span className="text-[10px] bg-white/20 px-1.5 py-0.2 rounded-md">เชื้อดื้อยา</span>
        </div>
      )}

      {/* Patient & Specimen Info */}
      <div className="mt-3 space-y-1.5 text-xs text-slate-600">
        <div className="flex justify-between items-center">
          <span className="text-slate-400">HN ผู้ป่วย:</span>
          <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
            {alert.hn} {alert.patient_initials ? `(${alert.patient_initials})` : ''}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-slate-400">สิ่งส่งตรวจ:</span>
          <span className="font-semibold text-slate-800">{alert.specimen_type}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-slate-400">Lab Specimen No:</span>
          <span className="font-mono text-slate-700">{alert.specimen_no}</span>
        </div>
      </div>

      {/* Critical Findings Box */}
      <div className="mt-3 p-2.5 bg-slate-50 rounded-xl border border-slate-100">
        <span className="text-[11px] font-semibold text-slate-500 block">ผลตรวจวิเคราะห์วิกฤต:</span>
        <p className="font-bold text-red-600 text-xs mt-0.5 leading-snug">{alert.findings_detail}</p>
        
        {/* Antibiogram / IC details for AMR */}
        {alert.is_amr && alert.antibiogram_summary && (
          <p className="text-[11px] text-slate-600 mt-1">
            <span className="font-semibold text-slate-700">AST:</span> {alert.antibiogram_summary}
          </p>
        )}
        {alert.is_amr && alert.ic_action_recommended && (
          <p className="text-[11px] text-indigo-700 font-semibold mt-0.5">
            🛡️ {alert.ic_action_recommended}
          </p>
        )}
      </div>

      {/* Meta Footer */}
      <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400">
        <span>ออกผล: {reportedTime} น.</span>
        <span>โดย: ทน.ม. {alert.reported_by}</span>
      </div>

      {/* Two-Way Action Buttons */}
      <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2">
        {/* Direct Web Acknowledge Button */}
        <button
          onClick={onAck}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-2 rounded-xl text-xs shadow-sm transition-all flex items-center justify-center space-x-1"
        >
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          <span>กดยืนยันรับทราบ</span>
        </button>

        {/* Safety Net Phone Call Button */}
        <button
          onClick={onCall}
          className={`w-full py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1 ${
            isEscalated
              ? 'bg-red-600 hover:bg-red-700 text-white shadow animate-pulse'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
          }`}
        >
          <PhoneCall className="w-3.5 h-3.5 shrink-0" />
          <span>โทร {alert.contact_phone || 'สายใน'}</span>
        </button>
      </div>
    </div>
  );
}
