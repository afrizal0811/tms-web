// File: src/app/help/page.js
'use client';

import AppLayout from '@/components/AppLayout';
import KpiPage from '@/features/kpi/KpiPage';

export default function Page() {
  return (
    <AppLayout mainClassName="items-center justify-center px-4">
      <KpiPage />
    </AppLayout>
  );
}
