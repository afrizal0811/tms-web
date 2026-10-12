'use client';

import { useLanguage } from '@/context/LanguageContext';
import DailyLoadCapacityModal from '@/features/summary/tabs/modals/DailyLoadCapacityModal';
import { formatLongDate, isEmpty } from '@/lib/utils';
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
import { loadCapacityData, processLoadCapacityData } from './diagramHelp';

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
              <span>● {t(`summary.tabs.diagram.load_capacity.${item.tKey}`)}</span>
              <span className="font-mono">{value || 0}</span>
            </div>
          );
        })}
      </div>
    );
  }

  return null;
};

const LoadCapacityChart = ({ tasks, driverData, selectedYear, isDarkMode }) => {
  const { t, localeCode } = useLanguage();
  const [selectedMonth, setSelectedMonth] = useState(null);

  const chartData = useMemo(() => {
    const rawData = processLoadCapacityData(
      tasks,
      driverData,
      selectedYear ? selectedYear.getFullYear() : null
    );
    const localizedData = rawData.map((item) => {
      let monthShortName = item.key;
      if (item.key && item.key.includes('-')) {
        const [year, month] = item.key.split('-').map(Number);
        const dateObj = new Date(year, month - 1, 1);
        monthShortName = dateObj.toLocaleDateString(localeCode, { month: 'short' });
      }
      return { ...item, name: monthShortName };
    });

    return localizedData.filter((m) => m.veryLow + m.low + m.normal + m.full + m.overload > 0);
  }, [tasks, driverData, selectedYear, localeCode]);

  const handleBarClick = (data) => {
    const payload = data && data.payload ? data.payload : data;
    if (!payload || !payload.key) return;
    setSelectedMonth(payload);
  };

  return (
    <div className="w-full bg-white p-6 rounded-xl border border-gray-200 shadow-sm dark:bg-slate-800 dark:border-slate-700">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-slate-800 dark:text-white">
          {t('summary.tabs.diagram.load_capacity.title')}
        </h3>
        <p className="text-sm text-gray-500 dark:text-slate-400">
          {t('summary.tabs.diagram.load_capacity.subtitle')}{' '}
          <span className="font-bold text-green-600 dark:text-green-300">
            {t('summary.tabs.diagram.load_capacity.highlight')}
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
                      name={t(`summary.tabs.diagram.load_capacity.${item.tKey}`)}
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

        <DailyLoadCapacityModal
          isOpen={!!selectedMonth}
          onClose={() => setSelectedMonth(null)}
          title={t('summary.tabs.diagram.load_capacity.title')}
          subtitle={selectedMonth ? formatLongDate(selectedMonth.key, localeCode, false) : null}
          monthData={selectedMonth}
          isDarkMode={isDarkMode}
          t={t}
          localeCode={localeCode}
        />
      </div>
    </div>
  );
};

export default memo(LoadCapacityChart);
