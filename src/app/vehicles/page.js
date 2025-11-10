// File: app/vehicles/page.js
'use client';

// Impor layout utama
import AppLayout from '@/components/AppLayout';
import VehicleData from '@/features/vehicleData/VehicleData';

export default function VehiclesPage() {
  return (
    <AppLayout>
      <VehicleData />
    </AppLayout>
  );
}
