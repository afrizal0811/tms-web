// File: app/estimasi/page.js
'use client';

import SelectionLayout from '@/components/page/SelectionLayout';
import DeliveryPage from '@/features/delivery/DeliveryPage';

export default function EstimasiPage() {
  return (
    <SelectionLayout>
      <DeliveryPage />
    </SelectionLayout>
  );
}
