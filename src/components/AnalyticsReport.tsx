'use client';

import React from 'react';
import { CriticalResult, KPISummary } from '@/types';
import {
  Award,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Download,
  Dna,
  ShieldCheck,
  BarChart3,
} from 'lucide-react';

interface AnalyticsReportProps {
  kpi: KPISummary | null;
  alerts: CriticalResult[];
}

export default function AnalyticsReport({ kpi, alerts }: AnalyticsReportProps) {
  // Export CSV Function
  const exportCsv = () => {
    const headers = [
      'Lab No',
      'HN',
      'Ward',
      'Specimen Type',
      'Findings Detail',
      'Is AMR',
      'AMR Type',
      'Reported By',
      'Reported At',
      'Status',
      'Acknowledged By',
      'Acknowledged At',
      'Channel',
      'Manual Call Notes',
    ];

    const rows = alerts.map((a) => [
      `"${a.specimen_no}"`,
      `"${a.hn}"`,
      `"${a.ward_name || ''}"`,
      `"${a.specimen_type}"`,
      `"${(a.findings_detail || '').replace(/"/g, '""')}"`,
      a.is_amr ? 'YES' : 'NO',
      `"${a.amr_type || ''}"`,
      `"${a.reported_by}"`,
      `"${new Date(a.reported_at).toLocaleString('th-TH')}"`,
      `"${a.status}"`,
      `"${a.acknowledged_by_name || ''}"`,
      a.acknowledged_at ? `"${new Date(a.acknowledged_at).toLocaleString('th-TH')}"` : '""',
      `"${a.acknowledged_channel || ''}"`,
      `"${(a.manual_call_note || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `TUH_Microbiology_Critical_Alerts_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const amrBreakdown = kpi?.amr_breakdown || {};
  const amrKeys = Object.keys(amrBreakdown);

  return (
    <div className="space-y-6">
      {/* Top Title & Export Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <div className="flex items-center space-x-2 text-slate-800">
            <BarChart3 className="w-6 h-6 text-red-600" />
            <h2 className="font-bold text-lg">รายงานและสถิติตัวชี้วัดคุณภาพ (CQI & HA Standards)</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            งานจุลชีววิทยา ฝ่ายสหเวชศาสตร์ โรงพยาบาลธรรมศาสตร์เฉลิมพระเกียรติ
          </p>
        </div>

        <button
          onClick={exportCsv}
          className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow transition-colors flex items-center space-x-2"
        >
          <Download className="w-4 h-4" />
          <span>ส่งออกรายงาน Audit Trail (CSV)</span>
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: % Acknowledged within 15 min */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>รับทราบภายใน 15 นาที</span>
            <Award className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-black text-emerald-600">
              {kpi?.percent_within_15min || 100}%
            </span>
            <span className="text-xs font-bold text-slate-400">เป้าหมาย &ge; 95%</span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all"
              style={{ width: `${Math.min(100, kpi?.percent_within_15min || 100)}%` }}
            ></div>
          </div>
          <span className="text-[11px] text-emerald-700 font-semibold block">
            ✅ ผ่านเกณฑ์มาตรฐานความปลอดภัยผู้ป่วย
          </span>
        </div>

        {/* Card 2: Median Result-to-Acknowledgement Time */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Median Ack Time</span>
            <Clock className="w-5 h-5 text-blue-600" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-black text-blue-600">
              {kpi?.median_ack_minutes || 0}
            </span>
            <span className="text-xs font-bold text-slate-400">นาที (เป้าหมาย &le; 5 น.)</span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div
              className="bg-blue-500 h-full rounded-full transition-all"
              style={{ width: `${Math.min(100, ((5 / Math.max(1, kpi?.median_ack_minutes || 1)) * 100))}%` }}
            ></div>
          </div>
          <span className="text-[11px] text-blue-700 font-semibold block">
            Result-to-Acknowledgement Time
          </span>
        </div>

        {/* Card 3: Total Cases */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>จำนวนเคสวิกฤตวันนี้</span>
            <CheckCircle2 className="w-5 h-5 text-purple-600" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-black text-purple-700">{kpi?.total_today || 0}</span>
            <span className="text-xs text-slate-400">เคส (สะสมเดือนนี้ {kpi?.total_month || 0})</span>
          </div>
          <div className="text-xs text-slate-500 pt-1">
            รับทราบแล้ววันนี้: <b className="text-slate-800">{kpi?.acknowledged_count || 0}</b> เคส
          </div>
        </div>

        {/* Card 4: AMR Total Cases */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>เชื้อดื้อยา AMR สะสมเดือนนี้</span>
            <Dna className="w-5 h-5 text-rose-600" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-black text-rose-600">{kpi?.amr_total_count || 0}</span>
            <span className="text-xs font-bold text-slate-400">เคส</span>
          </div>
          <div className="text-[11px] text-slate-500 pt-1 flex items-center space-x-1">
            <ShieldCheck className="w-3.5 h-3.5 text-rose-500" />
            <span>เฝ้าระวังการระบาดในโรงพยาบาล</span>
          </div>
        </div>
      </div>

      {/* AMR Breakdown Section */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
        <div className="flex items-center space-x-2 text-slate-800">
          <Dna className="w-5 h-5 text-purple-600" />
          <h3 className="font-bold text-base">สถิติการตรวจพบเชื้อดื้อยาสำคัญทางคลินิก (AMR Surveillance Breakdown)</h3>
        </div>

        {amrKeys.length === 0 ? (
          <div className="bg-purple-50/50 border border-dashed border-purple-200 rounded-xl p-6 text-center text-xs text-purple-700">
            ยังไม่มีข้อมูลเคสเชื้อดื้อยาที่บันทึกในเดือนนี้
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {amrKeys.map((k) => (
              <div
                key={k}
                className="bg-purple-50 border border-purple-200 p-4 rounded-xl text-center space-y-1"
              >
                <span className="text-xs font-bold text-purple-900 block">{k}</span>
                <span className="text-2xl font-black text-purple-700">{amrBreakdown[k]}</span>
                <span className="text-[10px] text-purple-600 block">เคส</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Audit Trail Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 text-sm">ประวัติการแจ้งผลและบันทึกการตรวจสอบ (Audit Trail)</h3>
          <span className="text-xs text-slate-400">แสดงผล 100 รายการล่าสุด</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Lab No</th>
                <th className="px-4 py-3">HN</th>
                <th className="px-4 py-3">หอผู้ป่วย</th>
                <th className="px-4 py-3">สิ่งส่งตรวจ / ผลวิกฤต</th>
                <th className="px-4 py-3">เวลาออกผล</th>
                <th className="px-4 py-3">สถานะ</th>
                <th className="px-4 py-3">เวลารับทราบ</th>
                <th className="px-4 py-3">ผู้รับทราบ / ช่องทาง</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {alerts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                    ยังไม่มีข้อมูลรายการแจ้งเตือน
                  </td>
                </tr>
              ) : (
                alerts.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-slate-700">{a.specimen_no}</td>
                    <td className="px-4 py-3 font-mono text-slate-900">{a.hn}</td>
                    <td className="px-4 py-3 font-bold text-slate-800">{a.ward_name}</td>
                    <td className="px-4 py-3 max-w-xs">
                      <div className="font-medium text-slate-600">{a.specimen_type}</div>
                      <div className="text-red-600 font-semibold truncate">{a.findings_detail}</div>
                      {a.is_amr && (
                        <span className="inline-block mt-0.5 text-[10px] bg-purple-100 text-purple-800 px-1.5 py-0.2 rounded font-bold">
                          AMR: {a.amr_type}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {new Date(a.reported_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
                    </td>
                    <td className="px-4 py-3">
                      {a.status === 'ACKNOWLEDGED' && (
                        <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                          รับทราบแล้ว
                        </span>
                      )}
                      {a.status === 'MANUAL_CALLED' && (
                        <span className="bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full">
                          โทรแจ้งแล้ว
                        </span>
                      )}
                      {a.status === 'ESCALATED' && (
                        <span className="bg-red-100 text-red-800 font-bold px-2 py-0.5 rounded-full animate-pulse">
                          Escalated
                        </span>
                      )}
                      {(a.status === 'PENDING' || a.status === 'SENT') && (
                        <span className="bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">
                          รอรับทราบ
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {a.acknowledged_at
                        ? `${new Date(a.acknowledged_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.`
                        : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">{a.acknowledged_by_name || '-'}</div>
                      {a.acknowledged_channel && (
                        <div className="text-[10px] text-slate-400">{a.acknowledged_channel}</div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
