// File: app/vehicles/page.js
'use client';

// Impor layout utama
import AppLayout from '@/components/AppLayout';
import VehicleData from '@/components/VehicleData';

export default function VehiclesPage() {
  return (
    <AppLayout>
      <VehicleData />
    </AppLayout>
  );
}
