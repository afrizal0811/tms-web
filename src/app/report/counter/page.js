'use client';

import AppLayout from '@/components/page/AppLayout';
import TaskCountReport from '@/features/reports/TaskCountReport';

export default function LaporanJumlahTugasPage() {
  return (
    <AppLayout>
      <TaskCountReport />
    </AppLayout>
  );
}
