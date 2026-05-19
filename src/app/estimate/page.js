// File: app/estimasi/page.js
'use client';

import AppLayout from '@/components/AppLayout';
import DeliveryEstimatePage from '@/features/deliveryEstimate/DeliveryEstimatePage';

export default function EstimasiPage() {
  return (
    <AppLayout mainClassName="items-center px-4">
      <DeliveryEstimatePage />
    </AppLayout>
  );
}
