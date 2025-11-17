'use client';

// (PERUBAHAN 1): Impor 'DatePicker' dan CSS-nya
import { useState } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { getTodayDateString, isDateSunday, formatDate } from '@/lib/utils';
import { toastError } from '../../lib/toastHelper';
import DeliverySummary from '@/features/reportData/DeliverySummary';
import RoutingSummary from '@/features/reportData/RoutingSummary';
import StartFinishSummary from '@/features/reportData/StartFinishSummary';

// (PERUBAHAN 3): Helper lokal untuk konversi string ke Date (aman)
const parseDate = (dateStr) => {
  return new Date(dateStr.replace(/-/g, '/'));
};

export default function TmsSummary({
  driverData,
  isAnyLoading,
  isMapping,
  selectedLocation,
  selectedLocationName,
  setIsAnyLoading,
  setIsMapping,
}) {
  // (PERUBAHAN 4): State 'selectedDate' sekarang adalah Date object
  const initialDate = parseDate(getTodayDateString());
  const [selectedDate, setSelectedDate] = useState(initialDate);
  // (State 'selectedUser' dihapus dari sini karena tidak terpakai)

  // (PERUBAHAN 5): 'handleDateChange' sekarang menerima Date object
  const handleDateChange = (date) => {
    if (!date) {
      toastError('Pilih tanggal pengiriman');
      return;
    }
    if (date.getDay() === 0) {
      toastError('Tidak ada pengiriman saat Minggu. Silahkan pilih tanggal lain');
      return;
    }
    setSelectedDate(date); // Update state dengan Date object
  };

  // (PERUBAHAN 6): Konversi state (Date) kembali ke string untuk props
  const selectedDateString = formatDate(selectedDate); // format: "YYYY-MM-DD"
  const isDateInvalid = isDateSunday(selectedDateString);

  return (
    <div className="flex flex-col items-center w-full max-w-6xl p-4">
      {!isMapping && (
        <>
          <h1 className="text-3xl sm:text-4xl font-bold mb-2 text-center">
            TMS Report
          </h1>

          <div className="mb-8 text-center w-full max-w-xs">
            <label htmlFor="shippingDate" className="block text-lg mb-2 text-gray-500">
              Pilih Tanggal Pengiriman
            </label>

            {/* --- (PERUBAHAN 7): Ganti <input> dengan <DatePicker> --- */}
            <DatePicker
              id="shippingDate"
              selected={selectedDate} // Prop 'selected' (bukan 'value')
              onChange={handleDateChange} // Handler baru
              disabled={isAnyLoading || isMapping}
              dateFormat="dd/MM/yyyy" // Format tampilan
              // Class yang sama, ditambah 'w-full' dan 'text-center'
              className="p-2 rounded border border-gray-300 bg-gray-50 text-slate-900 disabled:bg-gray-200 disabled:text-gray-400 w-full max-w-xs text-center"
            />
            {/* --- (SELESAI PERUBAHAN 7) --- */}
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
          selectedDate={selectedDateString} // <-- Kirim string
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
              selectedDate={selectedDateString} // <-- Kirim string
              selectedLocation={selectedLocation}
              selectedLocationName={selectedLocationName}
            />

            <StartFinishSummary
              driverData={driverData}
              isInputInvalid={isDateInvalid}
              isLoading={isAnyLoading || isMapping}
              onLoadingChange={setIsAnyLoading}
              selectedDate={selectedDateString} // <-- Kirim string
              selectedLocation={selectedLocation}
              selectedLocationName={selectedLocationName}
            />
          </>
        )}
      </div>
    </div>
  );
}
