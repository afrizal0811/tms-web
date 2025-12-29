// File: features/dashboard/components/ServiceLevelChart.js
'use client';

import { useLanguage } from '@/context/LanguageContext';
import DailyServiceLevelModal from '@/features/dashboard/modals/DailyServiceLevelModal';
import { processServiceLevelData } from '@/lib/dashboardHelper';
import { memo, useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const CustomTooltip = ({ active, payload, label, t }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-800 text-white text-xs p-3 rounded shadow-lg border border-slate-600 z-50 w-45">
        <p className="font-bold mb-2 text-sm border-b border-slate-600 pb-1">{label}</p>

        <div className="flex justify-between gap-4 mb-1 text-emerald-400 font-bold">
          <span>● {t('dashboard.charts.service_level.success')}</span>
          <span className="font-mono">{data.SUKSES}</span>
        </div>
        {data.PENDING > 0 && (
          <div className="flex justify-between gap-4 mb-1 text-amber-400">
            <span>● {t('dashboard.charts.service_level.pending')}</span>
            <span className="font-mono">{data.PENDING}</span>
          </div>
        )}
        {data.BATAL > 0 && (
          <div className="flex justify-between gap-4 mb-1 text-red-400">
            <span>● {t('dashboard.charts.service_level.batal')}</span>
            <span className="font-mono">{data.BATAL}</span>
          </div>
        )}
        {data.PARTIAL > 0 && (
          <div className="flex justify-between gap-4 mb-1 text-orange-400">
            <span>● {t('dashboard.charts.service_level.partial')}</span>
            <span className="font-mono">{data.PARTIAL}</span>
          </div>
        )}
        {data.PENDING_GR > 0 && (
          <div className="flex justify-between gap-4 mb-1 text-yellow-600">
            <span>● {t('dashboard.charts.service_level.pending_gr')}</span>
            <span className="font-mono">{data.PENDING_GR}</span>
          </div>
        )}

        <div className="mt-2 pt-1 border-t border-slate-600 font-bold flex justify-between text-white">
          <span>{t('common.total_task')}</span>
          <span>{data.total}</span>
        </div>
        <div className=" border-slate-600 font-bold flex justify-between text-white">
          <span>{t('dashboard.charts.service_level.success_rate')}</span>
          <span>{data.rate}%</span>
        </div>
        <p className="mt-2 text-[10px] text-slate-400 italic">*{t('common.click_for_detail')}</p>
      </div>
    );
  }
  return null;
};

