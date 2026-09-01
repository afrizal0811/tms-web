'use client';

// File: app/report/bread/page.js

import AppLayout from '@/components/page/AppLayout';
import BreadReport from '@/features/reports/BreadReport';

export default function BreadReportPage() {
  return (
    <AppLayout mainClassName="items-center justify-center px-4">
      <BreadReport />
    </AppLayout>
  );
}
