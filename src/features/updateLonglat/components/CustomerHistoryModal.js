// File: src/features/updateLonglat/components/CustomerHistoryModal.js
'use client';

import { formatCoordinates } from '@/lib/utils';

export default function CustomerHistoryModal({ isOpen, onClose, data, customerName, dateRange }) {
  if (!isOpen) return null;

  const totalUpdates = data ? data.length : 0;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-start p-5 border-b border-gray-100 bg-gray-50 rounded-t-xl">
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              Riwayat Input{' '}
              <span className="text-sky-600">
                ({dateRange?.start} - {dateRange?.end})
              </span>
            </h3>
            <p className="text-sm text-gray-600 mt-1 font-medium break-all pr-4">{customerName}</p>
            <p className="text-xs text-slate-500 mt-1">
              Total Update: <span className="font-bold text-slate-800">{totalUpdates} kali</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content Table */}
        <div className="overflow-auto p-0 flex-1">
          {data && data.length > 0 ? (
            <table className="min-w-full text-xs text-left">
              <thead className="bg-white font-bold text-gray-700 sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="px-4 py-3 border-b w-[20%]">Tanggal</th>
                  <th className="px-4 py-3 border-b w-[25%] text-center">New Longlat</th>
                  <th className="px-4 py-3 border-b w-[20%] text-center">Beda Jarak (m)</th>
                  <th className="px-4 py-3 border-b w-[35%]">Driver</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.map((item, index) => (
                  <tr key={index} className="hover:bg-sky-50 transition-colors">
                    <td className="px-4 py-2 font-medium text-gray-700">{item.date}</td>
                    <td className="px-4 py-2 text-center font-mono text-slate-600 text-[11px]">
                      {item.longlat ? formatCoordinates(item.longlat) : '-'}
                    </td>
                    <td className="px-4 py-2 text-center font-semibold text-slate-700">
                      {item.distanceDiff !== null && item.distanceDiff !== undefined
                        ? item.distanceDiff.toLocaleString('id-ID')
                        : '-'}
                    </td>
                    <td className="px-4 py-2 text-gray-700 capitalize">{item.driverName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-gray-400">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-10 w-10 mb-2 opacity-50"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
              <p>Tidak ada riwayat update lokasi ditemukan dalam rentang waktu ini.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-xl flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-white border border-gray-300 text-gray-700 font-bold rounded-lg hover:bg-gray-100 transition-colors text-sm shadow-sm"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
