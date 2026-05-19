'use client';

import AppLayout from '@/components/AppLayout';
import TaskCountReport from '@/features/reportData/TaskCountReport';

export default function LaporanJumlahTugasPage() {
  return (
    <AppLayout>
      <TaskCountReport />
    </AppLayout>
  );
}
