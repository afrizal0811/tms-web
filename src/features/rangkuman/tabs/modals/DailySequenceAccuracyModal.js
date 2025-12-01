// File: features/rangkuman/tabs/modals/DailySequenceAccuracyModal.js
'use client';

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

const DailyTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-800 text-white text-xs p-3 rounded shadow-lg border border-slate-600 z-50">
        <p className="font-bold mb-2 text-sm border-b border-slate-600 pb-1">Tanggal {label}</p>

        <div className="flex justify-between gap-4 mb-1">
          <span className="text-emerald-400">● Sesuai:</span>
          <span className="font-mono">{data.match}</span>
        </div>
        <div className="flex justify-between gap-4 mb-1">
          <span className="text-blue-400">● Manual:</span>
          <span className="font-mono">{data.manual}</span>
        </div>
        <div className="flex justify-between gap-4 mb-1">
          <span className="text-red-400">● Mismatch:</span>
          <span className="font-mono">{data.mismatch}</span>
        </div>

        <div className="mt-2 pt-1 border-t border-slate-600 font-bold flex justify-between">
          <span>Akurasi:</span>
          <span>{data.rate}%</span>
        </div>
      </div>
    );
  }
  return null;
};

export default function DailySequenceAccuracyModal({ isOpen, onClose, title, data }) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
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
            className="text-slate-400 hover:text-white text-2xl leading-none"
          >
            &times;
          </button>
        </div>

        {/* Chart Body */}
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
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip content={<DailyTooltip />} cursor={{ fill: '#f1f5f9' }} />
                {/* Legend Chart dimatikan karena sudah ada di footer, atau biarkan jika ingin double info */}
                {/* <Legend iconType="circle" verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: '10px', fontSize: '12px' }}/> */}

                <Bar
                  name="Sesuai"
                  dataKey="match"
                  stackId="a"
                  fill="#22c55e"
                  radius={[0, 0, 0, 0]}
                  maxBarSize={40}
                />
                <Bar
                  name="Manual Assign"
                  dataKey="manual"
                  stackId="a"
                  fill="#3b82f6"
                  radius={[0, 0, 0, 0]}
                  maxBarSize={40}
                />
                <Bar
                  name="Tidak Sesuai"
                  dataKey="mismatch"
                  stackId="a"
                  fill="#ef4444"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400">
              Tidak ada data untuk bulan ini.
            </div>
          )}
        </div>

        {/* UPDATE: Footer Layout (Kiri: Legend, Kanan: Info Tab) */}
        <div className="px-6 py-3 bg-gray-50 border-t text-xs text-gray-500 flex flex-col sm:flex-row justify-between items-center gap-2">
          {/* KIRI: Legenda Warna */}
          <div className="flex gap-4 font-medium">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 bg-[#22c55e] rounded-sm"></span>
              <span>Sesuai</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 bg-[#3b82f6] rounded-sm"></span>
              <span>Manual Assign</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 bg-[#ef4444] rounded-sm"></span>
              <span>Tidak Sesuai</span>
            </div>
          </div>

          {/* KANAN: Info Tab */}
          <div className="text-right">
            Data lengkap tersedia di tab <strong className="text-slate-700">Truck Detail</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
