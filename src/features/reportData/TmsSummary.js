// File: src/components/TmsSummary.js
'use client';

import DeliverySummary from '@/features/reportData/DeliverySummary';
import RoutingSummary from '@/features/reportData/RoutingSummary';
import StartFinishSummary from '@/features/reportData/StartFinishSummary';
import { getTodayDateString, isDateSunday } from '@/lib/utils';
import { useState } from 'react';
import { toastError } from '../../lib/toastHelper';

export default function TmsSummary({
  driverData,
  isAnyLoading,
  isMapping,
  selectedLocation,
  selectedLocationName,
  selectedUser,
  setIsAnyLoading,
  setIsMapping,
}) {
  // --- 3. State untuk melacak validitas tanggal ---
  const initialDate = getTodayDateString();
  const [selectedDate, setSelectedDate] = useState(initialDate);
  // --- Selesai Perubahan 3 ---

  // --- 4. Handler Tanggal dengan Toast ---
  const handleDateChange = (e) => {
    const newDateStr = e.target.value;
    if (isDateSunday(newDateStr)) {
      toastError('Tidak ada pengiriman saat Minggu. Silahkan pilih tanggal lain');
      return;
    } 
    setSelectedDate(newDateStr); // Selalu update tanggal yang dipilih
  };
  // --- Selesai Perubahan 4 ---

  return (
    <div className="flex flex-col items-center w-full max-w-4xl p-4">
      {!isMapping && (
        <>
          <h1 className="text-3xl sm:text-4xl font-bold mb-2 text-center">
            TMS Processing Summary
          </h1>

          <div className="mb-8 text-center w-full max-w-xs">
            <label htmlFor="shippingDate" className="block text-lg mb-2 text-gray-500">
              Pilih Tanggal Pengiriman
            </label>
            <input
              type="date"
              id="shippingDate"
              value={selectedDate}
              onChange={handleDateChange} // Gunakan handler yang sudah diupdate
              className="p-2 rounded border border-gray-300 bg-gray-50 text-slate-900 disabled:bg-gray-200 disabled:text-gray-400"
              disabled={isAnyLoading || isMapping}
            />

            {/* Hapus blok <Alert> dari sini */}
          </div>
        </>
      )}

      {/* --- 6. LOGIKA DISABLED TOMBOL (Tetap ada) --- */}
      <div
        className={`flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 w-full ${isMapping ? 'justify-center' : 'justify-center'}`}
      >
        <RoutingSummary
          driverData={driverData}
          isLoading={isAnyLoading || isMapping}
          onLoadingChange={setIsAnyLoading}
          onMappingModeChange={setIsMapping}
          selectedDate={selectedDate}
          selectedLocation={selectedLocation}
          selectedLocationName={selectedLocationName}
          selectedUser={selectedUser}
        />

        {!isMapping && (
          <>
            <DeliverySummary
              driverData={driverData}
              isLoading={isAnyLoading || isMapping}
              onLoadingChange={setIsAnyLoading}
              selectedDate={selectedDate}
              selectedLocation={selectedLocation}
              selectedLocationName={selectedLocationName}
              selectedUser={selectedUser}
            />

            <StartFinishSummary
              driverData={driverData}
              isLoading={isAnyLoading || isMapping}
              onLoadingChange={setIsAnyLoading}
              selectedDate={selectedDate}
              selectedLocation={selectedLocation}
              selectedLocationName={selectedLocationName}
              selectedUser={selectedUser}
            />
          </>
        )}
      </div>
      {/* --- Selesai Perubahan 6 --- */}
    </div>
  );
}
