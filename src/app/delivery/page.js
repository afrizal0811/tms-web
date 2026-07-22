// File: app/estimasi/page.js
'use client';

import AppLayout from '@/components/AppLayout';
import DeliveryPage from '@/features/delivery/DeliveryPage';

export default function EstimasiPage() {
  return (
    <AppLayout mainClassName="items-center px-4">
      <DeliveryPage />
    </AppLayout>
  );
}
