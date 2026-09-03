'use client';

import AppLayout from '@/components/page/AppLayout';
import CustomReport from '@/features/reports/CustomReport';

export default function CustomReportPage() {
  return (
    <AppLayout mainClassName="items-center justify-center px-4">
      <CustomReport />
    </AppLayout>
  );
}
