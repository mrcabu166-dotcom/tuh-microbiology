'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Activity,
  BarChart3,
  Calendar,
  TrendingUp,
  AlertTriangle,
  Dna,
  ShieldCheck,
  Download,
  RefreshCw,
  Search,
  Building2,
  Filter,
  Clock,
  Send,
  Eye,
  X,
  CheckCircle2,
  FileSpreadsheet,
  Layers,
  Info,
  Stethoscope,
  Printer,
  HeartPulse,
} from 'lucide-react';
import TelegramImportModal from '@/components/TelegramImportModal';
import SendAlertModal from '@/components/SendAlertModal';
import ICWardMatrix, { WardRiskSummary } from '@/components/ICWardMatrix';
import ICPrintSheet from '@/components/ICPrintSheet';

interface MicrobiologyAlert {
  id: number;
  alert_date: string;
  hn: string;
  patient_name: string | null;
  ward: string;
  specimen: string;
  organism: string;
  resistance_type: string | null;
  is_amr: boolean;
  findings_detail: string;
  raw_message?: string;
}

interface SummaryData {
  total_alerts: number;
  amr_count: number;
  amr_percentage: number;
  sterile_count: number;
}

interface TopItem {
  organism?: string;
  ward?: string;
  count: number;
  percentage: number;
}

interface ResistanceItem {
  type: string;
  count: number;
}

interface TrendPoint {
  label: string;
  total: number;
  amr: number;
}

