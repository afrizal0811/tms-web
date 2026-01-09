// File: src/features/dashboard/components/chart/LoadCapacityChart.js
'use client';

import { memo, useMemo, useState } from 'react';
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
import DailyLoadCapacityModal from '@/features/dashboard/modals/DailyLoadCapacityModal';
import { processLoadCapacityData } from '../../help';

const CustomTooltip = ({ active, payload, label, t }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-800 text-white text-xs p-3 rounded shadow-lg border border-slate-600 z-50 min-w-[150px]">
        <p className="font-bold mb-2 text-sm border-b border-slate-600 pb-1">{label}</p>

        <div className="flex justify-between gap-4 mb-1">
          <span className="text-red-400">
            ● {t('dashboard.charts.load_capacity.overload')} (&gt;100%)
          </span>
          <span className="font-mono">{data.overload}</span>
        </div>
        <div className="flex justify-between gap-4 mb-1">
          <span className="text-orange-400">
            ● {t('dashboard.charts.load_capacity.full')} (85-100%)
          </span>
          <span className="font-mono">{data.penuh}</span>
        </div>
        <div className="flex justify-between gap-4 mb-1">
          <span className="text-emerald-400">
            ● {t('dashboard.charts.load_capacity.optimal')} (60-85%)
          </span>
          <span className="font-mono">{data.optimal}</span>
        </div>
        <div className="flex justify-between gap-4 mb-1">
          <span className="text-blue-400">
            ● {t('dashboard.charts.load_capacity.low')} (40-60%)
          </span>
          <span className="font-mono">{data.rendah}</span>
        </div>
        <div className="flex justify-between gap-4 mb-1">
          <span className="text-slate-400">
            ● {t('dashboard.charts.load_capacity.very_low')} (&lt;40%)
          </span>
          <span className="font-mono">{data.sangatRendah}</span>
        </div>
        <p className="mt-2 text-[10px] text-slate-400 italic">*{t('common.click_for_detail')}</p>
      </div>
    );
  }
  return null;
};

const LoadCapacityChart = ({ tasks, driverData, selectedYear }) => {
  const { t, lang } = useLanguage();
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(null);

  const chartData = useMemo(() => {
    const year = selectedYear ? selectedYear.getFullYear() : new Date().getFullYear();
    const rawData = processLoadCapacityData(tasks, driverData, year);

    // Tambahkan nama bulan yang sudah dilokalisasi (Jan, Feb vs Jan, Feb (EN))
    const localizedData = rawData.map((item) => {
      const dateObj = new Date(year, item.monthIndex, 1);
      const monthShortName = dateObj.toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US', {
        month: 'short',
      });
      return {
        ...item,
        name: monthShortName,
      };
    });

    return localizedData.filter(
      (m) => m.sangatRendah + m.rendah + m.optimal + m.penuh + m.overload > 0
    );
  }, [tasks, driverData, selectedYear, lang]);

  const handleBarClick = (data, index) => {
    setSelectedMonthIndex(index);
  };

  const getModalTitle = () => {
    if (selectedMonthIndex === null) return '';
    const monthItem = chartData[selectedMonthIndex];
    if (!monthItem) return '';

    const year = selectedYear ? selectedYear.getFullYear() : new Date().getFullYear();
    const dateObj = new Date(year, monthItem.monthIndex, 1);
    const fullMonthName = dateObj.toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US', {
      month: 'long',
    });

    return `${t('dashboard.charts.load_capacity.title')} ${fullMonthName} ${year}`;
  };

  const isEmpty = chartData.length === 0;

  return (
    <div className="w-full bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-slate-800">
          {t('dashboard.charts.load_capacity.title')}
        </h3>
        <p className="text-sm text-gray-500">
          {t('dashboard.charts.load_capacity.subtitle')}{' '}
          <span className="font-bold text-emerald-600">
            {t('dashboard.charts.load_capacity.highlight')}
          </span>
        </p>
      </div>

      <div className="w-full flex flex-col gap-4">
        <div className="w-full h-[350px]">
          {isEmpty ? (
            <div className="h-full flex items-center justify-center text-gray-400 italic bg-slate-50 rounded-lg border border-dashed border-gray-300">
              <div className="text-center">
                <p>{t('common.no_data')}</p>
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#64748b' }}
                  interval={0}
                />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <Tooltip content={<CustomTooltip t={t} />} cursor={{ fill: '#f1f5f9' }} />
                <Legend
                  iconType="circle"
                  verticalAlign="top"
                  align="right"
                  wrapperStyle={{ paddingBottom: '10px', fontSize: '12px' }}
                />
                <Bar
                  name={t('dashboard.charts.load_capacity.very_low')}
                  dataKey="sangatRendah"
                  stackId="a"
                  fill="#94a3b8"
                  radius={[0, 0, 0, 0]}
                  maxBarSize={50}
                  onClick={handleBarClick}
                  cursor="pointer"
                />
                <Bar
                  name={t('dashboard.charts.load_capacity.low')}
                  dataKey="rendah"
                  stackId="a"
                  fill="#3b82f6"
                  radius={[0, 0, 0, 0]}
                  maxBarSize={50}
                  onClick={handleBarClick}
                  cursor="pointer"
                />
                <Bar
                  name={t('dashboard.charts.load_capacity.optimal')}
                  dataKey="optimal"
                  stackId="a"
                  fill="#10b981"
                  radius={[0, 0, 0, 0]}
                  maxBarSize={50}
                  onClick={handleBarClick}
                  cursor="pointer"
                />
                <Bar
                  name={t('dashboard.charts.load_capacity.full')}
                  dataKey="penuh"
                  stackId="a"
                  fill="#f97316"
                  radius={[0, 0, 0, 0]}
                  maxBarSize={50}
                  onClick={handleBarClick}
                  cursor="pointer"
                />
                <Bar
                  name={t('dashboard.charts.load_capacity.overload')}
                  dataKey="overload"
                  stackId="a"
                  fill="#ef4444"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={50}
                  onClick={handleBarClick}
                  cursor="pointer"
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {!isEmpty && (
          <p className="text-xs text-gray-400 text-center italic">{t('common.click_for_detail')}</p>
        )}

        <DailyLoadCapacityModal
          isOpen={selectedMonthIndex !== null}
          onClose={() => setSelectedMonthIndex(null)}
          title={getModalTitle()}
          monthData={selectedMonthIndex !== null ? chartData[selectedMonthIndex] : null}
        />
      </div>
    </div>
  );
};

export default memo(LoadCapacityChart);
