// File: features/dashboard/components/SequenceAccuracyChart.js
'use client';

import { memo, useEffect, useState } from 'react';
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

import DailySequenceAccuracyModal from '@/features/dashboard/modals/DailySequenceAccuracyModal';
import { processSequenceAccuracyData } from '@/lib/dashboardHelper';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-800 text-white text-xs p-3 rounded shadow-lg border border-slate-600 z-50 w-45">
        <p className="font-bold mb-2 text-sm border-b border-slate-600 pb-1">{label}</p>

        <div className="flex justify-between gap-4 mb-1">
          <span className="text-blue-400">● Manual</span>
          <span className="font-mono">{data.manual}</span>
        </div>
        <div className="flex justify-between gap-4 mb-1">
          <span className="text-emerald-400">● Sesuai</span>
          <span className="font-mono">{data.match}</span>
        </div>
        <div className="flex justify-between gap-4 mb-1">
          <span className="text-red-400">● Tidak Sesuai</span>
          <span className="font-mono">{data.mismatch}</span>
        </div>

        <div className="mt-2 pt-1 border-t border-slate-600 font-bold flex flex-col gap-0.5">
          <div className="flex justify-between gap-4">
            <span>Total Task</span>
            <span>{data.total}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span>Total Akurasi</span>
            <span>{data.rate}%</span>
          </div>
        </div>

        <p className="mt-2 text-[10px] text-slate-400 italic">Klik untuk detail harian</p>
      </div>
    );
  }
  return null;
};

function SequenceAccuracyChart({ allTasks }) {
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
      const fullMonth = dateObj.toLocaleDateString('id-ID', { month: 'long' });
      return `Sequence Accuracy ${fullMonth}`;
    } catch (e) {
      return `Sequence Accuracy ${selectedMonth.name || selectedMonth.label || selectedMonth.key}`;
    }
  };

  const isPreparing = monthlyData === null;
  const hasData = Array.isArray(monthlyData) && monthlyData.length > 0;

  return (
    <div className="w-full bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
      <div className="mb-6">
        <h3 className="text-lg font-bold text-slate-800">Sequence Accuracy</h3>
        <p className="text-sm text-gray-500">
          Kesesuaian urutan <span className="font-bold text-emerald-600">Routing</span> vs{' '}
          <span className="font-bold text-red-600">Aktual</span>.
        </p>
      </div>

      <div className="h-[350px] w-full">
        {isPreparing ? (
          // === SKELETON SAAT MENYIAPKAN DATA ===
          <div className="w-full h-full bg-slate-50 rounded-xl border border-slate-100 flex flex-col items-center justify-center text-slate-300">
            <div className="w-40 h-3 rounded-full bg-slate-100 mb-4 animate-pulse" />
            <div className="w-[90%] h-[70%] rounded-2xl bg-slate-100 animate-pulse" />
            <p className="mt-4 text-xs font-semibold tracking-wide uppercase">
              Menyiapkan Grafik...
            </p>
          </div>
        ) : !hasData ? (
          <div className="w-full h-full bg-slate-50 rounded-xl border border-dashed border-slate-200 flex items-center justify-center text-slate-400 text-sm">
            Tidak ada data untuk tahun ini.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#64748b', fontSize: 12 }}
                dy={10}
              />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f1f5f9' }} />
              <Legend
                iconType="circle"
                layout="horizontal"
                verticalAlign="top"
                align="right"
                wrapperStyle={{ paddingBottom: '20px', fontSize: '12px' }}
              />

              <Bar
                name="Sesuai"
                dataKey="match"
                stackId="a"
                fill="#22c55e"
                radius={[0, 0, 0, 0]}
                maxBarSize={50}
                onClick={handleBarClick}
                cursor="pointer"
              />
              <Bar
                name="Manual Assign"
                dataKey="manual"
                stackId="a"
                fill="#3b82f6"
                radius={[0, 0, 0, 0]}
                maxBarSize={50}
                onClick={handleBarClick}
                cursor="pointer"
              />
              <Bar
                name="Tidak Sesuai"
                dataKey="mismatch"
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

      <p className="text-xs text-gray-400 mt-4 text-center italic">
        Klik batang grafik untuk melihat detail per harinya.
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
