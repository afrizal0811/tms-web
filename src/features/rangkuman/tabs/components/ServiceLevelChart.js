// File features/rangkuman/tabs/components/ServiceLevelChart.js
'use client';

import { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { processServiceLevelData } from '@/lib/dashboardHelper';
import DailyServiceLevelModal from '../modals/DailyServiceLevelModal';
import Spinner from '@/components/Spinner';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-800 text-white text-xs p-3 rounded shadow-lg border border-slate-600 z-50 w-45">
        <p className="font-bold mb-2 text-sm border-b border-slate-600 pb-1">{label}</p>

        <div className="flex justify-between gap-4 mb-1 text-emerald-400 font-bold">
          <span>● Sukses</span>
          <span className="font-mono">{data.SUKSES}</span>
        </div>
        {data.PENDING > 0 && (
          <div className="flex justify-between gap-4 mb-1 text-amber-400">
            <span>● Pending</span>
            <span className="font-mono">{data.PENDING}</span>
          </div>
        )}
        {data.BATAL > 0 && (
          <div className="flex justify-between gap-4 mb-1 text-red-400">
            <span>● Batal</span>
            <span className="font-mono">{data.BATAL}</span>
          </div>
        )}
        {data.PARTIAL > 0 && (
          <div className="flex justify-between gap-4 mb-1 text-orange-400">
            <span>● Partial</span>
            <span className="font-mono">{data.PARTIAL}</span>
          </div>
        )}
        {data.PENDING_GR > 0 && (
          <div className="flex justify-between gap-4 mb-1 text-yellow-600">
            <span>● Pending GR</span>
            <span className="font-mono">{data.PENDING_GR}</span>
          </div>
        )}

        <div className="mt-2 pt-1 border-t border-slate-600 font-bold flex justify-between text-white">
          <span>Total Task</span>
          <span>{data.total}</span>
        </div>
        <div className="mt-2 border-slate-600 font-bold flex justify-between text-white">
          <span>Success Rate</span>
          <span>{data.rate}%</span>
        </div>
        <p className="mt-2 text-[10px] text-slate-400 italic">Klik untuk detail harian</p>
      </div>
    );
  }
  return null;
};

export default function ServiceLevelChart({ allTasks, hubId }) {
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // 1. Data Bulanan (pastikan kita kirim hubId)
  const monthlyData = useMemo(
    () => processServiceLevelData(allTasks, 'monthly', null, hubId),
    [allTasks, hubId]
  );

  // 2. Data Harian
  const dailyData = useMemo(() => {
    if (!selectedMonth) return [];
    return processServiceLevelData(allTasks, 'daily', selectedMonth.key, hubId);
  }, [allTasks, selectedMonth, hubId]);

  // handler klik: dipasang di tiap Bar supaya payload tepat
  const handleBarClick = (data, index) => {
    // data bisa berupa payload atau object dengan payload
    const payload = data && data.payload ? data.payload : data;
    const entry = payload ?? monthlyData[index] ?? null;
    if (!entry) return;

    setIsProcessing(true);
    // kecilkan delay agar UI animasi terasa tetapi cepat
    setTimeout(() => {
      setSelectedMonth(entry);
      setIsProcessing(false);
    }, 80);
  };

  const getModalTitle = () => {
    if (!selectedMonth) return '';
    try {
      const [year, month] = selectedMonth.key.split('-');
      const dateObj = new Date(parseInt(year), parseInt(month) - 1, 1);
      const fullMonth = dateObj.toLocaleDateString('id-ID', { month: 'long' });
      return `Service Level ${fullMonth}`;
    } catch {
      return `Service Level ${selectedMonth.name || selectedMonth.label || selectedMonth.key}`;
    }
  };

  return (
    <div className="w-full bg-white p-6 rounded-xl border border-gray-200 shadow-sm relative">
      {isProcessing && (
        <div className="absolute inset-0 z-50 bg-white/70 backdrop-blur-[1px] flex flex-col items-center justify-center rounded-xl">
          <Spinner />
          <span className="text-xs font-bold text-slate-500 mt-2">Memuat detail...</span>
        </div>
      )}

      <div className="mb-6">
        <h3 className="text-lg font-bold text-slate-800">Service Level</h3>
        <p className="text-sm text-gray-500">
          Persentase task <span className="font-bold text-emerald-600">Sukses</span> vs{' '}
          <span className="font-bold text-red-600">Lainnya</span>.
        </p>
      </div>

      <div className="h-[350px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
            <XAxis
              dataKey="label"
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

            {/* Pasang onClick di tiap Bar supaya klik membuka modal */}
            <Bar
              name="Sukses"
              dataKey="SUKSES"
              stackId="a"
              fill="#22c55e"
              radius={[0, 0, 0, 0]}
              maxBarSize={50}
              cursor="pointer"
              onClick={handleBarClick}
            />
            <Bar
              name="Pending"
              dataKey="PENDING"
              stackId="a"
              fill="#eab308"
              radius={[0, 0, 0, 0]}
              maxBarSize={50}
              cursor="pointer"
              onClick={handleBarClick}
            />
            <Bar
              name="Batal"
              dataKey="BATAL"
              stackId="a"
              fill="#ef4444"
              radius={[0, 0, 0, 0]}
              maxBarSize={50}
              cursor="pointer"
              onClick={handleBarClick}
            />
            <Bar
              name="Partial"
              dataKey="PARTIAL"
              stackId="a"
              fill="#f97316"
              radius={[0, 0, 0, 0]}
              maxBarSize={50}
              cursor="pointer"
              onClick={handleBarClick}
            />
            <Bar
              name="Pending GR"
              dataKey="PENDING_GR"
              stackId="a"
              fill="#d97706"
              radius={[4, 4, 0, 0]}
              maxBarSize={50}
              cursor="pointer"
              onClick={handleBarClick}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <DailyServiceLevelModal
        isOpen={!!selectedMonth}
        onClose={() => setSelectedMonth(null)}
        title={getModalTitle()}
        data={dailyData}
      />
    </div>
  );
}
