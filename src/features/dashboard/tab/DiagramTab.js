'use client';

import { useMemo } from 'react';
import LoadCapacityChart from '../components/chart/LoadCapacityChart';
import SequenceAccuracyChart from '../components/chart/SequenceAccuracyChart';
import ServiceLevelChart from '../components/chart/ServiceLevelChart';
import { useTheme } from 'next-themes';

function DiagramTab({ yearlyTasks, hubId, driverData, selectedDate }) {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  
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
    <div className="w-full flex-1 flex flex-col gap-6 pb-4 overflow-auto ">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ServiceLevelChart allTasks={filteredTasks} hubId={hubId} isDarkMode={isDarkMode} />
        <SequenceAccuracyChart allTasks={filteredTasks} isDarkMode={isDarkMode} />
        <div className="lg:col-span-2">
          <LoadCapacityChart
            tasks={filteredTasks}
            driverData={driverData}
            selectedYear={selectedDate}
            isDarkMode={isDarkMode}
          />
        </div>
      </div>
    </div>
  );
}

export default DiagramTab;
