// File: src/components/EstimasiDelivery.js
'use client';

import { formatSimpleTime, getTodayDateString, parseOutletName } from '@/lib/utils';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx-js-style';

// --- (Komponen Styling: Th, Td, TabButton - TIDAK BERUBAH) ---
function Th({ children, widthClass = '' }) {
  return (
    <th
      className={`
      sticky top-0 z-10 
      p-3 text-left text-xs font-semibold text-gray-600 
      uppercase bg-gray-100 border-b border-gray-200
      ${widthClass} 
    `}
    >
      {children}
    </th>
  );
}
function Td({ children }) {
  return (
    <td className="p-3 text-sm text-gray-800 border-b border-gray-200 align-top">{children}</td>
  );
}
function TabButton({ children, isActive, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-3 font-semibold text-sm truncate w-40 shrink-0 ${
        isActive ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'
      }`}
    >
      {children}
    </button>
  );
}
// --- (Helper Functions & Komponen Styling Lainnya - TIDAK BERUBAH) ---

function parseSONumber(visitName) {
  if (!visitName) return '';
  const matches = visitName.match(/(SO|SS)\d{4}-\d+/g);
  return matches ? matches.join(', ') : null;
}

function PaginationControls({
  totalItems,
  itemsPerPage,
  currentPage,
  onPageChange,
  onItemsPerPageChange,
}) {
  const totalPages = itemsPerPage === 'all' ? 1 : Math.ceil(totalItems / itemsPerPage);
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      onPageChange(newPage);
    }
  };
  if (totalItems === 0) return null;
  return (
    <div className="flex flex-col sm:flex-row justify-between items-center p-3 border-t border-gray-200">
      <div className="flex items-center space-x-2 mb-2 sm:mb-0">
        <span className="text-sm text-gray-600">Tampilkan:</span>
        <select
          value={itemsPerPage}
          onChange={(e) => onItemsPerPageChange(e.target.value)}
          className="p-1 border border-gray-300 rounded-md text-sm"
        >
          <option value={10}>10</option>
          <option value={20}>20</option>
          <option value="all">Semua</option>
        </select>
        <span className="text-sm text-gray-600">dari {totalItems} data</span>
      </div>
      {itemsPerPage !== 'all' && (
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50"
          >
            ‹
          </button>
          <span className="text-sm text-gray-700">
            Halaman {currentPage} dari {totalPages}
          </span>
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50"
          >
            ›
          </button>
        </div>
      )}
    </div>
  );
}

export default function EstimasiDelivery() {
  // ... (Semua state dan useEffect - TIDAK BERUBAH) ...
  const [selectedDate, setSelectedDate] = useState(getTodayDateString());
  const [allRoutes, setAllRoutes] = useState([]);
  const [activeTab, setActiveTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [tabPageIndex, setTabPageIndex] = useState(0);
  const TABS_PER_PAGE = 10;

  const handleDateChange = (e) => {
    const newDateStr = e.target.value;

    const date = new Date(newDateStr.replace(/-/g, '/'));

    if (date.getDay() === 0) {
      toast.error('Tidak ada pengiriman saat Minggu. Silahkan pilih tanggal lain');
    }
    setSelectedDate(newDateStr); // Selalu update state
  };

  useEffect(() => {
    const date = new Date(selectedDate.replace(/-/g, '/'));
    if (date.getDay() === 0) {
      setAllRoutes([]); // Kosongkan data
      setIsLoading(false); // Pastikan loading berhenti
      return; // Stop, jangan fetch
    }

    async function fetchData() {
      setIsLoading(true);
      setActiveTab(0);
      setAllRoutes([]);
      try {
        const userLocation = localStorage.getItem('userLocation');
        if (!userLocation) {
          throw new Error('userLocation tidak ditemukan di localStorage.');
        }
        const dateFrom = `${selectedDate} 00:00:00`;
        const dateTo = `${selectedDate} 23:59:59`;
        const params = new URLSearchParams({
          hubId: userLocation,
          limit: 100,
          dateFrom: dateFrom,
          dateTo: dateTo,
        });
        const response = await fetch(`/api/get-results-summary?${params.toString()}`);
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Gagal mengambil data results');
        }
        if (!data || !data.data || !Array.isArray(data.data.data)) {
          throw new Error('Format data API tidak sesuai.');
        }
        const allDoneRoutings = data.data.data
          .filter((item) => item.dispatchStatus === 'done' && item.result && item.result.routing)
          .flatMap((item) => item.result.routing);
        setAllRoutes(allDoneRoutings);
      } catch (err) {
        toast.error(err.message);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [selectedDate]);
  const filteredVehicleRoutes = useMemo(() => {
    if (!searchQuery) {
      return allRoutes;
    }
    const lowerCaseQuery = searchQuery.toLowerCase();
    return allRoutes.filter((route) => {
      if (route.vehicleName && route.vehicleName.toLowerCase().includes(lowerCaseQuery)) {
        return true;
      }
      return route.trips.some((trip) => {
        if (trip.isHub) return false;
        const outlet = parseOutletName(trip.visitName)?.toLowerCase();
        const so = parseSONumber(trip.visitName)?.toLowerCase();
        return (outlet && outlet.includes(lowerCaseQuery)) || (so && so.includes(lowerCaseQuery));
      });
    });
  }, [allRoutes, searchQuery]);

  // --- (PERUBAHAN KUNCI): Logika Download Excel ---
  const handleDownloadExcel = () => {
    setIsDownloading(true);
    try {
      const wb = XLSX.utils.book_new();

      // Definisikan style
      const headerStyle = { font: { bold: true } };
      const redStyle = { font: { color: { rgb: 'FF0000' }, bold: true } }; // Style merah & bold
      const redStyleNoBold = { font: { color: { rgb: 'FF0000' } } }; // Style merah saja

      filteredVehicleRoutes.forEach((route, index) => {
        let sheetName = route.vehicleName.replace(/['"]/g, '');
        sheetName = sheetName.substring(0, 31);
        if (wb.SheetNames.includes(sheetName)) {
          sheetName = `${sheetName.substring(0, 28)} (${index})`;
        }

        const headers = [
          'No.',
          'Outlet',
          'SO',
          'Jam Buka',
          'Jam Tutup',
          'Estimasi Sampai',
          'Estimasi Berangkat',
        ];

        // Kita tidak bisa lagi menggunakan 'data.map' sederhana
        // Kita perlu membuat array of arrays yang berisi OBJEK SEL
        const dataForSheet = [];

        // 1. Tambahkan Header
        dataForSheet.push(headers.map((h) => ({ v: h, s: headerStyle })));

        // 2. Tambahkan Data Baris
        route.trips.forEach((trip, tripIndex) => {
          const isHub = trip.isHub;
          const isFirstHub = isHub && trip.order === 0;
          const isLastHub = isHub && tripIndex === route.trips.length - 1;

          // Tentukan style untuk baris ini
          const style = isHub ? redStyleNoBold : undefined;
          const hubStyle = isHub ? redStyle : undefined; // Bold untuk kata "HUB"

          const row = [
            { v: trip.order, s: style },
            { v: isHub ? 'HUB' : parseOutletName(trip.visitName), s: hubStyle || style },
            { v: isHub ? '' : parseSONumber(trip.visitName), s: style },
            { v: isHub ? '' : formatSimpleTime(trip.timeWindow?.startTime), s: style },
            { v: isHub ? '' : formatSimpleTime(trip.timeWindow?.endTime), s: style },
            { v: isFirstHub ? '' : formatSimpleTime(trip.eta), s: style },
            // (Perbaikan bug: gunakan trip.etd untuk Estimasi Berangkat)
            { v: isLastHub ? '' : formatSimpleTime(trip.etd), s: style },
          ];
          dataForSheet.push(row);
        });

        // Buat sheet dari array of cell objects
        const ws = XLSX.utils.aoa_to_sheet(dataForSheet, { cellStyles: true });
        ws['!cols'] = [
          { wch: 5 },
          { wch: 40 },
          { wch: 25 },
          { wch: 12 },
          { wch: 12 },
          { wch: 18 },
          { wch: 20 },
        ];

        // (Header style sudah diterapkan saat push, jadi baris ini tidak perlu lagi)
        // headers.forEach((h, i) => { ... });

        XLSX.utils.book_append_sheet(wb, ws, sheetName);
      });

      if (wb.SheetNames.length === 0) {
        toast.error('Tidak ada data untuk di-download.');
        return;
      } else {
        const locationName = localStorage.getItem('userLocationName') || 'Lokasi_Tidak_Ditemukan';
        const fileName = `Estimasi Delivery - ${locationName}.xlsx`;
        XLSX.writeFile(wb, fileName);
      }
    } catch (e) {
      toast.error(e.message);
    } finally {
      setIsDownloading(false);
    }
  };
  // --- SELESAI PERUBAHAN ---

  // ... (useEffect dependensi, Paginasi Tab, dll - TIDAK BERUBAH) ...
  useEffect(() => {
    setTabPageIndex(0);
  }, [filteredVehicleRoutes]);
  useEffect(() => {
    if (activeTab >= filteredVehicleRoutes.length) {
      setActiveTab(0);
    }
  }, [filteredVehicleRoutes, activeTab]);
  const totalTabs = filteredVehicleRoutes.length;
  const totalTabPages = Math.ceil(totalTabs / TABS_PER_PAGE);
  const tabSliceStart = tabPageIndex * TABS_PER_PAGE;
  const tabSliceEnd = Math.min(tabSliceStart + TABS_PER_PAGE, totalTabs);
  const visibleVehicleRoutes = filteredVehicleRoutes.slice(tabSliceStart, tabSliceEnd);
  const canGoPrevTabs = tabPageIndex > 0;
  const canGoNextTabs = tabPageIndex + 1 < totalTabPages;
  const handleNextTabs = () => {
    if (canGoNextTabs) setTabPageIndex((prev) => prev + 1);
  };
  const handlePrevTabs = () => {
    if (canGoPrevTabs) setTabPageIndex((prev) => prev - 1);
  };
  const activeRoute = filteredVehicleRoutes[activeTab];

  return (
    <div className="w-full max-w-none px-4 sm:px-6 flex flex-col grow h-full">
      {/* 1. Kontrol Atas (Statis) (TIDAK BERUBAH) */}
      <div className="mb-4 flex flex-col sm:flex-row justify-between items-center shrink-0">
        <div className="flex items-center space-x-2 mb-2 sm:mb-0">
          <label htmlFor="estimasiDate" className="text-sm font-medium text-gray-600">
            Tanggal:
          </label>
          <input
            type="date"
            id="estimasiDate"
            value={selectedDate}
            onChange={handleDateChange}
            disabled={isLoading}
            className="p-2 border border-gray-300 rounded-md text-gray-900"
          />
        </div>

        <div className="relative w-full max-w-sm mb-2 sm:mb-0">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari (Kendaraan, Outlet, SO)..."
            className="w-full p-2 pr-8 border border-gray-300 rounded-md text-gray-900 placeholder-gray-400"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-5 h-5"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        <button
          onClick={handleDownloadExcel}
          disabled={isDownloading || isLoading || filteredVehicleRoutes.length === 0}
          className="px-4 py-2 w-40 text-center bg-green-600 text-white font-semibold rounded-md hover:bg-green-700 disabled:bg-gray-400"
        >
          {isDownloading ? (
            <div className="flex justify-center items-center">
              <div className="w-5 h-5 border-2 border-green-300 border-t-white rounded-full animate-spin" />
            </div>
          ) : (
            'Download Excel'
          )}
        </button>
      </div>

      {/* 2. Kontrol Tab dengan Paginasi (TIDAK BERUBAH) */}
      <div className="flex items-center border-b border-gray-200 shrink-0">
        <button
          onClick={handlePrevTabs}
          disabled={!canGoPrevTabs}
          className="px-2 py-3 text-gray-500 disabled:text-gray-300 hover:text-blue-600"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={3}
            stroke="currentColor"
            className="w-5 h-5"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>

        <div className="flex flex-nowrap overflow-hidden grow">
          {visibleVehicleRoutes.map((route, localIndex) => {
            const globalIndex = tabSliceStart + localIndex;
            return (
              <TabButton
                key={route.vehicleId || globalIndex}
                isActive={activeTab === globalIndex}
                onClick={() => setActiveTab(globalIndex)}
              >
                {route.vehicleName}
              </TabButton>
            );
          })}
        </div>

        <button
          onClick={handleNextTabs}
          disabled={!canGoNextTabs}
          className="px-2 py-3 text-gray-500 disabled:text-gray-300 hover:text-blue-600"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={3}
            stroke="currentColor"
            className="w-5 h-5"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      </div>

      {/* 3. Kontainer Tabel (Scrollable) */}
      <div className="bg-white shadow-md rounded-b-lg flex flex-col grow overflow-hidden min-h-0">
        {/* --- 3. GANTI BLOK DIV INI --- */}
        <div className="overflow-y-auto grow">
          {isLoading && (
            // Ganti SelectionLayout dengan spinner inline
            <div className="w-full flex justify-center items-center p-20">
              <div className="w-12 h-12 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin" />
            </div>
          )}

          {/* Tampilkan jika TIDAK loading DAN (data kosong ATAU tidak ada tab aktif) */}
          {!isLoading && (filteredVehicleRoutes.length === 0 || !activeRoute) && (
            <p className="p-10 text-center text-gray-500">
              Tidak ada data ditemukan untuk tanggal atau filter ini.
            </p>
          )}

          {/* Tampilkan tabel HANYA jika TIDAK loading DAN ADA tab aktif */}
          {!isLoading && activeRoute && (
            <table className="w-full table-fixed border-collapse">
              <thead>
                <tr>
                  <Th widthClass="w-[5%]">No.</Th>
                  <Th widthClass="w-[30%]">Outlet</Th>
                  <Th widthClass="w-[20%]">SO</Th>
                  <Th widthClass="w-[10%]">Jam Buka</Th>
                  <Th widthClass="w-[10%]">Jam Tutup</Th>
                  <Th widthClass="w-[12.5%]">Estimasi Sampai</Th>
                  <Th widthClass="w-[12.5%]">Estimasi Berangkat</Th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {activeRoute.trips.map((trip, tripIndex) => {
                  const isHub = trip.isHub;
                  const isFirstHub = isHub && trip.order === 0;
                  const isLastHub = isHub && tripIndex === activeRoute.trips.length - 1;
                  const redText = isHub ? 'text-red-600' : '';

                  return (
                    <tr key={`${trip.visitId}-${trip.order}`} className="hover:bg-gray-50">
                      <Td>
                        <p className={redText}>{trip.order}</p>
                      </Td>
                      <Td>
                        {isHub ? (
                          <strong className={redText}>HUB</strong>
                        ) : (
                          parseOutletName(trip.visitName)
                        )}
                      </Td>
                      <Td>{isHub ? '' : parseSONumber(trip.visitName)}</Td>
                      <Td>{isHub ? '' : formatSimpleTime(trip.timeWindow?.startTime)}</Td>
                      <Td>{isHub ? '' : formatSimpleTime(trip.timeWindow?.endTime)}</Td>
                      <Td>
                        <p className={redText}>{isFirstHub ? '' : formatSimpleTime(trip.eta)}</p>
                      </Td>
                      <Td>
                        <p className={redText}>{isLastHub ? '' : formatSimpleTime(trip.etd)}</p>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
