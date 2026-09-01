// File: app/vehicles/page.js
'use client';

// Impor layout utama
import AppLayout from '@/components/page/AppLayout';
import VehicleData from '@/features/vehicleData/VehicleData';

export default function VehiclesPage() {
  return (
    <AppLayout mainClassName="items-center px-4">
      <VehicleData />
    </AppLayout>
  );
}
