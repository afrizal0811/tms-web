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
import { isEmpty } from '@/lib/utils';
import { processSequenceAccuracyData, seqAccuracyData } from '../../help';

const CustomTooltip = ({ active, payload, label, t, isDarkMode }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-800 text-white text-xs p-3 rounded shadow-lg border border-slate-600 z-50 w-45">
        <p className="font-bold mb-2 text-sm border-b border-slate-600 pb-1">{label}</p>
        {seqAccuracyData.map((item) => {
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
          <span>{t('dashboard.charts.sequence.total_accuracy')}</span>
          <span>{data.rate}%</span>
        </div>

        <p className="mt-2 text-[10px] text-slate-400 italic">*{t('common.click_for_detail')}</p>
      </div>
    );
  }

  return null;
};

function SequenceAccuracyChart({ allTasks, isDarkMode }) {
  const { t, lang } = useLanguage();

  const [monthlyData, setMonthlyData] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [dailyData, setDailyData] = useState([]);
  const [isModalLoading, setIsModalLoading] = useState(false);

  useEffect(() => {
    if (!allTasks || isEmpty(allTasks)) {
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
      if (item.key && item.key.includes('-')) {
        const [year, month] = item.key.split('-').map(Number);
        const date = new Date(year, month - 1, 1);
        return {
          ...item,
          name: date.toLocaleDateString(lang, { month: 'short' }),
        };
      }
      return item;
    });
  }, [monthlyData, lang]);

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

  const selectedDateObj = useMemo(() => {
    if (!selectedMonth || !selectedMonth.key) return null;
    try {
      const [year, month] = selectedMonth.key.split('-').map(Number);
      return new Date(year, month - 1, 1);
    } catch {
      return null;
    }
  }, [selectedMonth]);

  const getModalTitle = () => {
    if (!selectedDateObj) return '';
    try {
      const fullMonth = selectedDateObj.toLocaleDateString(lang, {
        month: 'long',
        year: 'numeric',
      });
      return (
        <div>
          <h3 className="text-lg font-bold">{t('dashboard.charts.sequence.title')}</h3>
          <p className="text-slate-300 text-sm font-normal">{fullMonth}</p>
        </div>
      );
    } catch {
      return (
        <div>
          <h3 className="text-lg font-bold">{t('dashboard.charts.sequence.title')}</h3>
        </div>
      );
    }
  };

  const isPreparing = monthlyData === null;
  const hasData = Array.isArray(monthlyData) && monthlyData.length > 0;

  return (
    <div className="w-full bg-white p-6 rounded-xl border border-gray-200 shadow-sm dark:bg-slate-800 dark:border-slate-700">
      <div className="mb-6">
        <h3 className="text-lg font-bold text-slate-800 dark:text-white">
          {t('dashboard.charts.sequence.title')}
        </h3>
        <p className="text-sm text-gray-500 dark:text-slate-400">
          {t('dashboard.charts.sequence.subtitle')}{' '}
          <span className="font-bold text-green-600 dark:text-green-300">
            {t('dashboard.charts.sequence.routing')}
          </span>{' '}
          vs{' '}
          <span className="font-bold  text-red-600 dark:text-red-300">
            {t('dashboard.charts.sequence.actual')}
          </span>
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
                dataKey="name"
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
              {seqAccuracyData.map((item, index) => {
                const isTopBar = index === seqAccuracyData.length - 1;
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

      <DailySequenceAccuracyModal
        isOpen={!!selectedMonth}
        onClose={() => setSelectedMonth(null)}
        title={getModalTitle()}
        data={dailyData}
        isLoading={isModalLoading}
        selectedDate={selectedDateObj}
        isDarkMode={isDarkMode}
        t={t}
        lang={lang}
      />
    </div>
  );
}

export default memo(SequenceAccuracyChart);
