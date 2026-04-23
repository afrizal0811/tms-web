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
import { isEmpty } from '@/lib/utils';
import { loadCapacityData, processLoadCapacityData } from '../../help';

const CustomTooltip = ({ active, payload, label, t, isDarkMode }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;

    return (
      <div className="bg-slate-800 text-white text-xs p-3 rounded shadow-lg border border-slate-600 z-50 w-45">
        <p className="font-bold mb-2 text-sm border-b border-slate-600 pb-1">{label}</p>
        {loadCapacityData.map((item) => {
          const value = data[item.name];
          if (!(value > 0)) return null;
          return (
            <div
              key={item.name}
              className="flex justify-between gap-4 mb-1"
              style={{ color: isDarkMode ? item.dark_color : item.light_color }}
            >
              <span>● {t(`dashboard.charts.load_capacity.${item.tKey}`)}</span>
              <span className="font-mono">{value || 0}</span>
            </div>
          );
        })}

        <p className="mt-2 text-[10px] text-slate-400 italic">*{t('common.click_for_detail')}</p>
      </div>
    );
  }

  return null;
};


const LoadCapacityChart = ({ tasks, driverData, selectedYear, isDarkMode }) => {
  const { t, lang } = useLanguage();
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(null);

  const chartData = useMemo(() => {
    const year = selectedYear ? selectedYear.getFullYear() : new Date().getFullYear();
    const rawData = processLoadCapacityData(tasks, driverData, year);
    const localizedData = rawData.map((item) => {
      const dateObj = new Date(year, item.monthIndex, 1);
      const monthShortName = dateObj.toLocaleDateString(lang, {
        month: 'short',
      });
      return {
        ...item,
        name: monthShortName,
      };
    });

    return localizedData.filter((m) => m.veryLow + m.low + m.normal + m.full + m.overload > 0);
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
    const fullMonth = dateObj.toLocaleDateString(lang, {
      month: 'long',
      year: 'numeric',
    });
    return (
      <div>
        <h3 className="text-lg font-bold">{t('dashboard.charts.load_capacity.title')}</h3>
        <p className="text-slate-300 text-sm font-normal">{fullMonth}</p>
      </div>
    );
  };

  return (
    <div className="w-full bg-white p-6 rounded-xl border border-gray-200 shadow-sm dark:bg-slate-800 dark:border-slate-700">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-slate-800 dark:text-white">
          {t('dashboard.charts.load_capacity.title')}
        </h3>
        <p className="text-sm text-gray-500 dark:text-slate-400">
          {t('dashboard.charts.load_capacity.subtitle')}{' '}
          <span className="font-bold text-green-600 dark:text-green-300">
            {t('dashboard.charts.load_capacity.highlight')}
          </span>
        </p>
      </div>
      <div className="w-full flex flex-col gap-4">
        <div className="w-full h-[350px]">
          {isEmpty(chartData) ? (
            <div className="h-full flex items-center justify-center text-gray-400 italic bg-slate-50 rounded-lg border border-dashed border-gray-300">
              <div className="text-center">
                <p>{t('common.no_data')}</p>
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
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
                  verticalAlign="top"
                  align="right"
                  wrapperStyle={{ paddingBottom: '10px', fontSize: '12px' }}
                />
                {loadCapacityData.map((item, index) => {
                  const isTopBar = index === loadCapacityData.length - 1;
                  return (
                    <Bar
                      key={item.name}
                      cursor="pointer"
                      dataKey={item.name}
                      fill={isDarkMode ? item.dark_color : item.light_color}
                      maxBarSize={50}
                      name={t(`dashboard.charts.load_capacity.${item.tKey}`)}
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

        {!isEmpty(chartData) && (
          <p className="text-xs text-gray-400 text-center italic">{t('common.click_for_detail')}</p>
        )}

        <DailyLoadCapacityModal
          isOpen={selectedMonthIndex !== null}
          onClose={() => setSelectedMonthIndex(null)}
          title={getModalTitle()}
          monthData={selectedMonthIndex !== null ? chartData[selectedMonthIndex] : null}
          isDarkMode={isDarkMode}
          t={t}
          lang={lang}
        />
      </div>
    </div>
  );
};

export default memo(LoadCapacityChart);
