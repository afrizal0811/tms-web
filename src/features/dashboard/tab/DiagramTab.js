'use client';

import { useEffect, useState } from 'react';
import LoadCapacityChart from '../components/chart/LoadCapacityChart';
import SequenceAccuracyChart from '../components/chart/SequenceAccuracyChart';
import ServiceLevelChart from '../components/chart/ServiceLevelChart';
import ChartSkeleton from '../components/ChartSkeleton';

function DiagramTab({ yearlyTasks, hubId, driverData, selectedDate }) {
  const [renderStep, setRenderStep] = useState(0);
  const [prevTasks, setPrevTasks] = useState(yearlyTasks);
  
  if (yearlyTasks !== prevTasks) {
    setPrevTasks(yearlyTasks);
    setRenderStep(0);
  }

  useEffect(() => {
    // HAPUS: setRenderStep(0) dari sini. Reset sudah dilakukan di atas.

    if (yearlyTasks && yearlyTasks.length > 0) {
      // Jalankan animasi bertahap
      const t1 = setTimeout(() => setRenderStep(1), 200);
      const t2 = setTimeout(() => setRenderStep(2), 600);
      const t3 = setTimeout(() => setRenderStep(3), 1000);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    }
  }, [yearlyTasks]);

  return (
    <div className="w-full flex-1 flex flex-col gap-6 pb-4 overflow-auto">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Service Level */}
        {renderStep >= 1 ? (
          <ServiceLevelChart allTasks={yearlyTasks} hubId={hubId} />
        ) : (
          <ChartSkeleton title="Service Level" />
        )}

        {/* Chart 2: Sequence Accuracy */}
        {renderStep >= 2 ? (
          <SequenceAccuracyChart allTasks={yearlyTasks} />
        ) : (
          <ChartSkeleton title="Sequence Accuracy" />
        )}

        {/* Chart 3: Load Capacity (New) - Full Width */}
        <div className="lg:col-span-2">
          {renderStep >= 3 ? (
            <LoadCapacityChart
              tasks={yearlyTasks}
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
