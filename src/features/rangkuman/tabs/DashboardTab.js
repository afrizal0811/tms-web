// File: features/rangkuman/tabs/DashboardTab.js
'use client';

import { useEffect, useState } from 'react';
import SequenceAccuracyChart from './components/SequenceAccuracyChart';
import ServiceLevelChart from './components/ServiceLevelChart';

// --- PINDAHKAN KE LUAR (FIX ERROR) ---
const ChartSkeleton = ({ title }) => (
  <div className="w-full bg-white p-6 rounded-xl border border-gray-200 shadow-sm h-[450px] flex flex-col animate-pulse">
    <div className="mb-6">
      <h3 className="text-lg font-bold text-slate-300">{title}</h3>
      <div className="h-4 w-1/3 bg-slate-100 rounded mt-2"></div>
    </div>
    <div className="flex-1 bg-slate-50 rounded-lg flex items-center justify-center text-slate-300 text-sm">
      Menyiapkan Grafik...
    </div>
  </div>
);

export default function DashboardTab({ yearlyTasks, selectedYear, selectedLocation }) {
  const yearNum = selectedYear ? selectedYear.getFullYear() : new Date().getFullYear();

  // State untuk menunda rendering chart agar tab switching terasa cepat
  const [renderStep, setRenderStep] = useState(0);

  useEffect(() => {
    // Reset saat data berubah
    //eslint-disable-next-line
    setRenderStep(0);

    if (yearlyTasks && yearlyTasks.length > 0) {
      // Delay render bertahap
      const t1 = setTimeout(() => setRenderStep(1), 200); // Render Chart 1
      const t2 = setTimeout(() => setRenderStep(2), 600); // Render Chart 2

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [yearlyTasks]);

  return (
    <div className="w-full h-full flex flex-col gap-6 pb-10 overflow-auto">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {!yearlyTasks || yearlyTasks.length === 0 ? (
          <div className="h-[350px] lg:col-span-2 flex items-center justify-center bg-gray-50 border border-dashed border-gray-300 rounded-xl text-gray-400">
            Tidak ada data yang ditemukan.
          </div>
        ) : (
          <>
            {/* Chart 1: Service Level */}
            {renderStep >= 1 ? (
              <ServiceLevelChart allTasks={yearlyTasks} hubId={selectedLocation} />
            ) : (
              <ChartSkeleton title="Service Level" />
            )}

            {/* Chart 2: Sequence Accuracy */}
            {renderStep >= 2 ? (
              <SequenceAccuracyChart allTasks={yearlyTasks} />
            ) : (
              <ChartSkeleton title="Sequence Accuracy" />
            )}
          </>
        )}
      </div>
    </div>
  );
}
