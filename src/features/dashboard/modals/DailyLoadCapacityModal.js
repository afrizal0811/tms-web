'use client';

import BaseModal from '@/components/BaseModal';
import Tooltip from '@/components/Tooltip';
import { toastError } from '@/lib/toastHelper';
import { isEmpty } from '@/lib/utils';
import { memo, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts';
import { getStatusBadge, loadCapacityData } from '../help';

const DailyTooltip = ({ active, payload, label, t, localeCode, monthData, isDarkMode }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    let dayName = '';

    if (monthData && monthData.key) {
      try {
        const [yearStr, monthStr] = monthData.key.split('-');
        const year = parseInt(yearStr, 10);
        const month = parseInt(monthStr, 10) - 1;
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
      </div>
    );
  }
  return null;
};

const DailyLoadCapacityModal = ({
  isOpen,
  onClose,
  title,
  monthData,
  isDarkMode,
  t,
  localeCode,
}) => {
  const [selectedDay, setSelectedDay] = useState(null);

  // Logic 1: Chart Data Agregasi 5 Kategori
  const chartData = useMemo(() => {
    if (!isOpen || !monthData || !monthData.details) return [];

    const daysInMonth = 31;
    const data = [];

    for (let i = 1; i <= daysInMonth; i++) {
      const trips = monthData.details[i] || [];
      if (trips.length > 0) {
        const stats = {
          day: i,
          veryLow: 0,
          low: 0,
          normal: 0,
          full: 0,
          overload: 0,
          trips: trips,
        };

        trips.forEach((t) => {
          if (t.maxPct > 100) stats.overload++;
          else if (t.maxPct >= 85) stats.full++;
          else if (t.maxPct >= 60) stats.normal++;
          else if (t.maxPct >= 40) stats.low++;
          else stats.veryLow++;
        });

        data.push(stats);
      }
    }
    return data;
  }, [isOpen, monthData]);

  // Logic 2: Vehicle List
  const vehicleList = useMemo(() => {
    if (!isOpen || !selectedDay || !monthData || !monthData.details) return [];

    const trips = monthData.details[selectedDay] || [];

    return [...trips].sort((a, b) => {
      const nameA = a.driverName || '';
      const nameB = b.driverName || '';

      const isRentalA = nameA.toLowerCase().includes('sewa');
      const isRentalB = nameB.toLowerCase().includes('sewa');

      if (isRentalA !== isRentalB) {
        return isRentalA ? 1 : -1;
      }

      return nameA.localeCompare(nameB);
    });
  }, [isOpen, monthData, selectedDay]);

  if (!isOpen) return null;

  const handleBarClick = (data) => {
    if (data && data.day) {
      setSelectedDay(data.day);
    }
  };

  const handleClose = () => {
    setSelectedDay(null);
    onClose();
  };
  const footerContent = (
    <div className="flex flex-wrap gap-4 font-medium text-xs text-gray-500">
      {loadCapacityData.map((item) => {
        return (
          <div key={item.name} className="flex items-center gap-1.5">
            <span
              className="w-3 h-3 rounded-sm"
              style={{
                backgroundColor: isDarkMode ? item.dark_color : item.light_color,
              }}
            />
            <span className="text-slate-400">{item.footer}</span>
          </div>
        );
      })}
    </div>
  );

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={handleClose}
      title={typeof title === 'function' ? title(selectedDay) : title}
      maxWidth="max-w-4xl"
      footer={footerContent}
    >
      <div className="space-y-6">
        <div className="h-64 w-full">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: `${isDarkMode ? '#90a1b9' : '#64748b'}`, fontSize: 12 }}
                  interval={0}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: `${isDarkMode ? '#90a1b9' : '#64748b'}`, fontSize: 12 }}
                />
                <RechartsTooltip
                  cursor={{ fill: `${isDarkMode ? '#1d293d' : '#f1f5f9'}` }}
                  content={
                    <DailyTooltip
                      t={t}
                      localeCode={localeCode}
                      monthData={monthData}
                      isDarkMode={isDarkMode}
                    />
                  }
                />
                {loadCapacityData.map((item, index) => {
                  const isTopBar = index === loadCapacityData.length - 1;
                  return (
                    <Bar
                      key={item.name}
                      name={t(`dashboard.charts.load_capacity.${item.tKey}`)}
                      dataKey={item.name}
                      stackId="a"
                      fill={isDarkMode ? item.dark_color : item.light_color}
                      radius={isTopBar ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                      maxBarSize={40}
                      onClick={handleBarClick}
                      cursor="pointer"
                    />
                  );
                })}
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400 italic">
              {t('common.no_data')}
            </div>
          )}
        </div>

        {selectedDay ? (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="space-y-3">
              {isEmpty(vehicleList) ? (
                <p className="text-center text-gray-400 text-sm py-4">{t('common.no_data')}</p>
              ) : (
                vehicleList.map((trip, idx) => {
                  const weightVal = Number(trip.totalWeight || 0);
                  const maxWeightVal = Number(trip.maxWeight || 1);
                  const weightPct = Number(trip.weightPct || 0);
                  const volVal = Number(trip.totalVolume || 0);
                  const maxVolVal = Number(trip.maxVolume || 1);
                  const volPct = Number(trip.volPct || 0);
                  const status = getStatusBadge(trip.maxPct, t);

                  return (
                    <div
                      key={`${trip.date}-${trip.email}-${idx}`}
                      className="bg-slate-50 border border-slate-200 rounded-lg p-4 grid grid-cols-[1fr_auto] md:flex md:flex-row gap-4 items-start md:items-center hover:shadow-md transition-shadow dark:bg-slate-800 dark:border-slate-700"
                    >
                      <div className="min-w-0 md:w-40 md:shrink-0 overflow-hidden">
                        <p
                          className="font-bold text-slate-700 text-sm truncate dark:text-slate-300"
                          title={trip.driverName}
                        >
                          {trip.driverName}
                        </p>
                        <div className="flex flex-col items-start gap-1 mt-1">
                          <p className="text-xs text-slate-500 font-mono font-bold bg-slate-300 inline-block px-1 rounded truncate max-w-full dark:text-slate-700">
                            {trip.vehicleName}
                          </p>
                          <p className="text-xs text-slate-400 ">
                            {trip.tasksCount} {t('common.task')}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col items-end md:w-[120px] md:shrink-0 md:order-last">
                        <Tooltip tooltipContent={status.range}>
                          <span
                            className={`px-2 py-1 rounded text-[10px] font-bold border uppercase tracking-wide cursor-help ${status.classes}`}
                          >
                            {status.label}
                          </span>
                        </Tooltip>
                        <span className="text-[10px] text-slate-400 mt-1 text-right dark:text-slate-400">
                          {t('dashboard.charts.load_capacity.bound_by')}: {trip.boundBy}
                        </span>
                      </div>

                      <div className="col-span-2 w-full md:flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <div className="flex flex-row md:flex-col lg:flex-row justify-between text-xs mb-1">
                            <span className="text-slate-600 font-medium dark:text-slate-400">
                              {t('dashboard.charts.load_capacity.weight')}
                            </span>
                            <span
                              className={`${weightPct > 100 ? 'text-red-600 dark:text-red-300' : 'text-slate-500 dark:text-slate-400'}`}
                            >
                              {weightVal.toFixed(1)} / {maxWeightVal} kg ({weightPct.toFixed(2)}%)
                            </span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${weightPct > 100 ? 'bg-red-500 dark:bg-red-300' : 'bg-teal-600 dark:bg-teal-300'}`}
                              style={{ width: `${Math.min(weightPct, 100)}%` }}
                            />
                          </div>
                        </div>
                        <div>
                          <div className="flex flex-row md:flex-col lg:flex-row justify-between text-xs mb-1">
                            <span className="text-slate-600 font-medium dark:text-slate-400">
                              {t('dashboard.charts.load_capacity.volume')}
                            </span>
                            <span
                              className={`${volPct > 100 ? 'text-red-600 dark:text-red-300' : 'text-slate-500 dark:text-slate-400'}`}
                            >
                              {volVal.toFixed(2)} / {maxVolVal} cbm ({volPct.toFixed(2)}%)
                            </span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${volPct > 100 ? 'bg-red-500 dark:bg-red-300' : 'bg-yellow-500 dark:bg-yellow-300'}`}
                              style={{ width: `${Math.min(volPct, 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-10 text-gray-400 bg-slate-50 rounded-lg border border-dashed border-gray-200 dark:bg-slate-800 dark:border-slate-700">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-10 w-10 mb-2 opacity-50"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
              />
            </svg>
            <p className="text-sm font-medium">{t('common.click_for_detail')}</p>
          </div>
        )}
      </div>
    </BaseModal>
  );
};

export default memo(DailyLoadCapacityModal);
