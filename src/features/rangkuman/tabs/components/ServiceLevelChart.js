// File: features/rangkuman/tabs/components/ServiceLevelChart.js
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
  Cell,
} from 'recharts';
import { processServiceLevelData } from '@/lib/dashboardHelper';
import DailyServiceLevelModal from './DailyServiceLevelModal';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-800 text-white text-xs p-3 rounded shadow-lg border border-slate-600 z-50">
        <p className="font-bold mb-1 text-sm">{label}</p>
        <p>
          Rate: <span className="text-emerald-400 font-bold">{data.rate}%</span>
        </p>
        <p>
          Sukses: {data.success} / {data.total}
        </p>
        <p className="mt-2 text-[10px] text-slate-400 italic">Klik untuk detail harian</p>
      </div>
    );
  }
  return null;
};

export default function ServiceLevelChart({ allTasks }) {
  const [selectedMonth, setSelectedMonth] = useState(null);

  const monthlyData = useMemo(() => processServiceLevelData(allTasks, 'monthly'), [allTasks]);

  const dailyData = useMemo(() => {
    if (!selectedMonth) return [];
    return processServiceLevelData(allTasks, 'daily', selectedMonth.key);
  }, [allTasks, selectedMonth]);

  const handleBarClick = (entry) => {
    if (entry && entry.key) {
      setSelectedMonth(entry);
    }
  };

  const getModalTitle = () => {
    if (!selectedMonth) return '';
    try {
      const [year, month] = selectedMonth.key.split('-');
      const dateObj = new Date(parseInt(year), parseInt(month) - 1, 1);
      const fullMonth = dateObj.toLocaleDateString('id-ID', { month: 'long' });

      return `Service Level ${fullMonth}`;
    } catch (e) {
      return `Service Level ${selectedMonth.name}`;
    }
  };

  return (
    <div className="w-full bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
      <div className="mb-6">
        {/* UPDATE: Judul Singkat */}
        <h3 className="text-lg font-bold text-slate-800">Service Level</h3>

        {/* UPDATE: Deskripsi Baru */}
        <p className="text-sm text-gray-500">
          Persentase Task <span className="font-bold text-[#22c55e]">Sukses</span>
        </p>
      </div>

      <div className="h-[350px] w-full">
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
            <YAxis
              domain={[0, 100]}
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#64748b', fontSize: 12 }}
              unit="%"
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f1f5f9' }} />

            <Bar
              dataKey="rate"
              radius={[4, 4, 0, 0]}
              maxBarSize={50}
              animationDuration={1000}
              onClick={handleBarClick}
              cursor="pointer"
            >
              {monthlyData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.key === selectedMonth?.key ? '#2563eb' : '#3b82f6'}
                  className="hover:opacity-80 transition-opacity"
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <p className="text-xs text-gray-400 mt-4 text-center italic">
        Klik batang grafik untuk melihat detail per harinya.
      </p>

      <DailyServiceLevelModal
        isOpen={!!selectedMonth}
        onClose={() => setSelectedMonth(null)}
        title={getModalTitle()}
        data={dailyData}
      />
    </div>
  );
}
