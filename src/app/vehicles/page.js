// File: app/vehicles/page.js
'use client';

// Impor layout utama
import SelectionLayout from '@/components/page/SelectionLayout';
import VehicleData from '@/features/vehicleData/VehicleDataPage';

export default function VehiclesPage() {
  return (
    <SelectionLayout>
      <VehicleData />
    </SelectionLayout>
  );
}
