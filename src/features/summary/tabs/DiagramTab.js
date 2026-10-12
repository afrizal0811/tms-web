'use client';

import { useTheme } from 'next-themes';
import { useMemo } from 'react';
import { formatDateUniversal } from '@/lib/utils';
import LoadCapacityChart from './components/chart/LoadCapacityChart';
import SequenceAccuracyChart from './components/chart/SequenceAccuracyChart';
import ServiceLevelChart from './components/chart/ServiceLevelChart';

function DiagramTab({ tasks = [], driverData = [], startDateStr, endDateStr, dateRange }) {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  const filteredTasks = useMemo(() => {
    if (!tasks || tasks.length === 0) return [];

    let start = startDateStr;
    let end = endDateStr;

    if ((!start || !end) && dateRange && dateRange[0] && dateRange[1]) {
      start = formatDateUniversal(new Date(dateRange[0]), 'YYYY-MM-DD');
      end = formatDateUniversal(new Date(dateRange[1]), 'YYYY-MM-DD');
    }

    if (!start || !end) return tasks;

    return tasks.filter((task) => {
      const dateStr = task.doneTime || task.finishTime || task.startTime || task.createdTime;
      if (!dateStr) return false;

      const taskDate = formatDateUniversal(dateStr, 'YYYY-MM-DD');
      if (taskDate === '-') return false;

      return taskDate >= start && taskDate <= end;
    });
  }, [tasks, startDateStr, endDateStr, dateRange]);

  return (
    <div className="w-full flex-1 flex flex-col gap-6 p-4 overflow-auto">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ServiceLevelChart allTasks={filteredTasks} isDarkMode={isDarkMode} />
        <SequenceAccuracyChart allTasks={filteredTasks} isDarkMode={isDarkMode} />
        <div className="lg:col-span-2">
          <LoadCapacityChart
            tasks={filteredTasks}
            driverData={driverData}
            isDarkMode={isDarkMode}
          />
        </div>
      </div>
    </div>
  );
}

export default DiagramTab;
