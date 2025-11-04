// File: src/components/TmsSummary.js
'use client';

import DeliverySummary from '@/components/DeliverySummary';
import RoutingSummary from '@/components/RoutingSummary';
import StartFinishSummary from '@/components/StartFinishSummary';
import { getTodayDateString } from '@/lib/utils';
import { useState } from 'react';

export default function TmsSummary({
  selectedLocation,
  selectedLocationName,
  selectedUser,
  driverData,
  isAnyLoading,
  setIsAnyLoading,
  isMapping,
  setIsMapping,
}) {
  const [selectedDate, setSelectedDate] = useState(getTodayDateString());

  return (
    <div className="flex flex-col items-center w-full max-w-4xl p-4">
      {/* --- SEMBUNYIKAN ELEMEN-ELEMEN INI SAAT MAPPING --- */}
      {!isMapping && (
        <>
          <h1 className="text-3xl sm:text-4xl font-bold mb-2 text-center">
            TMS Processing Summary
          </h1>
          <h2 className="text-2xl mt-1 mb-6 text-black-400 font-semibold">
            {selectedLocationName}
          </h2>
          <div className="mb-8 text-center">
            <label htmlFor="shippingDate" className="block text-lg mb-2 text-gray-600">
              Pilih Tanggal Pengiriman
            </label>
            <input
              disabled={isAnyLoading || isMapping}
              type="date"
              id="shippingDate"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="p-2 rounded border border-gray-300 bg-gray-50 text-slate-900 disabled:bg-gray-200 disabled:text-gray-400"
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
      <div
        className={`flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 w-full ${isMapping ? 'justify-center' : 'justify-center'}`}
      >
        <RoutingSummary
          selectedDate={selectedDate}
          selectedLocation={selectedLocation}
          selectedLocationName={selectedLocationName}
          selectedUser={selectedUser}
          driverData={driverData}
          onMappingModeChange={setIsMapping}
          disabled={isAnyLoading}
          onLoadingChange={setIsAnyLoading}
        />

        {!isMapping && (
          <>
            <DeliverySummary
              selectedDate={selectedDate}
              selectedLocation={selectedLocation}
              selectedLocationName={selectedLocationName}
              selectedUser={selectedUser}
              driverData={driverData}
              disabled={isAnyLoading}
              onLoadingChange={setIsAnyLoading}
            />

            <StartFinishSummary
              selectedDate={selectedDate}
              selectedLocation={selectedLocation}
              selectedLocationName={selectedLocationName}
              selectedUser={selectedUser}
              driverData={driverData}
              disabled={isAnyLoading}
              onLoadingChange={setIsAnyLoading}
            />
          </>
        )}
        {/* --- SELESAI BLOK KONDISIONAL --- */}
      </div>
    </div>
  );
}
