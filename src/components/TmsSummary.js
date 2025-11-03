// File: src/components/TmsSummary.js
'use client';

import { useState } from 'react';
import { getTodayDateString } from '@/lib/utils';
import RoutingSummary from '@/components/RoutingSummary';
import DeliverySummary from '@/components/DeliverySummary';
import StartFinishSummary from '@/components/StartFinishSummary';

export default function TmsSummary({ selectedLocation, selectedLocationName, selectedUser, driverData }) {
  const [selectedDate, setSelectedDate] = useState(getTodayDateString());
  
  // --- TAMBAHKAN STATE INI ---
  const [isMapping, setIsMapping] = useState(false);
  // --- SELESAI PENAMBAHAN ---

  return (
    <div className="flex flex-col items-center w-full max-w-4xl p-4">
      
      {/* --- SEMBUNYIKAN ELEMEN-ELEMEN INI SAAT MAPPING --- */}
      {!isMapping && (
        <>
          <h1 className="text-3xl sm:text-4xl font-bold mb-2 text-center">
            TMS Processing Summary
          </h1>
          <h2 className="text-2xl mt-1 mb-6 text-yellow-400 font-semibold">
            {selectedLocationName}
          </h2>
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
        </>
      )}
      {/* --- SELESAI BLOK KONDISIONAL --- */}


      {/* --- KONTROL TOMBOL --- */}
      {/* Kita ubah 'justify-center' menjadi 'justify-around' atau 'justify-between' 
        jika isMapping=true agar komponen RoutingSummary bisa di tengah.
        Atau kita bisa tambahkan 'w-full' pada div ini.
      */}
      <div className={`flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 w-full ${isMapping ? 'justify-center' : 'justify-center'}`}>
        
        {/* Render Komponen Routing */}
        <RoutingSummary
          selectedDate={selectedDate}
          selectedLocation={selectedLocation}
          selectedLocationName={selectedLocationName} 
          selectedUser={selectedUser}
          driverData={driverData}
          // --- TAMBAHKAN PROP INI ---
          onMappingModeChange={setIsMapping} 
        />
        
        {/* --- SEMBUNYIKAN TOMBOL LAIN SAAT MAPPING --- */}
        {!isMapping && (
          <>
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
          </>
        )}
        {/* --- SELESAI BLOK KONDISIONAL --- */}
        
      </div>
    </div>
  );
}