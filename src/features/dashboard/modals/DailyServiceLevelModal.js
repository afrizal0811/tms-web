// File: src/features/dashboard/modals/DailyServiceLevelModal.js
'use client';

import BaseModal from '@/components/BaseModal';
import Spinner from '@/components/Spinner';
import { memo } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { serviceLevelData } from '../help';

const DailyTooltip = ({ active, payload, label, t, localeCode, selectedDate, isDarkMode }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    let dayName = '';

    if (selectedDate) {
      try {
        const year = selectedDate.getFullYear();
        const month = selectedDate.getMonth();
        const day = parseInt(label, 10);
        const dateObj = new Date(year, month, day);
        dayName = dateObj.toLocaleDateString(localeCode, { weekday: 'long' });
      } catch (e) {
        toastError(t('common.toast.error', { err: e.message }));
      }
    }

    return (
      <div className="bg-slate-800 text-white text-xs p-3 rounded shadow-lg border border-slate-600 z-50 w-45">
        <p className="font-bold mb-2 text-sm border-b border-slate-600 pb-1">
          {t('common.date')} {label} {dayName && `(${dayName})`}
        </p>

        {serviceLevelData.map((item) => {
          const value = data[item.name];
          if (!item.alwaysShow && !(value > 0)) return null;
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

        <div className="mt-2 pt-1 border-t border-slate-600 font-bold flex justify-between">
          <span>{t('dashboard.charts.service_level.success_rate')}</span>
          <span>{data.rate}%</span>
        </div>
      </div>
    );
  }
  return null;
};

function DailyServiceLevelModal({
  isOpen,
  onClose,
  title,
  data,
  isLoading,
  selectedDate,
  isDarkMode,
  t,
  localeCode,
}) {
  if (!isOpen) return null;

  const hasData = Array.isArray(data) && data.length > 0;
  const hasPendingGR = hasData && data.some((d) => d.PENDING_GR > 0);

  const footerContent = (
    <div className="flex flex-wrap gap-4 font-medium text-xs text-gray-500">
      {serviceLevelData.map((item) => {
        return (
          <div key={item.name} className="flex items-center gap-1.5">
            <span
              className="w-3 h-3 rounded-sm"
              style={{
                backgroundColor: isDarkMode ? item.dark_color : item.light_color,
              }}
            />
            <span className="text-slate-400">{t(`common.status.${item.tKey}`)}</span>
          </div>
        );
      })}
    </div>
  );

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      maxWidth="max-w-5xl"
      footer={footerContent}
    >
      <div className="h-[400px] w-full bg-white dark:bg-slate-900">
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <Spinner />
          </div>
        ) : hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
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
                content={
                  <DailyTooltip
                    t={t}
                    localeCode={localeCode}
                    selectedDate={selectedDate}
                    isDarkMode={isDarkMode}
                  />
                }
                cursor={{ fill: `${isDarkMode ? '#1d293d' : '#f1f5f9'}` }}
              />
              {serviceLevelData
                .filter((item) => item.name !== 'PENDING_GR' || hasPendingGR)
                .map((item, index, filteredArray) => {
                  const isTopBar = index === filteredArray.length - 1;
                  return (
                    <Bar
                      key={item.name}
                      name={t(`common.status.${item.tKey}`)}
                      dataKey={item.name}
                      stackId="a"
                      fill={isDarkMode ? item.dark_color : item.light_color}
                      radius={isTopBar ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                      maxBarSize={40}
                    />
                  );
                })}
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-400">
            {t('common.no_data')}
          </div>
        )}
      </div>
    </BaseModal>
  );
}

export default memo(DailyServiceLevelModal);
