// File: src/components/TmsSummary.js
'use client';

import { useState } from 'react';
import { getTodayDateString } from '@/lib/utils';

// Impor komponen-komponen baru kita
import RoutingSummary from '@/components/RoutingSummary';
import DeliverySummary from '@/components/DeliverySummary';
import StartFinishSummary from '@/components/StartFinishSummary';

// Terima 'selectedLocationName' dari props
export default function TmsSummary({ selectedLocation, selectedLocationName, selectedUser, driverData }) {
  // State tunggal di sini hanya untuk tanggal
  const [selectedDate, setSelectedDate] = useState(getTodayDateString());

  return (
    <div className="flex flex-col items-center w-full max-w-4xl p-4">
      {/* Title */}
      <h1 className="text-3xl sm:text-4xl font-bold mb-2 text-center"> {/* Margin diubah dari mb-6 ke mb-2 */}
        TMS Processing Summary
      </h1>

      {/* --- TAMBAHKAN SUBTITLE INI --- */}
      <h2 className="text-2xl mt-1 mb-6 text-yellow-400 font-semibold">
        {selectedLocationName}
      </h2>
      {/* --- SELESAI PENAMBAHAN --- */}


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
      <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 w-full justify-center">
        
        {/* Render Komponen Routing */}
        <RoutingSummary
          selectedDate={selectedDate}
          selectedLocation={selectedLocation}
          selectedLocationName={selectedLocationName} // Teruskan prop
          selectedUser={selectedUser}
          driverData={driverData}
        />
        
        {/* Render Komponen Delivery */}
        <DeliverySummary
          selectedDate={selectedDate}
          selectedLocation={selectedLocation}
          selectedLocationName={selectedLocationName} // Teruskan prop
          selectedUser={selectedUser}
          driverData={driverData}
        />
        
        {/* Render Komponen Start-Finish */}
        <StartFinishSummary
          selectedDate={selectedDate}
          selectedLocation={selectedLocation}
          selectedLocationName={selectedLocationName} // Teruskan prop
          selectedUser={selectedUser}
          driverData={driverData}
        />
        
      </div>
      {/* --- SELESAI KONTROL TOMBOL --- */}
      
    </div>
  );
}