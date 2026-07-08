'use client';

import CustomDatePicker from '@/components/CustomDatePicker';

export default function DataSourceAuto({
  downloadMode,
  setDownloadMode,
  singleDate,
  setSingleDate,
  startDate,
  endDate,
  handleRangeChange,
  loading,
  absoluteMaxDate,
  dynamicMaxEndDate,
}) {
  return (
    <>
      <div className={`flex flex-col gap-2 ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
        <label className="text-sm font-semibold text-gray-700">Jenis Data</label>
        <div className="flex p-1 bg-gray-100 rounded-lg">
          <button
            type="button"
            onClick={() => setDownloadMode('single')}
            disabled={loading}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all duration-200 cursor-pointer ${
              downloadMode === 'single'
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Harian
          </button>
          <button
            type="button"
            onClick={() => setDownloadMode('bulk')}
            disabled={loading}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all duration-200 cursor-pointer ${
              downloadMode === 'bulk'
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Massal
          </button>
        </div>
      </div>

      <div
        className={`flex flex-col gap-2 transition-opacity ${
          loading ? 'opacity-50 pointer-events-none' : ''
        }`}
      >
        {downloadMode === 'single' ? (
          <>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">
              Tanggal Pengiriman
            </label>
            <CustomDatePicker
              selected={singleDate}
              onChange={(date) => setSingleDate(date)}
              disabled={loading}
              maxDate={absoluteMaxDate}
              disableSunday={true}
            />
          </>
        ) : (
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-500 mb-1 block">
              Rentang Tanggal Pengiriman
            </label>

            <CustomDatePicker
              selectsRange={true}
              startDate={startDate}
              endDate={endDate}
              onChange={handleRangeChange}
              disabled={loading}
              maxDate={dynamicMaxEndDate}
              disableSunday={true}
              placeholderText="Pilih tanggal awal - akhir"
              shouldCloseOnSelect={false}
            />

            <p className="text-[10px] text-gray-400 italic mt-1">*Maksimal 14 hari.</p>
          </div>
        )}
      </div>
    </>
  );
}
