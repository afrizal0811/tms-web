'use client';

import { useEffect, useMemo, useState } from 'react';
import ChartSkeleton from '../components/ChartSkeleton';
import LoadCapacityChart from '../components/chart/LoadCapacityChart';
import SequenceAccuracyChart from '../components/chart/SequenceAccuracyChart';
import ServiceLevelChart from '../components/chart/ServiceLevelChart';

function DiagramTab({ yearlyTasks, hubId, driverData, selectedDate }) {
  const [renderStep, setRenderStep] = useState(0);

  // --- 1. FILTERING DATA (PER TAHUN) ---
  const filteredTasks = useMemo(() => {
    if (!yearlyTasks || !selectedDate) return [];

    const targetYear = new Date(selectedDate).getFullYear();

    return yearlyTasks.filter((task) => {
      const dateStr = task.doneTime || task.finishTime || task.createdTime;
      if (!dateStr) return false;
      const taskDate = new Date(dateStr);
      return taskDate.getFullYear() === targetYear;
    });
  }, [yearlyTasks, selectedDate]);

  // --- 2. LOGIKA STATE UPDATE (RENDER PHASE) ---
  // Kita simpan referensi data terakhir
  const [lastFilteredTasks, setLastFilteredTasks] = useState(filteredTasks);

  // Pola "Adjust State during Render" (Resmi React Docs)
  if (filteredTasks !== lastFilteredTasks) {
    setLastFilteredTasks(filteredTasks);

    // LOGIKA BARU DI SINI:
    if (filteredTasks && filteredTasks.length > 0) {
      setRenderStep(0); // Jika ada data -> Mulai animasi dari 0
    } else {
      setRenderStep(3); // Jika kosong -> Langsung tampilkan (skip animasi)
    }
  }

  // --- 3. JALANKAN ANIMASI BERTAHAP (SIDE EFFECT) ---
  useEffect(() => {
    // Effect ini HANYA jalan jika ada data DAN renderStep baru saja di-reset ke 0
    if (filteredTasks && filteredTasks.length > 0 && renderStep === 0) {
      const t1 = setTimeout(() => setRenderStep(1), 200); // Service Level
      const t2 = setTimeout(() => setRenderStep(2), 500); // Sequence
      const t3 = setTimeout(() => setRenderStep(3), 800); // Load Capacity

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    }
    // Kita tidak perlu 'else' di sini, karena kasus kosong sudah dihandle di poin 2
  }, [filteredTasks, renderStep]);

  return (
    <div className="w-full flex-1 flex flex-col gap-6 pb-4 overflow-auto">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Service Level */}
        {renderStep >= 1 ? (
          <ServiceLevelChart allTasks={filteredTasks} hubId={hubId} />
        ) : (
          <ChartSkeleton title="Service Level" />
        )}

        {/* Chart 2: Sequence Accuracy */}
        {renderStep >= 2 ? (
          <SequenceAccuracyChart allTasks={filteredTasks} />
        ) : (
          <ChartSkeleton title="Sequence Accuracy" />
        )}

        {/* Chart 3: Load Capacity (Full Width) */}
        <div className="lg:col-span-2">
          {renderStep >= 3 ? (
            <LoadCapacityChart
              tasks={filteredTasks}
              driverData={driverData}
              selectedYear={selectedDate}
            />
          ) : (
            <ChartSkeleton title="Load Capacity" />
          )}
        </div>
      </div>
    </div>
  );
}

export default DiagramTab;
