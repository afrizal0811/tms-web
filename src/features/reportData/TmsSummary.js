'use client';

import DeliverySummary from '@/features/reportData/DeliverySummary';
import RoutingSummary from '@/features/reportData/RoutingSummary';
import StartFinishSummary from '@/features/reportData/StartFinishSummary';
import { getTodayDateString, isDateSunday } from '@/lib/utils';
import { useState } from 'react';
import { toastError } from '../../lib/toastHelper';
// (PERUBAHAN 1): Hapus impor 'BulkReportDownloader'
// import BulkReportDownloader from './BulkReportDownloader';

export default function TmsSummary({
  driverData,
  isAnyLoading,
  isMapping,
  selectedLocation,
  selectedLocationName,
  setIsAnyLoading,
  setIsMapping,
}) {
  const initialDate = getTodayDateString();
  const [selectedDate, setSelectedDate] = useState(initialDate);

  const handleDateChange = (e) => {
    const newDateStr = e.target.value;
    if (isDateSunday(newDateStr)) {
      toastError('Tidak ada pengiriman saat Minggu. Silahkan pilih tanggal lain');
      return;
    }
    setSelectedDate(newDateStr);
  };

  const isDateInvalid = isDateSunday(selectedDate);

  return (
    <div className="flex flex-col items-center w-full max-w-6xl p-4">
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
              onChange={handleDateChange}
              className="p-2 rounded border border-gray-300 bg-gray-50 text-slate-900 disabled:bg-gray-200 disabled:text-gray-400"
              disabled={isAnyLoading || isMapping}
            />
          </div>
        </>
      )}

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
            />

            <StartFinishSummary
              driverData={driverData}
              isInputInvalid={isDateInvalid}
              isLoading={isAnyLoading || isMapping}
              onLoadingChange={setIsAnyLoading}
              selectedDate={selectedDate}
              selectedLocation={selectedLocation}
              selectedLocationName={selectedLocationName}
            />
          </>
        )}
      </div>

      {/* --- (PERUBAHAN 2): Hapus komponen bulk downloader dari sini --- */}
      {/* {!isMapping && <BulkReportDownloader driverData={driverData} />} */}
      {/* --- (SELESAI PERUBAHAN 2) --- */}
    </div>
  );
}
