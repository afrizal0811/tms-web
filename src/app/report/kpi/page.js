// File: src/app/help/page.js
'use client';

import AppLayout from '@/components/page/AppLayout';
import KpiReport from '@/features/reports/KpiReport';

export default function Page() {
  return (
    <AppLayout mainClassName="items-center justify-center px-4">
      <KpiReport />
    </AppLayout>
  );
}
