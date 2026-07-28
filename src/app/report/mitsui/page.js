'use client';

import AppLayout from '@/components/AppLayout';
import MitsuiReport from '@/features/reports/MitsuiReport';

export default function MitsuiReportPage() {
  return (
    <AppLayout mainClassName="items-center justify-center px-4">
      <MitsuiReport />
    </AppLayout>
  );
}
