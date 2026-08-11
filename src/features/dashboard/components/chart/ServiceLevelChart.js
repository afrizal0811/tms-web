// File: features/dashboard/components/ServiceLevelChart.js
'use client';

import { useLanguage } from '@/context/LanguageContext';
import DailyServiceLevelModal from '@/features/dashboard/modals/DailyServiceLevelModal';
import { formatLongDate, isEmpty } from '@/lib/utils';
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
import { processServiceLevelData, serviceLevelData } from '../../help';

const CustomTooltip = ({ active, payload, label, t, isDarkMode }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;

    return (
      <div className="bg-slate-800 text-white text-xs p-3 rounded shadow-lg border border-slate-600 z-50 w-45">
        <p className="font-bold mb-2 text-sm border-b border-slate-600 pb-1">{label}</p>
        {serviceLevelData.map((item) => {
          const value = data[item.name];
          if (!(value > 0)) return null;
          return (
            <div
              key={item.name}
              className="flex justify-between gap-4 mb-1"
              style={{ color: isDarkMode ? item.dark_color : item.light_color }}
            >
              <span>● {t(`common.status.${item.tKey}`)}</span>
              <span className="font-mono">{value || 0}</span>
            </div>
          );
        })}
        <div className="mt-2 pt-1 border-t border-slate-600 font-bold flex justify-between text-white">
          <span>{t('common.total_task')}</span>
          <span>{data.total}</span>
        </div>

        <div className="border-slate-600 font-bold flex justify-between text-white">
          <span>{t('dashboard.charts.service_level.success_rate')}</span>
          <span>{data.rate}%</span>
        </div>

        <p className="mt-2 text-[10px] text-slate-400 italic">*{t('common.click_for_detail')}</p>
      </div>
    );
  }

  return null;
};

function ServiceLevelChart({ allTasks, hubId, isDarkMode }) {
  const { t, localeCode } = useLanguage();

  const [monthlyData, setMonthlyData] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [dailyData, setDailyData] = useState([]);
  const [isModalLoading, setIsModalLoading] = useState(false);

  // === Hitung data bulanan ===
  useEffect(() => {
    if (!allTasks || isEmpty(allTasks)) {
      //eslint-disable-next-line
      setMonthlyData([]);
      setDailyData([]);
      setSelectedMonth(null);
      return;
    }
    const result = processServiceLevelData(allTasks, 'monthly', null, hubId, localeCode);
    setMonthlyData(result);
  }, [allTasks, hubId, localeCode]);

  const localizedData = useMemo(() => {
    if (!monthlyData) return null;
    return monthlyData.map((item) => {
      if (item.key && item.key.includes('-')) {
        const [year, month] = item.key.split('-').map(Number);
        const date = new Date(year, month - 1, 1);
        return {
          ...item,
          label: date.toLocaleDateString(localeCode, { month: 'short' }),
        };
      }
      return item;
    });
  }, [monthlyData, localeCode]);

  // === Hitung data harian ===
  useEffect(() => {
    if (!selectedMonth || !allTasks || isEmpty(allTasks)) {
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
      const result = processServiceLevelData(allTasks, 'daily', key, hubId, localeCode);
      setDailyData(result);
      setIsModalLoading(false);
    }, 150);
  }, [selectedMonth, allTasks, hubId, localeCode]);

  const handleBarClick = (data, index) => {
    const payload = data && data.payload ? data.payload : data;
    const entry = payload ?? (monthlyData && monthlyData[index]) ?? null;
    if (!entry || !entry.key) return;
    setSelectedMonth(entry);
  };

  const selectedDateObj = useMemo(() => {
    if (!selectedMonth || !selectedMonth.key) return null;
    try {
      const [year, month] = selectedMonth.key.split('-').map(Number);
      return new Date(year, month - 1, 1);
    } catch {
      return null;
    }
  }, [selectedMonth]);

  const isPreparing = monthlyData === null;
  const hasData = Array.isArray(monthlyData) && monthlyData.length > 0;

  return (
    <div className="w-full bg-white p-6 rounded-xl border border-gray-200 shadow-sm dark:bg-slate-800 dark:border-slate-700">
      <div className="mb-6">
        <h3 className="text-lg font-bold text-slate-800 dark:text-white">
          {t('dashboard.charts.service_level.title')}
        </h3>
        <p className="text-sm text-gray-500 dark:text-slate-400">
          {t('dashboard.charts.service_level.subtitle')}{' '}
          <span className="font-bold text-green-600 dark:text-green-300">
            {t('common.status.success')}
          </span>{' '}
          vs <span className="font-bold text-red-600 dark:text-red-300">{t('common.others')}</span>
        </p>
      </div>

      <div className="h-[350px] w-full">
        {isPreparing ? (
          <div className="w-full h-full bg-slate-50 rounded-xl border border-slate-100 flex flex-col items-center justify-center text-slate-300 dark:bg-slate-800 dark:border-slate-700">
            <div className="w-40 h-3 rounded-full bg-slate-100 mb-4 dark:bg-slate-600 animate-pulse" />
            <div className="w-[90%] h-[70%] rounded-2xl bg-slate-100 dark:bg-slate-600 animate-pulse" />
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
                tick={{ fill: `${isDarkMode ? '#90a1b9' : '#64748b'}`, fontSize: 12 }}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: `${isDarkMode ? '#90a1b9' : '#64748b'}`, fontSize: 12 }}
              />
              <Tooltip
                content={<CustomTooltip t={t} isDarkMode={isDarkMode} />}
                cursor={{ fill: `${isDarkMode ? '#1d293d' : '#f1f5f9'}` }}
              />
              <Legend
                iconType="circle"
                layout="horizontal"
                verticalAlign="top"
                align="right"
                wrapperStyle={{ paddingBottom: '20px', fontSize: '12px' }}
              />

              {serviceLevelData.map((item, index) => {
                const isTopBar = index === serviceLevelData.length - 1;

                return (
                  <Bar
                    key={item.name}
                    cursor="pointer"
                    dataKey={item.name}
                    fill={isDarkMode ? item.dark_color : item.light_color}
                    maxBarSize={50}
                    name={t(`common.status.${item.tKey}`)}
                    onClick={handleBarClick}
                    radius={isTopBar ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                    stackId="a"
                  />
                );
              })}
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
        title={t('dashboard.charts.service_level.title')}
        subtitle={formatLongDate(selectedDateObj, localeCode, false)}
        data={dailyData}
        isLoading={isModalLoading}
        selectedDate={selectedDateObj}
        isDarkMode={isDarkMode}
        t={t}
        localeCode={localeCode}
      />
    </div>
  );
}

export default memo(ServiceLevelChart);
