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

import DailyLoadCapacityModal from '@/features/dashboard/modals/DailyLoadCapacityModal';
import { processLoadCapacityData } from '../help';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-800 text-white text-xs p-3 rounded shadow-lg border border-slate-600 z-50 min-w-[150px]">
        <p className="font-bold mb-2 text-sm border-b border-slate-600 pb-1">{label}</p>

        {/* Persentase ditampilkan di sini sesuai request */}
        <div className="flex justify-between gap-4 mb-1">
          <span className="text-red-400">● Overload (&gt;100%)</span>
          <span className="font-mono">{data.overload}</span>
        </div>
        <div className="flex justify-between gap-4 mb-1">
          <span className="text-orange-400">● Penuh (85-100%)</span>
          <span className="font-mono">{data.penuh}</span>
        </div>
        <div className="flex justify-between gap-4 mb-1">
          <span className="text-emerald-400">● Optimal (60-85%)</span>
          <span className="font-mono">{data.optimal}</span>
        </div>
        <div className="flex justify-between gap-4 mb-1">
          <span className="text-blue-400">● Rendah (40-60%)</span>
          <span className="font-mono">{data.rendah}</span>
        </div>
        <div className="flex justify-between gap-4 mb-1">
          <span className="text-slate-400">● Sangat Rendah (&lt;40%)</span>
          <span className="font-mono">{data.sangatRendah}</span>
        </div>
      </div>
    );
  }
  return null;
};

const LoadCapacityChart = ({ tasks, driverData, selectedYear }) => {
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(null);

  const chartData = useMemo(() => {
    const year = selectedYear ? selectedYear.getFullYear() : new Date().getFullYear();
    const fullData = processLoadCapacityData(tasks, driverData, year);

    return fullData.filter((m) => m.sangatRendah + m.rendah + m.optimal + m.penuh + m.overload > 0);
  }, [tasks, driverData, selectedYear]);

  const handleBarClick = (data, index) => {
    setSelectedMonthIndex(index);
  };

  const getModalTitle = (date) => {
    if (selectedMonthIndex === null) return '';
    const monthItem = chartData[selectedMonthIndex];
    const monthName = monthItem?.name || '';
    return `Load Capacity ${date ? date : ''} ${monthName}`;
  };

  const isEmpty = chartData.length === 0;

  return (
    <div className="w-full bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-slate-800">Load Capacity</h3>
        <p className="text-sm text-gray-500">
          Persentase pemakaian{' '}
          <span className="font-bold text-emerald-600">kapasitas kendaraan</span>
        </p>
      </div>

      <div className="w-full flex flex-col gap-4">
        <div className="w-full h-[350px]">
          {isEmpty ? (
            <div className="h-full flex items-center justify-center text-gray-400 italic bg-slate-50 rounded-lg border border-dashed border-gray-300">
              <div className="text-center">
                <p>Belum ada data muatan untuk tahun ini.</p>
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

                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f1f5f9' }} />

                {/* UPDATE: Posisi Legend di Atas (Top) */}
                <Legend
                  iconType="circle"
                  verticalAlign="top"
                  align="right"
                  wrapperStyle={{ paddingBottom: '10px', fontSize: '12px' }}
                />

                <Bar
                  name="Sangat Rendah"
                  dataKey="sangatRendah"
                  stackId="a"
                  fill="#94a3b8"
                  radius={[0, 0, 0, 0]}
                  maxBarSize={50}
                  onClick={handleBarClick}
                  cursor="pointer"
                />
                <Bar
                  name="Rendah"
                  dataKey="rendah"
                  stackId="a"
                  fill="#3b82f6"
                  radius={[0, 0, 0, 0]}
                  maxBarSize={50}
                  onClick={handleBarClick}
                  cursor="pointer"
                />
                <Bar
                  name="Optimal"
                  dataKey="optimal"
                  stackId="a"
                  fill="#10b981"
                  radius={[0, 0, 0, 0]}
                  maxBarSize={50}
                  onClick={handleBarClick}
                  cursor="pointer"
                />
                <Bar
                  name="Penuh"
                  dataKey="penuh"
                  stackId="a"
                  fill="#f97316"
                  radius={[0, 0, 0, 0]}
                  maxBarSize={50}
                  onClick={handleBarClick}
                  cursor="pointer"
                />
                <Bar
                  name="Overload"
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
          <p className="text-xs text-gray-400 text-center italic">
            Klik batang grafik untuk melihat detail per harinya.
          </p>
        )}

        <DailyLoadCapacityModal
          isOpen={selectedMonthIndex !== null}
          onClose={() => setSelectedMonthIndex(null)}
          title={(date) => getModalTitle(date)}
          monthData={selectedMonthIndex !== null ? chartData[selectedMonthIndex] : null}
        />
      </div>
    </div>
  );
};

export default memo(LoadCapacityChart);
