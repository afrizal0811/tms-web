// File: features/rangkuman/tabs/components/DailyServiceLevelModal.js
'use client';

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

const DailyTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-800 text-white text-xs p-3 rounded shadow-lg border border-slate-600 z-50">
        <p className="font-bold mb-1 text-sm">Tanggal {label}</p>
        <p>
          Rate: <span className="text-emerald-400 font-bold">{data.rate}%</span>
        </p>
        <p>
          Sukses: {data.success} / {data.total}
        </p>
      </div>
    );
  }
  return null;
};

// Helper Warna Batang
const getBarColor = (rate) => {
  if (rate >= 75) return '#22c55e'; // Hijau
  if (rate >= 50) return '#f97316'; // Orange
  return '#ef4444'; // Merah
};

export default function DailyServiceLevelModal({ isOpen, onClose, title, data }) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-9999 flex items-center justify-center bg-white/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-slate-800 px-6 py-4 flex justify-between items-center">
          <h3 className="text-lg font-bold text-white">{title}</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-2xl leading-none"
          >
            &times;
          </button>
        </div>

        <div className="p-6 h-[400px] w-full bg-white">
          {data && data.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis
                  dataKey="name"
                  name="Tanggal"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  dy={10}
                />
                <YAxis
                  domain={[0, 100]}
                  unit="%"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748b', fontSize: 12 }}
                />
                <Tooltip content={<DailyTooltip />} cursor={{ fill: '#f1f5f9' }} />

                {/* REMOVED: ReferenceLine (Target 95%) */}

                <Bar dataKey="rate" radius={[4, 4, 0, 0]} maxBarSize={40} animationDuration={800}>
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getBarColor(entry.rate)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400">
              Tidak ada data untuk bulan ini.
            </div>
          )}
        </div>

        <div className="px-6 py-3 bg-gray-50 border-t text-xs text-gray-500 text-right flex justify-between items-center">
          <div className="flex gap-3 font-medium">
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 bg-[#ef4444] rounded-sm"></span> &lt; 50%
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 bg-[#f97316] rounded-sm"></span> 50% - 74%
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 bg-[#22c55e] rounded-sm"></span> ≥ 75%
            </div>
          </div>
          <span>
            Data lengkap tersedia di tab <strong>Truck Detail</strong>.
          </span>
        </div>
      </div>
    </div>
  );
}
