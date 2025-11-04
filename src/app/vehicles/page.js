// File: app/vehicles/page.js
'use client';

// Impor layout utama
import AppLayout from '@/components/AppLayout';
import VehicleData from '@/components/VehicleData';

export default function VehiclesPage() {
  return (
    // HAPUS: mainClassName="px-6 sm:px-12"
    <AppLayout>
      {/* - HAPUS: <h1>Data Kendaraan</h1> 
        - Komponen <VehicleData> akan otomatis melebar
      */}
      <VehicleData />
    </AppLayout>
  );
}
