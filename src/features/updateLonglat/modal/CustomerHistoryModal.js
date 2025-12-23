// File: src/features/updateLonglat/components/CustomerHistoryModal.js
'use client';

import { formatCoordinates } from '@/lib/utils';
import dynamic from 'next/dynamic';
import { useMemo, useState } from 'react';
import BaseModal from '@/components/BaseModal';

// Import Peta secara Dynamic
const UpdateMap = dynamic(() => import('../components/UpdateMap'), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-slate-100 text-slate-400">
      Memuat Peta...
    </div>
  ),
});

export default function CustomerHistoryModal({ isOpen, onClose, data, customerName, dateRange }) {
  // State config: coords (koordinat) & ts (timestamp trigger)
  // State ini akan otomatis RESET ke awal setiap kali modal dibuka kembali (karena parent melakukan unmount)
  const [activeConfig, setActiveConfig] = useState({ coords: null, ts: 0 });

  const mapData = useMemo(() => {
    if (!data) return [];
    return data.filter((item) => item.newLonglat && item.oldLonglat);
  }, [data]);

  // Handle Klik Baris -> Fokus ke titik
  const handleRowClick = (item) => {
    if (!item.newLonglat) return;

    // Update state dengan timestamp agar UpdateMap mendeteksi perubahan (re-trigger flyTo)
    setActiveConfig((prev) => ({
      coords: item.newLonglat,
      ts: prev.ts + 1,
    }));
  };

  // Guard clause ini sebenarnya redundant jika parent sudah conditional rendering,
  // tapi tetap bagus untuk keamanan komponen.
  if (!isOpen) return null;

  const totalUpdates = data ? data.length : 0;
  const headerContent = (
    <div>
      <h3 className="text-lg font-bold text-gray-900">
        Riwayat Input{' '}
        <span className="text-sky-600">
          ({dateRange?.start} - {dateRange?.end})
        </span>
      </h3>
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 mt-1 font-normal">
        <p className="text-sm text-gray-600 font-medium break-all">{customerName}</p>
        <p className="text-xs text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200 shadow-sm inline-block w-fit">
          Total Update: <span className="font-bold text-slate-800">{totalUpdates} kali</span>
        </p>
      </div>
    </div>
  );

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={headerContent}
      maxWidth="max-w-7xl"
      headerClassName="bg-gray-50 border-b border-gray-100" // Custom header style (terang)
      bodyClassName="p-0 flex flex-col lg:flex-row overflow-hidden" // Override padding body untuk layout split
    >
      {/* Kolom Kiri: Tabel */}
      <div className="w-full lg:w-1/2 flex-1 overflow-auto border-r border-gray-200 flex flex-col order-1 bg-white h-[400px] lg:h-auto">
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
              {data.map((item, index) => {
                const isActive = activeConfig.coords === item.newLonglat;
                return (
                  <tr
                    key={index}
                    onClick={() => handleRowClick(item)}
                    className={`transition-colors cursor-pointer ${
                      isActive ? 'bg-sky-100' : 'hover:bg-sky-50'
                    }`}
                  >
                    <td className="px-4 py-2 font-medium text-gray-700">{item.date}</td>
                    <td className="px-4 py-2 text-center font-mono text-slate-600 text-[11px]">
                      {item.newLonglat ? formatCoordinates(item.newLonglat) : '-'}
                    </td>
                    <td className="px-4 py-2 text-center font-semibold text-slate-700">
                      {item.distanceDiff !== null && item.distanceDiff !== undefined
                        ? item.distanceDiff.toLocaleString('id-ID')
                        : '-'}
                    </td>
                    <td className="px-4 py-2 text-gray-700 capitalize">{item.driverName}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 p-8">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-12 w-12 mb-3 opacity-30"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <p>Tidak ada riwayat update.</p>
          </div>
        )}
      </div>

      {/* Kolom Kanan: Peta */}
      <div className="w-full lg:w-1/2 bg-slate-50 h-[400px] lg:h-auto relative border-t lg:border-t-0 lg:border-l border-gray-200 shrink-0 order-2">
        {mapData.length > 0 ? (
          <div className="absolute inset-0 p-4">
            <UpdateMap
              data={mapData}
              activeCoords={activeConfig.coords}
              highlightTrigger={activeConfig.ts}
            />
            <div
              className="absolute bottom-6 left-6 bg-white/90 backdrop-blur px-3 py-2 rounded shadow text-[10px] border border-gray-200"
              style={{ zIndex: 1000 }}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                <span>Input User (Baru)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500 opacity-60"></span>
                <span>Master (Lama)</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm">
            Tidak ada data koordinat untuk ditampilkan.
          </div>
        )}
      </div>
    </BaseModal>
  );
}