export default function Home() {
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [summary, setSummary] = useState<SummaryData>({
    total_alerts: 0,
    amr_count: 0,
    amr_percentage: 0,
    sterile_count: 0,
  });
  const [topOrganisms, setTopOrganisms] = useState<TopItem[]>([]);
  const [topWards, setTopWards] = useState<TopItem[]>([]);
  const [resistanceBreakdown, setResistanceBreakdown] = useState<ResistanceItem[]>([]);
  const [trendTimeline, setTrendTimeline] = useState<TrendPoint[]>([]);
  const [alerts, setAlerts] = useState<MicrobiologyAlert[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [currentTime, setCurrentTime] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [resistanceFilter, setResistanceFilter] = useState('ALL');
  const [wardFilter, setWardFilter] = useState('ALL');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [isPrintSheetOpen, setIsPrintSheetOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'CLINICAL' | 'IC_SURVEILLANCE'>('CLINICAL');
  const [selectedRawAlert, setSelectedRawAlert] = useState<MicrobiologyAlert | null>(null);
  const [notificationToast, setNotificationToast] = useState<{
    type: 'success' | 'info' | 'error';
    message: string;
  } | null>(null);

  // Live clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('th-TH', {
          timeZone: 'Asia/Bangkok',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch summary data
  const loadSummaryData = useCallback(async (selectedPeriod: 'daily' | 'weekly' | 'monthly') => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/summary?period=${selectedPeriod}`);
      const data = await res.json();

      if (data.success) {
        setSummary(data.summary || { total_alerts: 0, amr_count: 0, amr_percentage: 0, sterile_count: 0 });
        setTopOrganisms(data.top_organisms || []);
        setTopWards(data.top_wards || []);
        setResistanceBreakdown(data.resistance_breakdown || []);
        setTrendTimeline(data.trend_timeline || []);
        setAlerts(data.alerts || []);
      }
    } catch (err) {
      console.error('Failed to load summary dashboard:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial & period-change load
  useEffect(() => {
    loadSummaryData(period);
  }, [period, loadSummaryData]);

  // Periodic polling every 15s
  useEffect(() => {
    const interval = setInterval(() => {
      loadSummaryData(period);
    }, 15000);
    return () => clearInterval(interval);
  }, [period, loadSummaryData]);

  // Sync with Telegram getUpdates
  const handleSyncTelegram = async () => {
    setIsSyncing(true);
    setNotificationToast({ type: 'info', message: 'กำลังเชื่อมต่อ Telegram Group LABALEARTTUH เพื่อดึงข้อความใหม่...' });
    try {
      const res = await fetch('/api/telegram/sync');
      const data = await res.json();
      if (data.success) {
        const count = data.ingested_count || 0;
        setNotificationToast({
          type: 'success',
          message: count > 0 
            ? `ดึงข้อมูลสำเร็จ! พบข้อความแจ้งเตือนใหม่ ${count} รายการ` 
            : 'เชื่อมต่อสำเร็จ: ข้อมูลแจ้งเตือนในกลุ่ม LABALEARTTUH อัปเดตล่าสุดแล้ว',
        });
        loadSummaryData(period);
      } else {
        setNotificationToast({ type: 'error', message: data.error || 'ไม่สามารถดึงข้อมูลจาก Telegram ได้' });
      }
    } catch (err: any) {
      setNotificationToast({ type: 'error', message: err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ' });
    } finally {
      setIsSyncing(false);
      setTimeout(() => setNotificationToast(null), 5000);
    }
  };

  // Filtered alert list
  const filteredAlerts = useMemo(() => {
    return alerts.filter((item) => {
      // Search match
      const query = searchQuery.trim().toLowerCase();
      const matchSearch =
        !query ||
        item.hn.toLowerCase().includes(query) ||
        (item.patient_name && item.patient_name.toLowerCase().includes(query)) ||
        item.ward.toLowerCase().includes(query) ||
        item.organism.toLowerCase().includes(query) ||
        item.specimen.toLowerCase().includes(query) ||
        (item.resistance_type && item.resistance_type.toLowerCase().includes(query));

      // Resistance filter
      let matchResistance = true;
      if (resistanceFilter === 'AMR_ONLY') {
        matchResistance = item.is_amr;
      } else if (resistanceFilter === 'NON_AMR') {
        matchResistance = !item.is_amr;
      } else if (resistanceFilter !== 'ALL') {
        matchResistance = item.resistance_type === resistanceFilter;
      }

      // Ward filter
      const matchWard = wardFilter === 'ALL' || item.ward === wardFilter;

      return matchSearch && matchResistance && matchWard;
    });
  }, [alerts, searchQuery, resistanceFilter, wardFilter]);

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredAlerts.length === 0) {
      alert('ไม่มีข้อมูลสำหรับส่งออก');
      return;
    }

    const headers = [
      'ลำดับ',
      'วัน-เวลาที่แจ้งเตือน',
      'HN (ไม่ปิดบัง)',
      'ชื่อผู้ป่วย',
      'หอผู้ป่วย (Ward)',
      'สิ่งส่งตรวจ (Specimen)',
      'เชื้อที่ตรวจพบ (Organism)',
      'การดื้อยา (Resistance)',
      'สถานะ AMR',
      'รายละเอียดผลตรวจ (Findings)',
    ];

    const rows = filteredAlerts.map((a, idx) => [
      idx + 1,
      `"${new Date(a.alert_date).toLocaleString('th-TH')}"`,
      `"${a.hn}"`,
      `"${a.patient_name || '-'}"`,
      `"${a.ward}"`,
      `"${a.specimen}"`,
      `"${a.organism}"`,
      `"${a.resistance_type || 'ทั่วไป (Non-MDRO)'}"`,
      a.is_amr ? 'เชื้อดื้อยา (AMR)' : 'ผลวิกฤตทั่วไป',
      `"${(a.findings_detail || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `microbiology_alerts_${period}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Distinct wards for filtering
  const distinctWards = useMemo(() => {
    const set = new Set(alerts.map((a) => a.ward).filter(Boolean));
    return Array.from(set).sort();
  }, [alerts]);

  // 1. Detect Outbreak / Clusters (>= 2 cases of same MDRO in same ward)
  const clusterAlerts = useMemo(() => {
    const wardMap = new Map<string, Map<string, number>>();
    alerts.forEach((a) => {
      if (a.is_amr && a.resistance_type) {
        if (!wardMap.has(a.ward)) {
          wardMap.set(a.ward, new Map());
        }
        const resMap = wardMap.get(a.ward)!;
        resMap.set(a.resistance_type, (resMap.get(a.resistance_type) || 0) + 1);
      }
    });

    const clusters: { ward: string; resistance_type: string; count: number }[] = [];
    wardMap.forEach((resMap, ward) => {
      resMap.forEach((count, resType) => {
        if (count >= 2) {
          clusters.push({ ward, resistance_type: resType, count });
        }
      });
    });
    return clusters;
  }, [alerts]);

  // 2. Compute Ward Risk Summary for IC Ward Matrix
  const wardSummaries: WardRiskSummary[] = useMemo(() => {
    const map = new Map<string, WardRiskSummary>();

    // Baseline priority wards
    const baseWards = ['MICU', 'SICU', 'ANICU', 'ICU CVT', 'อายุรกรรมกิตติวัฒนา 2', 'ศัลยกรรมอุบัติเหตุ 1'];
    baseWards.forEach((bw) => {
      map.set(bw, {
        ward: bw,
        totalAlerts: 0,
        amrCount: 0,
        crabCount: 0,
        creCount: 0,
        mrsaCount: 0,
        vreCount: 0,
        esblCount: 0,
        otherAmrCount: 0,
        isCluster: false,
      });
    });

    alerts.forEach((a) => {
      if (!map.has(a.ward)) {
        map.set(a.ward, {
          ward: a.ward,
          totalAlerts: 0,
          amrCount: 0,
          crabCount: 0,
          creCount: 0,
          mrsaCount: 0,
          vreCount: 0,
          esblCount: 0,
          otherAmrCount: 0,
          isCluster: false,
        });
      }
      const item = map.get(a.ward)!;
      item.totalAlerts += 1;
      if (a.is_amr) {
        item.amrCount += 1;
        const upper = (a.resistance_type || '').toUpperCase();
        if (upper.includes('CRAB')) item.crabCount += 1;
        else if (upper.includes('CRE')) item.creCount += 1;
        else if (upper.includes('MRSA')) item.mrsaCount += 1;
        else if (upper.includes('VRE')) item.vreCount += 1;
        else if (upper.includes('ESBL')) item.esblCount += 1;
        else item.otherAmrCount += 1;
      }
    });

    return Array.from(map.values())
      .map((item) => ({
        ...item,
        isCluster: item.amrCount >= 2,
      }))
      .sort((a, b) => b.amrCount - a.amrCount || b.totalAlerts - a.totalAlerts);
  }, [alerts]);

  // 3. Compute Bacteremia & CSF critical alerts for Clinical Mode
  const bacteremiaAlerts = useMemo(() => {
    return alerts.filter(
      (a) =>
        a.specimen.toLowerCase().includes('hemo') ||
        a.specimen.toLowerCase().includes('csf') ||
        a.specimen.toLowerCase().includes('เลือด') ||
        a.findings_detail?.toLowerCase().includes('bacteremia')
    );
  }, [alerts]);

  // 4. Helper for Clinical / IC Action recommendations
  const getClinicalActionBadge = (alert: MicrobiologyAlert) => {
    const isHemoOrCsf =
      alert.specimen.toLowerCase().includes('hemo') ||
      alert.specimen.toLowerCase().includes('csf') ||
      alert.specimen.toLowerCase().includes('เลือด');

    if (alert.resistance_type?.includes('CRAB') || alert.resistance_type?.includes('CRE')) {
      return (
        <div className="space-y-0.5">
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-black bg-red-100 text-red-900 border border-red-300">
            🛡️ Contact (แยกห้อง/กาวน์+ถุงมือ)
          </span>
          <span className="block text-[10px] text-red-700 font-medium">งดใช้อุปกรณ์ปนกัน • แนะนำ Cohorting</span>
        </div>
      );
    }
    if (alert.resistance_type?.includes('MRSA') || alert.resistance_type?.includes('VRE')) {
      return (
        <div className="space-y-0.5">
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-black bg-purple-100 text-purple-900 border border-purple-300">
            🛡️ Contact (ล้างมือ 5 Moments)
          </span>
          <span className="block text-[10px] text-purple-700 font-medium">แยกผ้า/อุปกรณ์ • ปรึกษาแพทย์ ID</span>
        </div>
      );
    }
    if (alert.resistance_type?.includes('ESBL')) {
      return (
        <div className="space-y-0.5">
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-sky-100 text-sky-900 border border-sky-300">
            🔵 Standard + ระวังสารคัดหลั่ง
          </span>
          <span className="block text-[10px] text-sky-700 font-medium">ระวังสายสวนปัสสาวะ/ท่อช่วยหายใจ</span>
        </div>
      );
    }
    if (isHemoOrCsf) {
      return (
        <div className="space-y-0.5">
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-black bg-rose-100 text-rose-900 border border-rose-300 animate-pulse">
            🩸 เลือด/CSF วิกฤต (ด่วนที่สุด)
          </span>
          <span className="block text-[10px] text-rose-700 font-medium">รายงานแพทย์เวร • ปรับยาตาม AST</span>
        </div>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
        Standard Precautions
      </span>
    );
  };

  // Helper for resistance tag badge style
  const getResistanceBadge = (resType: string | null, isAmr: boolean) => {
    if (!isAmr && !resType) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
          ทั่วไป (Non-MDRO)
        </span>
      );
    }
    const upper = (resType || '').toUpperCase();
    if (upper.includes('CRAB')) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-black bg-red-100 text-red-800 border border-red-300 animate-pulse">
          🚨 CRAB
        </span>
      );
    }
    if (upper.includes('CRE')) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-black bg-orange-100 text-orange-800 border border-orange-300">
          ⚠️ CRE
        </span>
      );
    }
    if (upper.includes('MRSA')) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-black bg-purple-100 text-purple-800 border border-purple-300">
          🧬 MRSA
        </span>
      );
    }
    if (upper.includes('VRE')) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-black bg-violet-100 text-violet-800 border border-violet-300">
          🧬 VRE
        </span>
      );
    }
    if (upper.includes('ESBL')) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-black bg-sky-100 text-sky-800 border border-sky-300">
          ESBL
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
        {resType || 'AMR'}
      </span>
    );
  };

  const periodLabel = {
    daily: 'รายวัน (วันนี้)',
    weekly: 'รายสัปดาห์ (7 วันย้อนหลัง)',
    monthly: 'รายเดือน (30 วันย้อนหลัง)',
  }[period];

  const maxTimelineTotal = Math.max(...trendTimeline.map((t) => t.total), 1);

  return (
    <div className="min-h-screen bg-slate-50/80 text-slate-800 flex flex-col font-sans">
      {/* Toast Notification */}
      {notificationToast && (
        <div
          className={`fixed top-4 right-4 z-50 p-4 rounded-xl shadow-xl flex items-center space-x-3 text-sm font-semibold transition-all duration-300 ${
            notificationToast.type === 'success'
              ? 'bg-emerald-600 text-white'
              : notificationToast.type === 'error'
              ? 'bg-red-600 text-white'
              : 'bg-blue-600 text-white'
          }`}
        >
          {notificationToast.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-white" />
          ) : (
            <Info className="w-5 h-5 text-white" />
          )}
          <span>{notificationToast.message}</span>
          <button
            onClick={() => setNotificationToast(null)}
            className="ml-2 text-white/80 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm backdrop-blur-md bg-white/95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            {/* Logo & Info */}
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-tr from-blue-700 via-indigo-600 to-sky-500 p-2.5 rounded-xl shadow-md text-white">
                <Dna className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h1 className="text-xl font-black tracking-tight text-slate-900">
                    LABALEARTTUH Surveillance Dashboard
                  </h1>
                  <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    🟢 ดึงข้อมูลจาก Telegram LABALEARTTUH
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  ระบบสรุปการแจ้งเตือนผลตรวจวิกฤตและเชื้อดื้อยา AMR • รพ.ธรรมศาสตร์เฉลิมพระเกียรติ (ไม่ปิดบังข้อมูล)
                </p>
              </div>
            </div>

            {/* Actions & Live Clock */}
            <div className="flex items-center flex-wrap gap-2">
              <div className="hidden lg:flex items-center space-x-1 px-3 py-1.5 bg-slate-100 rounded-lg text-xs font-mono text-slate-700 border border-slate-200">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span>{currentTime || '00:00:00'} BKK</span>
              </div>

              {/* Send Alert & Save Button */}
              <button
                onClick={() => setIsSendModalOpen(true)}
                title="ออกผลแจ้งเตือนและส่งเข้ากลุ่ม Telegram LABALEARTTUH พร้อมบันทึกลง Dashboard"
                className="px-3.5 py-2 bg-gradient-to-r from-red-600 via-rose-600 to-rose-700 hover:from-red-700 hover:to-rose-800 text-white rounded-xl text-xs font-black shadow-md flex items-center space-x-1.5 transition-all"
              >
                <Send className="w-3.5 h-3.5 text-white" />
                <span>🚨 ออกผลแจ้งเตือนใหม่ (Send Alert)</span>
              </button>

              {/* Sync Telegram Button */}
              <button
                onClick={handleSyncTelegram}
                disabled={isSyncing}
                title="ดึงข้อความแจ้งเตือนใหม่จากกลุ่ม Telegram LABALEARTTUH อัตโนมัติ"
                className="px-3.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-60 text-white rounded-xl text-xs font-bold shadow-sm flex items-center space-x-1.5 transition-all"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'กำลังดึงข้อมูล...' : 'ดึงข้อมูลสดจาก Telegram'}</span>
              </button>

              {/* Print IC Round Sheet */}
              <button
                onClick={() => setIsPrintSheetOpen(true)}
                title="พิมพ์ใบรายงานเฝ้าระวังเชื้อดื้อยา IC ประจำวัน สำหรับราวน์วอร์ด"
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm flex items-center space-x-1.5 transition-all"
              >
                <Printer className="w-3.5 h-3.5 text-white" />
                <span>🖨️ พิมพ์ใบราวน์ IC</span>
              </button>

              {/* Manual Paste/Import Modal */}
              <button
                onClick={() => setIsImportModalOpen(true)}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold border border-slate-300 flex items-center space-x-1.5 transition-colors"
              >
                <Send className="w-3.5 h-3.5 text-blue-600" />
                <span>นำเข้าข้อความ</span>
              </button>

              {/* Export CSV */}
              <button
                onClick={handleExportCSV}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold border border-slate-300 flex items-center space-x-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-emerald-600" />
                <span>ส่งออก CSV</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Sub-header / Period & View Mode Controls */}
      <div className="bg-slate-900 text-white border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2 text-xs font-medium text-slate-400 mb-1">
                <span>ช่วงเวลาการวิเคราะห์:</span>
                <span className="text-white font-bold bg-slate-800 px-2.5 py-0.5 rounded-full border border-slate-700">
                  {periodLabel}
                </span>
                <span className="text-emerald-400 font-semibold">• อัปเดตข้อมูลอัตโนมัติทุก 15 วินาที</span>
              </div>
              <h2 className="text-lg md:text-xl font-bold tracking-tight text-white flex items-center space-x-2">
                <span>แดชบอร์ดสรุปผลการแจ้งเตือนทางห้องปฏิบัติการจุลชีววิทยา</span>
              </h2>
            </div>

            {/* Controls: Mode Toggle & Period Toggle */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Doctor / IC View Switcher */}
              <div className="inline-flex p-1 bg-slate-800/90 rounded-2xl border border-slate-700 shadow-inner">
                <button
                  onClick={() => setViewMode('CLINICAL')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all ${
                    viewMode === 'CLINICAL'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                  }`}
                >
                  <Stethoscope className="w-4 h-4 text-sky-300" />
                  <span>🩺 โหมดแพทย์ (Clinical)</span>
                </button>
                <button
                  onClick={() => setViewMode('IC_SURVEILLANCE')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all ${
                    viewMode === 'IC_SURVEILLANCE'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4 text-indigo-300" />
                  <span>🛡️ โหมดพยาบาล IC (Surveillance)</span>
                </button>
              </div>

              {/* Period Toggle Tabs */}
              <div className="inline-flex p-1 bg-slate-800/90 rounded-2xl border border-slate-700 shadow-inner">
                <button
                  onClick={() => setPeriod('daily')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all ${
                    period === 'daily'
                      ? 'bg-slate-700 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>รายวัน</span>
                </button>

                <button
                  onClick={() => setPeriod('weekly')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all ${
                    period === 'weekly'
                      ? 'bg-slate-700 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span>รายสัปดาห์</span>
                </button>

                <button
                  onClick={() => setPeriod('monthly')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all ${
                    period === 'monthly'
                      ? 'bg-slate-700 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>รายเดือน</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 flex-1 w-full">
        {/* Notice of Unmasked Data Guarantee */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-900 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-blue-700 shrink-0" />
            <span>
              <strong>โหมดแสดงข้อมูลฉบับเต็ม (Unmasked Data):</strong> แสดงเลข HN และชื่อ-สกุลผู้ป่วยครบถ้วนทุกรายการจากกลุ่ม ID LABALEARTTUH เพื่อประโยชน์ในการติดตามผลการรักษาและเฝ้าระวังทางระบาดวิทยา
            </span>
          </div>
          <span className="font-mono text-[11px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded border border-blue-300 shrink-0 hidden sm:inline">
            Group ID: -1003285766063
          </span>
        </div>

        {/* Outbreak Cluster Alert Banner (≥ 2 cases of same MDRO in same ward) */}
        {clusterAlerts.length > 0 && (
          <div className="bg-gradient-to-r from-red-600 via-rose-600 to-rose-700 text-white rounded-2xl p-4 sm:p-5 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-rose-400 animate-in fade-in">
            <div className="flex items-start space-x-3.5">
              <div className="p-2.5 bg-white/20 rounded-xl shrink-0 mt-0.5 backdrop-blur-sm">
                <AlertTriangle className="w-6 h-6 text-yellow-300 animate-bounce" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center space-x-2 flex-wrap">
                  <span className="font-black text-sm sm:text-base tracking-wide uppercase bg-black/20 px-2.5 py-0.5 rounded">
                    ⚠️ สัญญาณเตือนคลัสเตอร์ระบาด (Outbreak Cluster Detected)
                  </span>
                  <span className="text-xs bg-yellow-300 text-red-950 font-black px-2.5 py-0.5 rounded-full">
                    พบ {clusterAlerts.length} วอร์ดที่มีเชื้อดื้อยาซ้ำ ≥ 2 ราย
                  </span>
                </div>
                <div className="text-xs sm:text-sm text-rose-100 font-medium leading-relaxed pt-0.5">
                  {clusterAlerts.map((c, i) => (
                    <span key={i} className="inline-block mr-3 bg-red-800/60 px-2 py-0.5 rounded border border-rose-400/40 my-0.5">
                      📍 <strong>{c.ward}</strong>: พบเชื้อ <strong>{c.resistance_type}</strong> จำนวน <strong>{c.count} ราย</strong>
                    </span>
                  ))}
                </div>
                <p className="text-xs text-rose-200 pt-0.5">
                  🛡️ <strong>คำแนะนำ IC:</strong> แยกห้องเดี่ยวหรือจัดกลุ่มผู้ป่วย (Cohort isolation), บังคับใช้ Contact Precautions อย่างเคร่งครัด (สวมกาวน์+ถุงมือ), เน้นย้ำ Hand Hygiene 5 Moments, และตรวจสอบการทำความสะอาดพื้นผิวสัมผัสร่วม
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2 shrink-0 self-end md:self-center">
              <button
                onClick={() => setIsPrintSheetOpen(true)}
                className="px-4 py-2 bg-white text-rose-800 hover:bg-rose-50 rounded-xl text-xs font-black shadow transition-all flex items-center space-x-1.5"
              >
                <Printer className="w-4 h-4 text-rose-700" />
                <span>พิมพ์ใบราวน์ IC ทันที</span>
              </button>
            </div>
          </div>
        )}

        {/* View Mode Specific Section */}
        {viewMode === 'IC_SURVEILLANCE' ? (
          /* IC Surveillance Mode: Ward Risk Matrix */
          <div className="bg-slate-50 border border-indigo-100 rounded-2xl p-5 shadow-sm space-y-4">
            <ICWardMatrix
              wardSummaries={wardSummaries}
              selectedWard={wardFilter}
              onSelectWard={setWardFilter}
            />
          </div>
        ) : (
          /* Clinical Doctor Mode: Urgent Bacteremia & CSF Surveillance */
          <div className="bg-white rounded-2xl p-5 border border-rose-200 shadow-sm space-y-3 bg-gradient-to-br from-white via-rose-50/20 to-rose-100/30">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-rose-100 gap-2">
              <div>
                <h3 className="font-black text-rose-950 text-sm md:text-base flex items-center space-x-2">
                  <HeartPulse className="w-5 h-5 text-rose-600 animate-pulse" />
                  <span>🩸 ผลเพาะเชื้อสิ่งส่งตรวจปลอดเชื้อวิกฤต (Bacteremia / Fungemia / CSF Surveillance)</span>
                </h3>
                <p className="text-xs text-rose-700/90 mt-0.5">
                  สำหรับแพทย์: รายการติดเชื้อในกระแสเลือดและระบบประสาทที่ต้องปรับยาปฏิชีวนะตามผลความไวของเชื้อด่วน
                </p>
              </div>
              <span className="px-3 py-1 bg-rose-100 text-rose-900 rounded-full text-xs font-black border border-rose-300 shrink-0 self-start sm:self-auto">
                พบวิกฤต {bacteremiaAlerts.length} รายการ
              </span>
            </div>

            {bacteremiaAlerts.length === 0 ? (
              <div className="py-6 text-center text-slate-400 text-xs flex items-center justify-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>ไม่พบผลเพาะเชื้อเลือดหรือ CSF วิกฤตในช่วงเวลานี้</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
                {bacteremiaAlerts.slice(0, 6).map((bAlert) => (
                  <div
                    key={bAlert.id}
                    className="p-3.5 bg-white rounded-xl border border-rose-200 shadow-sm hover:border-rose-400 hover:shadow-md transition-all space-y-2 relative"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-black text-xs text-slate-900 bg-rose-50 text-rose-900 px-2 py-0.5 rounded border border-rose-200">
                        HN: {bAlert.hn}
                      </span>
                      <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                        {bAlert.ward}
                      </span>
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 text-xs truncate">
                        {bAlert.patient_name || 'ไม่ระบุชื่อ'}
                      </div>
                      <div className="text-xs font-black text-rose-700 italic truncate mt-0.5">
                        🔬 {bAlert.organism}
                      </div>
                    </div>
                    <div className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded border border-slate-100 line-clamp-2">
                      {bAlert.findings_detail}
                    </div>
                    <div className="pt-1 flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-rose-800">
                        {bAlert.specimen}
                      </span>
                      <button
                        onClick={() => setSelectedRawAlert(bAlert)}
                        className="text-blue-600 hover:underline font-bold text-[11px]"
                      >
                        ดูผลเต็ม →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 1. Summary KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Alerts */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                การแจ้งเตือนทั้งหมด
              </span>
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <Activity className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-3xl font-black text-slate-900 tracking-tight">
                {isLoading ? '...' : summary.total_alerts.toLocaleString()}
              </div>
              <div className="text-xs text-slate-500 mt-1 flex items-center space-x-1">
                <span>บันทึกแจ้งเตือนในช่วง {periodLabel}</span>
              </div>
            </div>
          </div>

          {/* AMR Count & Rate */}
          <div className="bg-white rounded-2xl p-5 border border-rose-200 shadow-sm relative overflow-hidden flex flex-col justify-between bg-gradient-to-br from-white via-rose-50/20 to-rose-100/30">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-700">
                เชื้อดื้อยาปฏิชีวนะ (AMR)
              </span>
              <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="flex items-baseline space-x-2">
                <span className="text-3xl font-black text-rose-700 tracking-tight">
                  {isLoading ? '...' : summary.amr_count.toLocaleString()}
                </span>
                <span className="text-xs font-bold text-rose-600">
                  ({isLoading ? '...' : `${summary.amr_percentage}%`})
                </span>
              </div>
              <div className="text-xs text-rose-800/80 mt-1 flex items-center space-x-1 font-medium">
                <span>เคสที่ต้องควบคุมและเฝ้าระวังพิเศษ</span>
              </div>
            </div>
          </div>

          {/* Sterile Site / Blood Culture */}
          <div className="bg-white rounded-2xl p-5 border border-amber-200 shadow-sm relative overflow-hidden flex flex-col justify-between bg-gradient-to-br from-white via-amber-50/20 to-amber-100/30">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-700">
                สิ่งส่งตรวจวิกฤต / ปลอดเชื้อ
              </span>
              <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                <Dna className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-3xl font-black text-amber-900 tracking-tight">
                {isLoading ? '...' : summary.sterile_count.toLocaleString()}
              </div>
              <div className="text-xs text-amber-800/80 mt-1">
                <span>Hemoculture, CSF & สิ่งคัดหลั่งปลอดเชื้อ</span>
              </div>
            </div>
          </div>

          {/* Top Ward */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                หอผู้ป่วยที่พบสูงสุด
              </span>
              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                <Building2 className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-xl font-black text-slate-900 truncate" title={topWards[0]?.ward || 'ไม่มีข้อมูล'}>
                {isLoading ? '...' : topWards[0]?.ward || '-'}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {topWards[0] ? `พบการแจ้งเตือน ${topWards[0].count} รายการ (${topWards[0].percentage}%)` : 'ยังไม่มีข้อมูลในช่วงเวลานี้'}
              </div>
            </div>
          </div>
        </div>

        {/* 2. Visual Analytics Section (Trends, Resistance Distribution, Top Organisms, Top Wards) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Trend Chart (Left 2 Columns) */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-100 gap-2">
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center space-x-2">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                  <span>แนวโน้มการแจ้งเตือนตามช่วงเวลา ({periodLabel})</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  เปรียบเทียบจำนวนการแจ้งเตือนผลตรวจวิกฤตทั้งหมด (สีน้ำเงิน) กับเชื้อดื้อยา AMR (สีแดง)
                </p>
              </div>
              <div className="flex items-center space-x-3 text-xs font-bold">
                <span className="inline-flex items-center space-x-1 text-blue-600">
                  <span className="w-3 h-3 rounded-full bg-blue-500 inline-block"></span>
                  <span>ทั้งหมด</span>
                </span>
                <span className="inline-flex items-center space-x-1 text-rose-600">
                  <span className="w-3 h-3 rounded-full bg-rose-500 inline-block"></span>
                  <span>เชื้อดื้อยา AMR</span>
                </span>
              </div>
            </div>

            {/* Timeline Visual Histogram */}
            {trendTimeline.length === 0 ? (
              <div className="h-56 flex flex-col items-center justify-center text-slate-400 text-xs">
                <span>ไม่มีข้อมูลการแจ้งเตือนในช่วงเวลานี้</span>
              </div>
            ) : (
              <div className="h-60 pt-6 pb-2 flex items-end justify-between gap-2 overflow-x-auto">
                {trendTimeline.map((item, idx) => {
                  const totalHeightPct = Math.max(Math.round((item.total / maxTimelineTotal) * 100), 12);
                  const amrHeightPct = Math.round((item.amr / maxTimelineTotal) * 100);

                  return (
                    <div key={idx} className="flex-1 min-w-[36px] flex flex-col items-center group relative">
                      {/* Tooltip on Hover */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-12 bg-slate-900 text-white text-[11px] rounded-lg px-2.5 py-1 pointer-events-none z-20 shadow-lg whitespace-nowrap">
                        <span className="font-bold">{item.label}</span>: รวม {item.total} (AMR {item.amr})
                      </div>

                      {/* Stacked / Dual Bar */}
                      <div className="w-full max-w-[28px] h-44 bg-slate-100 rounded-t-lg flex flex-col justify-end p-0.5 relative">
                        {/* Total Bar */}
                        <div
                          style={{ height: `${totalHeightPct}%` }}
                          className="w-full bg-blue-500 rounded-t transition-all relative flex flex-col justify-end overflow-hidden"
                        >
                          {/* AMR Fill inside bar */}
                          {item.amr > 0 && (
                            <div
                              style={{ height: `${(item.amr / item.total) * 100}%` }}
                              className="w-full bg-rose-500"
                            />
                          )}
                        </div>
                      </div>

                      {/* X-axis Label */}
                      <span className="text-[10px] font-semibold text-slate-500 mt-2 truncate max-w-[45px] text-center">
                        {item.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Resistance Type Breakdown (Right 1 Column) */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                <span>สัดส่วนเชื้อดื้อยา AMR</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">จำแนกตามประเภทกลไกการดื้อยาสำคัญ</p>
            </div>

            {resistanceBreakdown.length === 0 ? (
              <div className="h-56 flex items-center justify-center text-slate-400 text-xs">
                ไม่มีข้อมูลเชื้อดื้อยาในช่วงเวลานี้
              </div>
            ) : (
              <div className="space-y-3 pt-1">
                {resistanceBreakdown.map((resItem, idx) => {
                  const pct = summary.total_alerts > 0 
                    ? Math.round((resItem.count / summary.total_alerts) * 100) 
                    : 0;

                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-700">{resItem.type}</span>
                        <div className="space-x-1.5">
                          <span className="font-black text-slate-900">{resItem.count} เคส</span>
                          <span className="text-slate-400 font-medium">({pct}%)</span>
                        </div>
                      </div>
                      <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${pct}%` }}
                          className={`h-full rounded-full ${
                            resItem.type.includes('CRAB')
                              ? 'bg-red-500'
                              : resItem.type.includes('CRE')
                              ? 'bg-orange-500'
                              : resItem.type.includes('MRSA')
                              ? 'bg-purple-500'
                              : resItem.type.includes('VRE')
                              ? 'bg-violet-500'
                              : resItem.type.includes('ESBL')
                              ? 'bg-sky-500'
                              : 'bg-slate-400'
                          }`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* 3. Top Organisms & Top Wards Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Top Organisms */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-3">
            <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm flex items-center space-x-2">
                <Dna className="w-4 h-4 text-blue-600" />
                <span>เชื้อก่อโรคที่พบแจ้งเตือนสูงสุด (Top Organisms)</span>
              </h3>
              <span className="text-xs font-semibold text-slate-400">6 อันดับแรก</span>
            </div>

            {topOrganisms.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">ไม่มีข้อมูล</div>
            ) : (
              <div className="space-y-3">
                {topOrganisms.map((org, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs py-1">
                    <div className="flex items-center space-x-2.5 truncate max-w-[70%]">
                      <span className="w-5 h-5 rounded-md bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-[11px] shrink-0">
                        {idx + 1}
                      </span>
                      <span className="font-semibold text-slate-800 italic truncate" title={org.organism}>
                        {org.organism}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 shrink-0">
                      <span className="font-bold text-slate-900">{org.count} เคส</span>
                      <span className="text-slate-400 text-[11px]">({org.percentage}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top Wards */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-3">
            <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm flex items-center space-x-2">
                <Building2 className="w-4 h-4 text-indigo-600" />
                <span>หอผู้ป่วยที่มีการแจ้งเตือนสูงสุด (Top Alert Wards)</span>
              </h3>
              <span className="text-xs font-semibold text-slate-400">6 อันดับแรก</span>
            </div>

            {topWards.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">ไม่มีข้อมูล</div>
            ) : (
              <div className="space-y-3">
                {topWards.map((ward, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs py-1">
                    <div className="flex items-center space-x-2.5 truncate max-w-[70%]">
                      <span className="w-5 h-5 rounded-md bg-indigo-50 text-indigo-700 font-bold flex items-center justify-center text-[11px] shrink-0">
                        {idx + 1}
                      </span>
                      <span className="font-semibold text-slate-800 truncate" title={ward.ward}>
                        {ward.ward}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 shrink-0">
                      <span className="font-bold text-slate-900">{ward.count} ราย</span>
                      <span className="text-slate-400 text-[11px]">({ward.percentage}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 4. Complete Unmasked Table & Filters */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Table Header Controls */}
          <div className="p-5 border-b border-slate-200 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <h3 className="font-black text-slate-900 text-base flex items-center space-x-2">
                  <FileSpreadsheet className="w-5 h-5 text-blue-600" />
                  <span>บันทึกการแจ้งเตือนทั้งหมดจาก Telegram LABALEARTTUH (ไม่ปิดบังข้อมูล)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  พบทั้งหมด {filteredAlerts.length} รายการ (จากช่วง {periodLabel})
                </p>
              </div>

              {/* Quick Search */}
              <div className="relative w-full md:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="ค้นหา HN, ชื่อ, หอผู้ป่วย, เชื้อ..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Filter Chips */}
            <div className="flex flex-wrap items-center gap-2 pt-2 text-xs">
              <span className="font-bold text-slate-600 flex items-center space-x-1 mr-1">
                <Filter className="w-3.5 h-3.5" />
                <span>ตัวกรอง:</span>
              </span>

              {/* Resistance Selector */}
              <select
                value={resistanceFilter}
                onChange={(e) => setResistanceFilter(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-700 focus:outline-none"
              >
                <option value="ALL">การดื้อยา: ทั้งหมด</option>
                <option value="AMR_ONLY">เฉพาะเชื้อดื้อยา (AMR)</option>
                <option value="CRAB">เฉพาะ CRAB</option>
                <option value="CRE">เฉพาะ CRE</option>
                <option value="MRSA">เฉพาะ MRSA</option>
                <option value="VRE">เฉพาะ VRE</option>
                <option value="ESBL">เฉพาะ ESBL</option>
                <option value="NON_AMR">ผลวิกฤตทั่วไป (Non-MDRO)</option>
              </select>

              {/* Ward Selector */}
              <select
                value={wardFilter}
                onChange={(e) => setWardFilter(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-700 focus:outline-none"
              >
                <option value="ALL">หอผู้ป่วย: ทั้งหมด</option>
                {distinctWards.map((w) => (
                  <option key={w} value={w}>
                    {w}
                  </option>
                ))}
              </select>

              {(searchQuery || resistanceFilter !== 'ALL' || wardFilter !== 'ALL') && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setResistanceFilter('ALL');
                    setWardFilter('ALL');
                  }}
                  className="text-xs text-rose-600 hover:underline font-semibold ml-2"
                >
                  ล้างตัวกรอง
                </button>
              )}
            </div>
          </div>

          {/* Table Element */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50/90 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3.5 px-4">วัน-เวลาที่แจ้ง</th>
                  <th className="py-3.5 px-4 font-black text-blue-700">HN (ฉบับเต็ม)</th>
                  <th className="py-3.5 px-4">ชื่อผู้ป่วย</th>
                  <th className="py-3.5 px-4">หอผู้ป่วย (Ward)</th>
                  <th className="py-3.5 px-4">สิ่งส่งตรวจ</th>
                  <th className="py-3.5 px-4">เชื้อก่อโรค</th>
                  <th className="py-3.5 px-4">การดื้อยา (AMR)</th>
                  <th className="py-3.5 px-4">มาตรการแยกโรค (IC) / คำแนะนำแพทย์</th>
                  <th className="py-3.5 px-4">รายละเอียดผล</th>
                  <th className="py-3.5 px-3 text-center">ข้อความดิบ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAlerts.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-400">
                      ไม่พบข้อมูลการแจ้งเตือนที่ตรงกับเงื่อนไข
                    </td>
                  </tr>
                ) : (
                  filteredAlerts.map((alert) => (
                    <tr
                      key={alert.id}
                      className="hover:bg-blue-50/40 transition-colors cursor-default"
                    >
                      {/* Date & Time */}
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                        {new Date(alert.alert_date).toLocaleString('th-TH', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>

                      {/* Full Unmasked HN */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-mono font-black text-sm text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-300">
                          {alert.hn}
                        </span>
                      </td>

                      {/* Patient Name */}
                      <td className="py-3 px-4 font-semibold text-slate-800 whitespace-nowrap">
                        {alert.patient_name || '-'}
                      </td>

                      {/* Ward */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          {alert.ward}
                        </span>
                      </td>

                      {/* Specimen */}
                      <td className="py-3 px-4 font-medium text-slate-700 whitespace-nowrap">
                        {alert.specimen}
                      </td>

                      {/* Organism */}
                      <td className="py-3 px-4 font-bold text-slate-900 italic">
                        {alert.organism}
                      </td>

                      {/* Resistance Badge */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {getResistanceBadge(alert.resistance_type, alert.is_amr)}
                      </td>

                      {/* Clinical Action / IC Precautions */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {getClinicalActionBadge(alert)}
                      </td>

                      {/* Findings detail */}
                      <td className="py-3 px-4 max-w-xs truncate text-slate-600" title={alert.findings_detail}>
                        {alert.findings_detail || '-'}
                      </td>

                      {/* View Raw Telegram Message */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <button
                          onClick={() => setSelectedRawAlert(alert)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="ดูข้อความแจ้งเตือนต้นฉบับจากกลุ่ม Telegram LABALEARTTUH"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Raw Telegram Alert Modal */}
      {selectedRawAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Eye className="w-5 h-5 text-blue-400" />
                <h4 className="font-bold text-sm">ข้อความแจ้งเตือนต้นฉบับจาก Telegram</h4>
              </div>
              <button
                onClick={() => setSelectedRawAlert(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-500 block">HN:</span>
                  <span className="font-bold text-slate-900">{selectedRawAlert.hn}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">ผู้ป่วย:</span>
                  <span className="font-bold text-slate-900">{selectedRawAlert.patient_name || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">หอผู้ป่วย:</span>
                  <span className="font-bold text-slate-900">{selectedRawAlert.ward}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">สิ่งส่งตรวจ:</span>
                  <span className="font-bold text-slate-900">{selectedRawAlert.specimen}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Telegram Raw Message (กลุ่ม LABALEARTTUH):
                </label>
                <pre className="p-3.5 bg-slate-950 text-emerald-400 rounded-xl text-xs font-mono whitespace-pre-wrap leading-relaxed border border-slate-800">
                  {selectedRawAlert.raw_message || selectedRawAlert.findings_detail || 'ไม่มีข้อความดิบ'}
                </pre>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setSelectedRawAlert(null)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl transition-colors"
                >
                  ปิดหน้าต่าง
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Telegram Import Modal */}
      <TelegramImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={() => loadSummaryData(period)}
      />

      {/* Send Alert & Record Modal */}
      <SendAlertModal
        isOpen={isSendModalOpen}
        onClose={() => setIsSendModalOpen(false)}
        onSuccess={() => loadSummaryData(period)}
      />

      {/* IC Printable Round Sheet Modal */}
      <ICPrintSheet
        isOpen={isPrintSheetOpen}
        onClose={() => setIsPrintSheetOpen(false)}
        alerts={filteredAlerts}
        periodLabel={periodLabel}
      />

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <span>
            งานจุลชีววิทยา ภาควิชาพยาธิวิทยา รพ.ธรรมศาสตร์เฉลิมพระเกียรติ • Microbiology & AMR Surveillance
          </span>
          <span className="font-mono text-slate-400">
            Telegram Group: LABALEARTTUH (-1003285766063)
          </span>
        </div>
      </footer>
    </div>
  );
}