function ServiceLevelChart({ allTasks, hubId }) {
  const { t, lang } = useLanguage();

  const [monthlyData, setMonthlyData] = useState(null); // null = belum siap
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [dailyData, setDailyData] = useState([]);
  const [isModalLoading, setIsModalLoading] = useState(false);
  // === Hitung data bulanan SETELAH render pertama (supaya tab nggak freeze) ===
  useEffect(() => {
    if (!allTasks || allTasks.length === 0) {
      //eslint-disable-next-line
      setMonthlyData([]);
      setDailyData([]);
      setSelectedMonth(null);
      return;
    }

    // proses berat di sini
    const result = processServiceLevelData(allTasks, 'monthly', null, hubId);
    setMonthlyData(result);
  }, [allTasks, hubId]);

  const localizedData = useMemo(() => {
    if (!monthlyData) return null;
    return monthlyData.map((item) => {
      // Asumsi item.key formatnya "YYYY-MM" (misal: "2023-10")
      if (item.key && item.key.includes('-')) {
        const [year, month] = item.key.split('-').map(Number);
        const date = new Date(year, month - 1, 1);

        // Format ulang label bulan sesuai bahasa aktif
        return {
          ...item,
          label: date.toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US', { month: 'short' }),
        };
      }
      return item;
    });
  }, [monthlyData, lang]);

  // === Hitung data harian saat user pilih bulan ===
  useEffect(() => {
    if (!selectedMonth || !allTasks || allTasks.length === 0) {
      //eslint-disable-next-line
      setDailyData([]);
      setIsModalLoading(false);
      return;
    }

    const key = selectedMonth.key;
    if (!key) {
      setDailyData([]);
      setIsModalLoading(false);
      return;
    }

    setIsModalLoading(true);

    setTimeout(() => {
      const result = processServiceLevelData(allTasks, 'daily', key, hubId);
      setDailyData(result);
      setIsModalLoading(false);
    }, 150);
  }, [selectedMonth, allTasks, hubId]);

  const handleBarClick = (data, index) => {
    const payload = data && data.payload ? data.payload : data;
    const entry = payload ?? (monthlyData && monthlyData[index]) ?? null;
    if (!entry || !entry.key) return;
    setSelectedMonth(entry);
  };

  const getModalTitle = () => {
    if (!selectedMonth) return '';
    try {
      const [year, month] = selectedMonth.key.split('-');
      const dateObj = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
      const fullMonth = dateObj.toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US', {
        month: 'long',
      });
      return `${t('dashboard.charts.service_level.title')} ${fullMonth}`;
    } catch {
      return `${t('dashboard.charts.service_level.title')} ${selectedMonth.label || selectedMonth.key}`;
    }
  };

  const isPreparing = monthlyData === null;
  const hasData = Array.isArray(monthlyData) && monthlyData.length > 0;

  return (
    <div className="w-full bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
      <div className="mb-6">
        <h3 className="text-lg font-bold text-slate-800">Service Level</h3>
        <p className="text-sm text-gray-500">
          {t('dashboard.charts.service_level.subtitle')}{' '}
          <span className="font-bold text-emerald-600">
            {t('dashboard.charts.service_level.success')}
          </span>{' '}
          vs{' '}
          <span className="font-bold text-red-600">
            {t('dashboard.charts.service_level.others')}
          </span>
        </p>
      </div>

      <div className="h-[350px] w-full">
        {isPreparing ? (
          <div className="w-full h-full bg-slate-50 rounded-xl border border-slate-100 flex flex-col items-center justify-center text-slate-300">
            <div className="w-40 h-3 rounded-full bg-slate-100 mb-4 animate-pulse" />
            <div className="w-[90%] h-[70%] rounded-2xl bg-slate-100 animate-pulse" />
            <p className="mt-4 text-xs font-semibold tracking-wide uppercase">
              {t('common.preparing_chart')}
            </p>
          </div>
        ) : !hasData ? (
          <div className="w-full h-full bg-slate-50 rounded-xl border border-dashed border-slate-200 flex items-center justify-center text-slate-400 text-sm">
            {t('common.no_data')}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={localizedData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#64748b', fontSize: 12 }}
                dy={10}
              />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
              <Tooltip content={<CustomTooltip t={t} />} cursor={{ fill: '#f1f5f9' }} />
              <Legend
                iconType="circle"
                layout="horizontal"
                verticalAlign="top"
                align="right"
                wrapperStyle={{ paddingBottom: '20px', fontSize: '12px' }}
              />

              <Bar
                cursor="pointer"
                dataKey="SUKSES"
                fill="#22c55e"
                maxBarSize={50}
                name={t('dashboard.charts.service_level.success')}
                onClick={handleBarClick}
                radius={[0, 0, 0, 0]}
                stackId="a"
              />
              <Bar
                cursor="pointer"
                dataKey="PENDING"
                fill="#eab308"
                maxBarSize={50}
                name={t('dashboard.charts.service_level.pending')}
                onClick={handleBarClick}
                radius={[0, 0, 0, 0]}
                stackId="a"
              />
              <Bar
                cursor="pointer"
                dataKey="BATAL"
                fill="#ef4444"
                maxBarSize={50}
                name={t('dashboard.charts.service_level.batal')}
                onClick={handleBarClick}
                radius={[0, 0, 0, 0]}
                stackId="a"
              />
              <Bar
                cursor="pointer"
                dataKey="PARTIAL"
                fill="#f97316"
                maxBarSize={50}
                name={t('dashboard.charts.service_level.partial')}
                onClick={handleBarClick}
                radius={[0, 0, 0, 0]}
                stackId="a"
              />
              <Bar
                cursor="pointer"
                dataKey="PENDING_GR"
                fill="#d97706"
                maxBarSize={50}
                name={t('dashboard.charts.service_level.pending_gr')}
                onClick={handleBarClick}
                radius={[4, 4, 0, 0]}
                stackId="a"
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <p className="text-xs text-gray-400 mt-4 text-center italic">
        {t('common.click_for_detail')}
      </p>

      <DailyServiceLevelModal
        isOpen={!!selectedMonth}
        onClose={() => setSelectedMonth(null)}
        title={getModalTitle()}
        data={dailyData}
        isLoading={isModalLoading}
      />
    </div>
  );
}

export default memo(ServiceLevelChart);
