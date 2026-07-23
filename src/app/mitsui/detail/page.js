'use client';

import AppLayout from '@/components/AppLayout';
import TaskDetailReport from '@/features/mitsui/TaskDetailReport';

export default function MitsuiReportPage() {
  return (
    <AppLayout mainClassName="items-center justify-center px-4">
      <TaskDetailReport />
    </AppLayout>
  );
}
