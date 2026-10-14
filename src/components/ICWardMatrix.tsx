'use client';

import React from 'react';
import { Building2, AlertTriangle, ShieldCheck, CheckCircle2, ChevronRight } from 'lucide-react';

export interface WardRiskSummary {
  ward: string;
  totalAlerts: number;
  amrCount: number;
  crabCount: number;
  creCount: number;
  mrsaCount: number;
  vreCount: number;
  esblCount: number;
  otherAmrCount: number;
  isCluster: boolean; // >= 2 cases of MDRO
}

interface ICWardMatrixProps {
  wardSummaries: WardRiskSummary[];
  selectedWard: string;
  onSelectWard: (ward: string) => void;
}

export default function ICWardMatrix({
  wardSummaries,
  selectedWard,
  onSelectWard,
}: ICWardMatrixProps) {
  if (wardSummaries.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-6 border border-slate-200 text-center text-slate-400 text-xs">
        ยังไม่มีข้อมูลหอผู้ป่วยในช่วงเวลานี้
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h3 className="font-bold text-slate-900 text-sm md:text-base flex items-center space-x-2">
            <Building2 className="w-5 h-5 text-indigo-600" />
            <span>แผนผังสถานะความเสี่ยงรายหอผู้ป่วย (IC Ward Risk Matrix)</span>
          </h3>
          <p className="text-xs text-slate-500">
            คลิกที่การ์ดหอผู้ป่วยเพื่อกรองดูเฉพาะผู้ป่วยในวอร์ดนั้นทันที
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center space-x-3 text-xs font-semibold">
          <span className="inline-flex items-center space-x-1 text-rose-700">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-pulse inline-block" />
            <span>เฝ้าระวัง Cluster (≥2 เคส)</span>
          </span>
          <span className="inline-flex items-center space-x-1 text-amber-700">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
            <span>มีเคสแยกโรค (1 เคส)</span>
          </span>
          <span className="inline-flex items-center space-x-1 text-emerald-700">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
            <span>ไม่มีเชื้อดื้อยา</span>
          </span>
        </div>
      </div>

      {/* Grid of Ward Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
        {wardSummaries.map((w) => {
          const isSelected = selectedWard === w.ward;
          const isHighRisk = w.isCluster;
          const isModerateRisk = !isHighRisk && w.amrCount > 0;
          const isSafe = w.amrCount === 0;

          let cardBorder = 'border-slate-200 hover:border-slate-300';
          let cardBg = 'bg-white';
          let badgeBg = 'bg-slate-100 text-slate-700';

          if (isHighRisk) {
            cardBorder = isSelected
              ? 'border-rose-600 ring-2 ring-rose-500 shadow-md'
              : 'border-rose-300 hover:border-rose-500';
            cardBg = 'bg-gradient-to-br from-white via-rose-50/30 to-rose-100/40';
            badgeBg = 'bg-rose-100 text-rose-800 border-rose-300';
          } else if (isModerateRisk) {
            cardBorder = isSelected
              ? 'border-amber-500 ring-2 ring-amber-400 shadow-md'
              : 'border-amber-200 hover:border-amber-400';
            cardBg = 'bg-gradient-to-br from-white via-amber-50/20 to-amber-100/30';
            badgeBg = 'bg-amber-100 text-amber-800 border-amber-300';
          } else if (isSafe) {
            cardBorder = isSelected
              ? 'border-emerald-500 ring-2 ring-emerald-400 shadow-md'
              : 'border-emerald-200 hover:border-emerald-300';
            cardBg = 'bg-gradient-to-br from-white via-emerald-50/10 to-emerald-100/20';
            badgeBg = 'bg-emerald-100 text-emerald-800 border-emerald-300';
          }

          return (
            <div
              key={w.ward}
              onClick={() => onSelectWard(isSelected ? 'ALL' : w.ward)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-sm relative overflow-hidden flex flex-col justify-between ${cardBorder} ${cardBg}`}
            >
              {/* Top Row: Ward Name & Cluster Badge */}
              <div className="flex items-start justify-between gap-2">
                <div className="truncate">
                  <h4 className="font-black text-slate-900 text-sm truncate" title={w.ward}>
                    {w.ward}
                  </h4>
                  <span className="text-[11px] text-slate-500 font-medium">
                    แจ้งเตือนรวม {w.totalAlerts} เคส
                  </span>
                </div>

                {isHighRisk ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-red-100 text-red-800 border border-red-300 shrink-0 animate-pulse">
                    🚨 Cluster ({w.amrCount})
                  </span>
                ) : isModerateRisk ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 shrink-0">
                    ⚠️ แยกโรค (1)
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                    🟢 ปกติ
                  </span>
                )}
              </div>

              {/* Middle Row: MDRO Breakdown Badges */}
              <div className="mt-3 pt-2.5 border-t border-slate-100/80 flex flex-wrap gap-1 text-[10px]">
                {w.crabCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-800 font-bold border border-red-200">
                    CRAB: {w.crabCount}
                  </span>
                )}
                {w.creCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded bg-orange-100 text-orange-800 font-bold border border-orange-200">
                    CRE: {w.creCount}
                  </span>
                )}
                {w.mrsaCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 font-bold border border-purple-200">
                    MRSA: {w.mrsaCount}
                  </span>
                )}
                {w.vreCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded bg-violet-100 text-violet-800 font-bold border border-violet-200">
                    VRE: {w.vreCount}
                  </span>
                )}
                {w.esblCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded bg-sky-100 text-sky-800 font-bold border border-sky-200">
                    ESBL: {w.esblCount}
                  </span>
                )}
                {w.amrCount === 0 && (
                  <span className="text-slate-400 italic">ผลวิกฤตทั่วไป (ไม่มี AMR)</span>
                )}
              </div>

              {/* Bottom Row: Action Prompt */}
              <div className="mt-3 flex items-center justify-between text-[11px] font-bold">
                <span className={isSelected ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}>
                  {isSelected ? '✓ กำลังกรองวอร์ดนี้' : 'คลิกเพื่อดูเคส'}
                </span>
                <ChevronRight className={`w-3.5 h-3.5 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
