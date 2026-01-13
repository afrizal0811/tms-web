'use client';

import BaseModal from '@/components/BaseModal';
import Tooltip from '@/components/Tooltip';
import { useLanguage } from '@/context/LanguageContext';
import { isEmpty } from '@/lib/utils';
import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts';
import { getStatusBadge } from '../help';
import { toastError } from '@/lib/toastHelper';

const DailyLoadCapacityModal = ({ isOpen, onClose, title, monthData }) => {
  const { t, lang } = useLanguage(); // Tambahkan lang
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
          sangatRendah: 0,
          rendah: 0,
          optimal: 0,
          penuh: 0,
          overload: 0,
          trips: trips,
        };

        trips.forEach((t) => {
          if (t.maxPct > 100) stats.overload++;
          else if (t.maxPct >= 85) stats.penuh++;
          else if (t.maxPct >= 60) stats.optimal++;
          else if (t.maxPct >= 40) stats.rendah++;
          else stats.sangatRendah++;
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
    <div className="flex flex-col sm:flex-row justify-between items-center gap-2 text-xs text-gray-500">
      <div className="flex gap-4 font-medium overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
        <div className="flex items-center gap-1.5 whitespace-nowrap">
          <span className="w-3 h-3 bg-[#94a3b8] rounded-sm" />
          <span>&lt;40%</span>
        </div>
        <div className="flex items-center gap-1.5 whitespace-nowrap">
          <span className="w-3 h-3 bg-[#3b82f6] rounded-sm" />
          <span>40-60%</span>
        </div>
        <div className="flex items-center gap-1.5 whitespace-nowrap">
          <span className="w-3 h-3 bg-[#10b981] rounded-sm" />
          <span>60-85%</span>
        </div>
        <div className="flex items-center gap-1.5 whitespace-nowrap">
          <span className="w-3 h-3 bg-[#f97316] rounded-sm" />
          <span>85-100%</span>
        </div>
        <div className="flex items-center gap-1.5 whitespace-nowrap">
          <span className="w-3 h-3 bg-[#ef4444] rounded-sm" />
          <span>&gt;100%</span>
        </div>
      </div>
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
        {/* Section 1: Chart */}
        <div className="h-64 w-full">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  interval={0}
                />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                <RechartsTooltip
                  cursor={{ fill: '#f1f5f9' }}
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      let dayName = '';
                      if (monthData && monthData.key) {
                        try {
                          const [yearStr, monthStr] = monthData.key.split('-');
                          const year = parseInt(yearStr, 10);
                          const month = parseInt(monthStr, 10) - 1; // 0-indexed
                          const day = parseInt(label, 10);
                          const dateObj = new Date(year, month, day);

                          const locale = lang === 'id' ? 'id-ID' : 'en-GB';
                          dayName = dateObj.toLocaleDateString(locale, { weekday: 'long' });
                        } catch (e) {
                          toastError(t('dashboard.toast.parsing_date_error', { err: e.message }));
                        }
                      }

                      return (
                        <div className="bg-slate-800 text-white text-xs p-2 rounded shadow-lg z-50 min-w-[150px]">
                          <p className="font-bold mb-2 text-sm border-b border-slate-600 pb-1">
                            {t('common.date')} {label} {dayName && `(${dayName})`}
                          </p>
                          <div className="flex justify-between gap-4 mb-1">
                            <span className="text-red-400">
                              {t('dashboard.charts.load_capacity.overload')}:
                            </span>{' '}
                            {data.overload}
                          </div>
                          <div className="flex justify-between gap-4 mb-1">
                            <span className="text-orange-400">
                              {t('dashboard.charts.load_capacity.full')}:
                            </span>{' '}
                            {data.penuh}
                          </div>
                          <div className="flex justify-between gap-4 mb-1">
                            <span className="text-emerald-400">
                              {t('dashboard.charts.load_capacity.optimal')}:
                            </span>{' '}
                            {data.optimal}
                          </div>
                          <div className="flex justify-between gap-4 mb-1">
                            <span className="text-blue-400">
                              {t('dashboard.charts.load_capacity.low')}:
                            </span>{' '}
                            {data.rendah}
                          </div>
                          <div className="flex justify-between gap-4 mb-1">
                            <span className="text-slate-400">
                              {t('dashboard.charts.load_capacity.very_low')}:
                            </span>{' '}
                            {data.sangatRendah}
                          </div>
                          <div className="mt-2 text-[10px] text-slate-400 border-t border-slate-600 pt-1 italic text-center">
                            {t('common.click_for_detail')}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar
                  dataKey="sangatRendah"
                  stackId="a"
                  fill="#94a3b8"
                  onClick={handleBarClick}
                  cursor="pointer"
                />
                <Bar
                  dataKey="rendah"
                  stackId="a"
                  fill="#3b82f6"
                  onClick={handleBarClick}
                  cursor="pointer"
                />
                <Bar
                  dataKey="optimal"
                  stackId="a"
                  fill="#10b981"
                  onClick={handleBarClick}
                  cursor="pointer"
                />
                <Bar
                  dataKey="penuh"
                  stackId="a"
                  fill="#f97316"
                  onClick={handleBarClick}
                  cursor="pointer"
                />
                <Bar
                  dataKey="overload"
                  stackId="a"
                  fill="#ef4444"
                  radius={[4, 4, 0, 0]}
                  onClick={handleBarClick}
                  cursor="pointer"
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400 italic">
              {t('common.no_data')}
            </div>
          )}
        </div>

        {/* Section 2: Vehicle Detail List */}
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
                      // Layout: Mobile Grid (Driver+Status atas, Bar bawah), Desktop Flex
                      className="bg-slate-50 border border-slate-200 rounded-lg p-4 grid grid-cols-[1fr_auto] md:flex md:flex-row gap-4 items-start md:items-center hover:shadow-md transition-shadow"
                    >
                      <div className="min-w-0 md:w-40 md:shrink-0 overflow-hidden">
                        <p
                          className="font-bold text-slate-700 text-sm truncate"
                          title={trip.driverName}
                        >
                          {trip.driverName}
                        </p>
                        <div className="flex flex-col items-start gap-1 mt-1">
                          <p className="text-xs text-slate-500 font-mono font-bold bg-slate-200 inline-block px-1 rounded truncate max-w-full">
                            {trip.vehicleName}
                          </p>
                          <p className="text-xs text-slate-400">
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
                        <span className="text-[10px] text-slate-400 mt-1 text-right">
                          {t('dashboard.charts.load_capacity.bound_by')}: {trip.boundBy}
                        </span>
                      </div>

                      <div className="col-span-2 w-full md:flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <div className="flex flex-row md:flex-col lg:flex-row justify-between text-xs mb-1">
                            <span className="text-slate-600 font-medium">
                              {t('dashboard.charts.load_capacity.weight')}
                            </span>
                            <span
                              className={`${weightPct > 100 ? 'text-red-600 font-bold' : 'text-slate-500'}`}
                            >
                              {weightVal.toFixed(1)} / {maxWeightVal} kg ({weightPct.toFixed(2)}%)
                            </span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${weightPct > 100 ? 'bg-red-500' : 'bg-blue-500'}`}
                              style={{ width: `${Math.min(weightPct, 100)}%` }}
                            />
                          </div>
                        </div>
                        <div>
                          <div className="flex flex-row md:flex-col lg:flex-row justify-between text-xs mb-1">
                            <span className="text-slate-600 font-medium">
                              {t('dashboard.charts.load_capacity.volume')}
                            </span>
                            <span
                              className={`${volPct > 100 ? 'text-red-600 font-bold' : 'text-slate-500'}`}
                            >
                              {volVal.toFixed(2)} / {maxVolVal} cbm ({volPct.toFixed(2)}%)
                            </span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${volPct > 100 ? 'bg-red-500' : 'bg-purple-500'}`}
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
          <div className="flex flex-col items-center justify-center py-10 text-gray-400 bg-slate-50 rounded-lg border border-dashed border-gray-200">
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

export default DailyLoadCapacityModal;
