'use client';

import AppLayout from '@/components/page/AppLayout';
import TaskCountReport from '@/features/reports/TaskCountReport';

export default function TaskCountReportPage() {
  return (
    <AppLayout>
      <TaskCountReport />
    </AppLayout>
  );
}
