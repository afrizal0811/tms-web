'use client';

import SelectionLayout from '@/components/page/SelectionLayout';
import TaskCountReport from '@/features/reports/TaskCountReport';

export default function TaskCountReportPage() {
  return (
    <SelectionLayout>
      <TaskCountReport />
    </SelectionLayout>
  );
}
