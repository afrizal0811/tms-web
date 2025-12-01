// File: features/rangkuman/tabs/DashboardTab.js
'use client';

import ServiceLevelChart from './components/ServiceLevelChart';

export default function DashboardTab({ yearlyTasks, selectedYear }) {
  // Komponen ini sekarang "Bodoh" (Stateless), hanya menerima data dan menampilkannya.
  // Tidak ada fetching data di sini.

  const yearNum = selectedYear ? selectedYear.getFullYear() : new Date().getFullYear();

  return (
    <div className="w-full h-full flex flex-col gap-6 pb-10 overflow-auto">
      {/* Info Header Sederhana */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-slate-700">Dashboard Tahun:</span>
          <span className="text-lg font-bold text-sky-600">{yearNum}</span>
        </div>
        <div className="text-xs text-slate-400">
          Data mencakup 1 Jan {yearNum} - 31 Des {yearNum}
        </div>
      </div>

      {/* Area Chart */}
      <div className="grid grid-cols-1 gap-6">
        {!yearlyTasks || yearlyTasks.length === 0 ? (
          <div className="h-[350px] flex items-center justify-center bg-gray-50 border border-dashed border-gray-300 rounded-xl text-gray-400">
            Belum ada data untuk tahun {yearNum}.
          </div>
        ) : (
          <ServiceLevelChart allTasks={yearlyTasks} />
        )}
      </div>
    </div>
  );
}
