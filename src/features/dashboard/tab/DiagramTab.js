'use client';

import { useMemo } from 'react';
import LoadCapacityChart from '../components/chart/LoadCapacityChart';
import SequenceAccuracyChart from '../components/chart/SequenceAccuracyChart';
import ServiceLevelChart from '../components/chart/ServiceLevelChart';

function DiagramTab({ yearlyTasks, hubId, driverData, selectedDate }) {
  // 1. Filtering Data (Memoized) - Cepat dan sinkron
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

  return (
    <div className="w-full flex-1 flex flex-col gap-6 pb-4 overflow-auto">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Service Level */}
        <ServiceLevelChart allTasks={filteredTasks} hubId={hubId} />

        {/* Chart 2: Sequence Accuracy */}
        <SequenceAccuracyChart allTasks={filteredTasks} />

        {/* Chart 3: Load Capacity (Full Width) */}
        <div className="lg:col-span-2">
          <LoadCapacityChart
            tasks={filteredTasks}
            driverData={driverData}
            selectedYear={selectedDate}
          />
        </div>
      </div>
    </div>
  );
}

export default DiagramTab;
