// File: src/components/TmsSummary.js
// INI ADALAH FILE INDUK (MANAJER) YANG SUDAH BERSIH

'use client';

import { useState } from 'react';
import { getTodayDateString } from '@/lib/utils';

// Impor komponen-komponen baru kita
import RoutingSummary from '@/components/RoutingSummary';
import DeliverySummary from '@/components/DeliverySummary';
import StartFinishSummary from '@/components/StartFinishSummary';

export default function TmsSummary({
  selectedLocation,
  selectedLocationName,
  selectedUser,
  driverData
}) {
  const [selectedDate, setSelectedDate] = useState(getTodayDateString());

  // (SEMUA LOGIKA BERAT SUDAH DIPINDAH)

  return (
    <div className="flex flex-col items-center w-full max-w-4xl p-4">
      {/* Title */}
      <h1 className="text-3xl sm:text-4xl font-bold mb-6 text-center">
        TMS Processing Summary
      </h1>

      {/* Date Picker */}
      <div className="mb-8 text-center">
        <label htmlFor="shippingDate" className="block text-lg mb-2 text-gray-400">
          Pilih Tanggal Pengiriman
        </label>
        <input
          type="date"
          id="shippingDate"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="p-2 rounded border border-gray-600 bg-gray-700 text-white"
        />
      </div>

      {/* --- KONTROL TOMBOL --- */}
      {/* Komponen-komponen baru kita sekarang adalah tombol-tombol itu sendiri */}
      <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 w-full justify-center">
        
        {/* Render Komponen Routing */}
        <RoutingSummary
          selectedDate={selectedDate}
          selectedLocation={selectedLocation}
          selectedLocationName={selectedLocationName}
          selectedUser={selectedUser}
          driverData={driverData}
        />
        
        <DeliverySummary
          selectedDate={selectedDate}
          selectedLocation={selectedLocation}
          selectedLocationName={selectedLocationName} 
          selectedUser={selectedUser}
          driverData={driverData}
        />
        
        <StartFinishSummary
          selectedDate={selectedDate}
          selectedLocation={selectedLocation}
          selectedLocationName={selectedLocationName}
          selectedUser={selectedUser}
          driverData={driverData}
        />
        
      </div>
      {/* --- SELESAI KONTROL TOMBOL --- */}
      
    </div>
  );
}