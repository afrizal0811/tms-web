// File: app/vehicles/page.js
'use client';

// Impor layout utama
import SelectionLayout from '@/components/page/SelectionLayout';
import VehicleData from '@/features/vehicleData/VehicleData';

export default function VehiclesPage() {
  return (
    <SelectionLayout>
      <VehicleData />
    </SelectionLayout>
  );
}
