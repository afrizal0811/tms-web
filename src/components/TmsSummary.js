// File: src/components/TmsSummary.js
'use client';

import { useState } from 'react';
import { getTodayDateString } from '@/lib/utils';
import toast from 'react-hot-toast'; // <-- 1. Pastikan toast di-impor

// Impor komponen-komponen
import RoutingSummary from '@/components/RoutingSummary';
import DeliverySummary from '@/components/DeliverySummary';
import StartFinishSummary from '@/components/StartFinishSummary';
import { toastError } from '../lib/toastHelper';

// --- 2. Fungsi helper untuk Cek Hari Minggu ---
const isDateSunday = (dateStr) => {
  // 'YYYY-MM-DD' diperlakukan sebagai UTC, jadi ganti ke '/'
  // agar diperlakukan sebagai waktu lokal & .getDay() konsisten
  const date = new Date(dateStr.replace(/-/g, '/'));
  return date.getDay() === 0; // 0 = Minggu
};
// --- Selesai Perubahan 2 ---

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
  const [isDateInvalid, setIsDateInvalid] = useState(() => isDateSunday(initialDate));
  // --- Selesai Perubahan 3 ---

  // --- 4. Handler Tanggal dengan Toast ---
  const handleDateChange = (e) => {
    const newDateStr = e.target.value;

    if (isDateSunday(newDateStr)) {
      setIsDateInvalid(true); // Tetap disable tombol
      toastError('Tidak ada pengiriman saat Minggu. Silahkan pilih tanggal lain'); // Tampilkan toast
    } else {
      setIsDateInvalid(false); // Hapus disable
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

          {/* --- 5. PERUBAHAN WARNA SUBTITLE --- */}
          <h2 className="text-2xl mt-1 mb-6 text-slate-900 font-semibold">
            {selectedLocationName}
          </h2>
          {/* --- Selesai Perubahan 5 --- */}

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
          isInputInvalid={isDateInvalid}
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
              isInputInvalid={isDateInvalid}
              isLoading={isAnyLoading || isMapping}
              onLoadingChange={setIsAnyLoading}
              selectedDate={selectedDate}
              selectedLocation={selectedLocation}
              selectedLocationName={selectedLocationName}
              selectedUser={selectedUser}
            />

            <StartFinishSummary
              driverData={driverData}
              isInputInvalid={isDateInvalid}
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
