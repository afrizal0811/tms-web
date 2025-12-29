// File: features/dashboard/components/SequenceAccuracyChart.js
'use client';

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

import { useLanguage } from '@/context/LanguageContext';
import DailySequenceAccuracyModal from '@/features/dashboard/modals/DailySequenceAccuracyModal';
import { processSequenceAccuracyData } from '@/lib/dashboardHelper';

const CustomTooltip = ({ active, payload, label, t }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-800 text-white text-xs p-3 rounded shadow-lg border border-slate-600 z-50 w-45">
        <p className="font-bold mb-2 text-sm border-b border-slate-600 pb-1">{label}</p>

        <div className="flex justify-between gap-4 mb-1">
          <span className="text-blue-400">● {t('dashboard.charts.sequence.manual')}</span>
          <span className="font-mono">{data.manual}</span>
        </div>
        <div className="flex justify-between gap-4 mb-1">
          <span className="text-emerald-400">● {t('dashboard.charts.sequence.match')}</span>
          <span className="font-mono">{data.match}</span>
        </div>
        <div className="flex justify-between gap-4 mb-1">
          <span className="text-red-400">● {t('dashboard.charts.sequence.mismatch')}</span>
          <span className="font-mono">{data.mismatch}</span>
        </div>

        <div className="mt-2 pt-1 border-t border-slate-600 font-bold flex flex-col gap-0.5">
          <div className="flex justify-between gap-4">
            <span>{t('common.total_task')}</span>
            <span>{data.total}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span>{t('dashboard.charts.sequence.total_accuracy')}</span>
            <span>{data.rate}%</span>
          </div>
        </div>

        <p className="mt-2 text-[10px] text-slate-400 italic">*{t('common.click_for_detail')}</p>
      </div>
    );
  }
  return null;
};

function SequenceAccuracyChart({ allTasks }) {
  const { t, lang } = useLanguage();

  const [monthlyData, setMonthlyData] = useState(null); // null = belum siap
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [dailyData, setDailyData] = useState([]);
  const [isModalLoading, setIsModalLoading] = useState(false);
  // === Hitung data bulanan setelah render pertama ===
  useEffect(() => {
    if (!allTasks || allTasks.length === 0) {
      //eslint-disable-next-line
      setMonthlyData([]);
      setDailyData([]);
      setSelectedMonth(null);
      return;
    }

    const result = processSequenceAccuracyData(allTasks, 'monthly');
    setMonthlyData(result);
  }, [allTasks]);

  const localizedData = useMemo(() => {
    if (!monthlyData) return null;
    return monthlyData.map((item) => {
      // Asumsi item.key formatnya "YYYY-MM"
      if (item.key && item.key.includes('-')) {
        const [year, month] = item.key.split('-').map(Number);
        const date = new Date(year, month - 1, 1);

        return {
          ...item,
          name: date.toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US', { month: 'short' }),
        };
      }
      return item;
    });
  }, [monthlyData, lang]);
  // === Hitung harian saat user pilih bulan ===
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
      const result = processSequenceAccuracyData(allTasks, 'daily', key);
      setDailyData(result);
      setIsModalLoading(false);
    }, 150);
  }, [selectedMonth, allTasks]);

  const handleBarClick = (data) => {
    const payload = data && data.payload ? data.payload : data;
    if (!payload || !payload.key) return;
    setSelectedMonth(payload);
  };

  const getModalTitle = () => {
    if (!selectedMonth) return '';
    try {
      const [year, month] = selectedMonth.key.split('-');
      const dateObj = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
      const fullMonth = dateObj.toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US', {
        month: 'long',
      });

      return `${t('dashboard.charts.sequence.title')} ${fullMonth} ${year}`;
    } catch (e) {
      return `${t('dashboard.charts.sequence.title')} ${selectedMonth.name || selectedMonth.key}`;
    }
  };

  const isPreparing = monthlyData === null;
  const hasData = Array.isArray(monthlyData) && monthlyData.length > 0;

  return (
    <div className="w-full bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
      <div className="mb-6">
        <h3 className="text-lg font-bold text-slate-800">Sequence Accuracy</h3>
        <p className="text-sm text-gray-500">
          {t('dashboard.charts.sequence.subtitle')}{' '}
          <span className="font-bold text-emerald-600">
            {t('dashboard.charts.sequence.routing')}
          </span>{' '}
          vs <span className="font-bold text-red-600">{t('dashboard.charts.sequence.actual')}</span>
        </p>
      </div>

      <div className="h-[350px] w-full">
        {isPreparing ? (
          // === SKELETON SAAT MENYIAPKAN DATA ===
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
                dataKey="name"
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
                dataKey="match"
                fill="#22c55e"
                maxBarSize={50}
                name={t('dashboard.charts.sequence.match')}
                onClick={handleBarClick}
                radius={[0, 0, 0, 0]}
                stackId="a"
              />
              <Bar
                cursor="pointer"
                dataKey="manual"
                fill="#3b82f6"
                maxBarSize={50}
                name={t('dashboard.charts.sequence.manual')}
                onClick={handleBarClick}
                radius={[0, 0, 0, 0]}
                stackId="a"
              />
              <Bar
                cursor="pointer"
                dataKey="mismatch"
                fill="#ef4444"
                maxBarSize={50}
                name={t('dashboard.charts.sequence.mismatch')}
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

      <DailySequenceAccuracyModal
        isOpen={!!selectedMonth}
        onClose={() => setSelectedMonth(null)}
        title={getModalTitle()}
        data={dailyData}
        isLoading={isModalLoading}
      />
    </div>
  );
}

export default memo(SequenceAccuracyChart);
