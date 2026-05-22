'use client';

import AppLayout from '@/components/AppLayout';
import TaskDetailReport from '@/features/reports/TaskDetailReport';

export default function TaskDetailPage() {
  return (
    <AppLayout mainClassName="items-center justify-center px-4">
      <TaskDetailReport />
    </AppLayout>
  );
}
