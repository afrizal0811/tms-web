// File: features/rangkuman/tabs/modals/DailyServiceLevelModal.js
'use client';

import Spinner from '@/components/Spinner';
import { memo } from 'react';
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

const DailyTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-800 text-white text-xs p-3 rounded shadow-lg border border-slate-600 z-50 w-45">
        <p className="font-bold mb-2 text-sm border-b border-slate-600 pb-1">Tanggal {label}</p>

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

        <div className="mt-2 pt-1 border-t border-slate-600 font-bold flex justify-between">
          <span>Rate</span>
          <span>{data.rate}%</span>
        </div>
      </div>
    );
  }
  return null;
};

function DailyServiceLevelModal({ isOpen, onClose, title, data, isLoading }) {
  if (!isOpen) return null;

  const hasData = Array.isArray(data) && data.length > 0;
  const hasPendingGR = hasData && data.some((d) => d.PENDING_GR > 0);

  return (
    <div
      className="fixed inset-0 z-9999 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-5xl overflow-hidden animate-in fade-in zoom-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-slate-800 px-6 py-4 flex justify-between items-center">
          <h3 className="text-lg font-bold text-white">{title}</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-2xl leading-none cursor-pointer"
          >
            &times;
          </button>
        </div>

        {/* Chart Body */}
        <div className="p-6 h-[400px] w-full bg-white">
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
                  name="Tanggal"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  dy={10}
                />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip content={<DailyTooltip />} cursor={{ fill: '#f1f5f9' }} />
                <Legend
                  iconType="circle"
                  verticalAlign="top"
                  align="right"
                  wrapperStyle={{ paddingBottom: '10px', fontSize: '12px' }}
                />

                <Bar
                  name="Sukses"
                  dataKey="SUKSES"
                  stackId="a"
                  fill="#22c55e"
                  radius={[0, 0, 0, 0]}
                  maxBarSize={40}
                />
                <Bar
                  name="Pending"
                  dataKey="PENDING"
                  stackId="a"
                  fill="#eab308"
                  radius={[0, 0, 0, 0]}
                  maxBarSize={40}
                />
                <Bar
                  name="Batal"
                  dataKey="BATAL"
                  stackId="a"
                  fill="#ef4444"
                  radius={[0, 0, 0, 0]}
                  maxBarSize={40}
                />
                <Bar
                  name="Partial"
                  dataKey="PARTIAL"
                  stackId="a"
                  fill="#f97316"
                  radius={[0, 0, 0, 0]}
                  maxBarSize={40}
                />
                {hasPendingGR && (
                  <Bar
                    name="Pending GR"
                    dataKey="PENDING_GR"
                    stackId="a"
                    fill="#d97706"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={40}
                  />
                )}
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400">
              Tidak ada data untuk bulan ini.
            </div>
          )}
        </div>

        <div className="px-6 py-3 bg-gray-50 border-t text-xs text-gray-500 text-right">
          Data lengkap tersedia di menu <strong className="text-slate-700">Rangkuman</strong> pada
          tab <strong className="text-slate-700">Truck Detail</strong> dan{' '}
          <strong className="text-slate-700">Pending Reasons</strong>
        </div>
      </div>
    </div>
  );
}

export default memo(DailyServiceLevelModal);
