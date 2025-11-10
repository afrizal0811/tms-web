// File: src/components/EstimasiDelivery.js
'use client';

import { formatSimpleTime, parseOutletName } from '@/lib/utils';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx-js-style';
import { toastError, toastSuccess } from '../../lib/toastHelper';
import Tooltip from '@/components/Tooltip';
import { getResultsSummary } from '../../lib/apiService';

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
  // 1. State untuk melacak apakah teks terpotong
  const [isTruncated, setIsTruncated] = useState(false);
  // 2. Ref untuk menunjuk ke elemen button
  const buttonRef = useRef(null);

  // 3. Gunakan useLayoutEffect untuk mengukur DOM setelah render
  //    (children = teks di dalam tombol, misal: "B 1234 ABC...")
  useLayoutEffect(() => {
    const element = buttonRef.current;
    if (element) {
      // 4. Cek apakah lebar konten (scrollWidth) > lebar elemen (clientWidth)
      const isTextTruncated = element.scrollWidth > element.clientWidth;

      // 5. Update state
      //    (Kita cek 'isTruncated' agar tidak re-render jika nilainya sama)
      if (isTextTruncated !== isTruncated) {
        setIsTruncated(isTextTruncated);
      }
    }
    // Jalankan pengecekan ini setiap kali 'children' (teks) berubah
  }, [children, isTruncated]);

  // 6. Buat elemen tombol
  const buttonElement = (
    <button
      ref={buttonRef} // Pasang ref ke tombol
      onClick={onClick}
      className={`cursor-pointer px-4 py-3 font-semibold text-sm truncate w-40 shrink-0 ${
        isActive ? 'border-b-2 border-sky-600 text-sky-600' : 'text-gray-500 hover:text-gray-700'
      }`}
    >
      {children}
    </button>
  );

  // 7. Logika Kondisional:
  // HANYA jika terpotong, bungkus tombol dengan Tooltip
  if (isTruncated) {
    return <Tooltip tooltipContent={children}>{buttonElement}</Tooltip>;
  }

  // 8. Jika tidak terpotong, kembalikan tombol biasa
  return buttonElement;
}
// --- (Helper Functions & Komponen Styling Lainnya - TIDAK BERUBAH) ---

function escapeRegExp(string) {
  if (!string) return '';
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

/**
 * Komponen untuk menyorot (highlight) teks yang cocok dengan query.
 */
function HighlightText({ text, highlight }) {
  // Jika tidak ada 'highlight' atau 'text', kembalikan teks asli
  if (!highlight || !text) {
    return text;
  }

  // Buat string pencarian yang aman untuk RegExp
  const safeHighlight = escapeRegExp(highlight);

  // Buat RegExp yang case-insensitive (gi = global, insensitive)
  const regex = new RegExp(`(${safeHighlight})`, 'gi');

  // Pisahkan teks berdasarkan bagian yang cocok
  const parts = text.split(regex);

  return (
    <span>
      {parts.map((part, i) =>
        part.toLowerCase() === highlight.toLowerCase() ? (
          <strong key={i} className="bg-yellow-300 text-black rounded-sm px-0.5">
            {part}
          </strong>
        ) : (
          part
        )
      )}
    </span>
  );
}

function parseSONumber(visitName) {
  if (!visitName) return '';
  const matches = visitName.match(/(SO|SS)\d{4}-\d+/g);
  return matches ? matches.join(', ') : null;
}

export default function EstimasiDelivery() {
  // ... (Semua state dan useEffect - TIDAK BERUBAH) ...
  const [selectedDate, setSelectedDate] = useState(() => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split('T')[0]; // Format YYYY-MM-DD
  });
  const [allRoutes, setAllRoutes] = useState([]);
  const [activeVehicleId, setActiveVehicleId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDateChange = (e) => {
    const newDateStr = e.target.value;

    const date = new Date(newDateStr.replace(/-/g, '/'));

    if (date.getDay() === 0) {
      toastError('Tidak ada pengiriman saat Minggu. Silahkan pilih tanggal lain');
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
      setAllRoutes([]);
      setActiveVehicleId(null);
      try {
        const userLocation = localStorage.getItem('userLocation');
        if (!userLocation) {
          throw new Error('userLocation tidak ditemukan di localStorage.');
        }
        const dateFrom = `${selectedDate} 00:00:00`;
        const dateTo = `${selectedDate} 23:59:59`;
        const resultsData = await getResultsSummary({
          hubId: userLocation,
          limit: 100,
          dateFrom: dateFrom,
          dateTo: dateTo,
        });

        const allDoneRoutingsRaw = resultsData
          .filter((item) => item.dispatchStatus === 'done' && item.result && item.result.routing)
          .flatMap((item) => item.result.routing);

        // 2. Buat Map untuk menampung rute unik
        const uniqueRoutesMap = new Map();

        // 3. Loop data mentah dan masukkan ke Map.
        // Kunci Map adalah vehicleId.
        // Jika ada ID duplikat, Map akan otomatis menimpanya.
        allDoneRoutingsRaw.forEach((route) => {
          if (route.vehicleId) {
            // Pastikan vehicleId ada
            uniqueRoutesMap.set(route.vehicleId, route);
          }
        });

        // 4. Ubah Map kembali menjadi Array
        const allDoneRoutings = Array.from(uniqueRoutesMap.values());

        // 5. Simpan data yang sudah bersih ke state
        setAllRoutes(allDoneRoutings);

        // Atur tab aktif pertama berdasarkan ID (logika ini tetap sama)
        if (allDoneRoutings.length > 0) {
          setActiveVehicleId(allDoneRoutings[0].vehicleId);
        } else {
          setActiveVehicleId(null);
        }
      } catch (err) {
        toastError(err.message);
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
        toastError('Tidak ada data untuk di-download.');
        return;
      } else {
        const locationName = localStorage.getItem('userLocationName') || 'Lokasi_Tidak_Ditemukan';
        const fileName = `Estimasi Delivery - ${locationName}.xlsx`;
        XLSX.writeFile(wb, fileName);
        toastSuccess('File Estimasi Delivery berhasil di-download!');
      }
    } catch (e) {
      toastError(e.message);
    } finally {
      setIsDownloading(false);
    }
  };
  // --- SELESAI PERUBAHAN ---

  useEffect(() => {
    // Jika kita punya ID kendaraan yang aktif
    if (activeVehicleId) {
      // Cek apakah ID itu MASIH ADA di daftar yang sudah difilter
      const isActiveVehicleStillPresent = filteredVehicleRoutes.some(
        (route) => route.vehicleId === activeVehicleId
      );

      // Jika TIDAK ADA, reset ke item pertama dari daftar baru
      if (!isActiveVehicleStillPresent) {
        setActiveVehicleId(
          filteredVehicleRoutes.length > 0
            ? filteredVehicleRoutes[0].vehicleId // ID item pertama
            : null // atau null jika daftar baru kosong
        );
      }
    } else if (filteredVehicleRoutes.length > 0) {
      // Jika belum ada ID aktif (misal load awal), atur ke item pertama
      setActiveVehicleId(filteredVehicleRoutes[0].vehicleId);
    }
  }, [filteredVehicleRoutes, activeVehicleId]);

  const activeRoute = useMemo(() => {
    if (!activeVehicleId) return null;
    return filteredVehicleRoutes.find((route) => route.vehicleId === activeVehicleId);
  }, [filteredVehicleRoutes, activeVehicleId]);

  return (
    <div className="w-full max-w-none px-4 sm:px-6 flex flex-col grow h-full">
      {/* 1. Kontrol Atas (Statis) (TIDAK BERUBAH) */}
      <div className="mb-4 flex flex-col sm:flex-row justify-between items-center shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2 mb-2 sm:mb-0 w-full sm:w-auto">
          <label htmlFor="estimasiDate" className="text-sm font-medium text-gray-600 mb-1 sm:mb-0">
            Tanggal Routing:
          </label>
          <input
            type="date"
            id="estimasiDate"
            value={selectedDate}
            onChange={handleDateChange}
            disabled={isLoading}
            className="p-2 border border-gray-300 rounded-md text-gray-900 w-full sm:w-auto"
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
          className="px-4 py-2 w-40 cursor-pointer text-center bg-sky-600 text-white font-semibold rounded-md hover:bg-sky-700 disabled:bg-gray-400"
        >
          {isDownloading ? (
            <div className="flex justify-center items-center">
              <div className="w-5 h-5 border-2 border-sky-300 border-t-white rounded-full animate-spin" />
            </div>
          ) : (
            'Download Excel'
          )}
        </button>
      </div>

      <div className="flex items-center border-b border-gray-200 shrink-0">
        <div className="flex flex-nowrap overflow-x-auto grow">
          {filteredVehicleRoutes.map((route, index) => {
            const id = route.vehicleId;
            return (
              <TabButton
                key={id ?? index}
                isActive={activeVehicleId === id}
                onClick={() => setActiveVehicleId(id)}
              >
                {route.vehicleName} {/* <--- INI AKAN MENJADI 'children' */}
              </TabButton>
            );
          })}
        </div>
      </div>

      {/* 3. Kontainer Tabel (Scrollable) */}
      <div className="bg-white shadow-md rounded-b-lg flex flex-col grow overflow-hidden min-h-0">
        {/* --- 3. GANTI BLOK DIV INI --- */}
        <div className="overflow-y-auto grow">
          {isLoading && (
            // Ganti SelectionLayout dengan spinner inline
            <div className="w-full flex justify-center items-center p-20">
              <div className="w-12 h-12 border-4 border-gray-200 border-t-sky-600 rounded-full animate-spin" />
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
                  const outletName = isHub ? null : parseOutletName(trip.visitName);
                  const soNumber = isHub ? null : parseSONumber(trip.visitName);

                  // --- TAMBAHKAN LOGIKA INI ---
                  let isMatch = false;
                  // Hanya cek jika ada query dan bukan HUB
                  if (searchQuery && !isHub) {
                    const lowerQuery = searchQuery.toLowerCase();
                    if (outletName && outletName.toLowerCase().includes(lowerQuery)) {
                      isMatch = true;
                    }
                    if (soNumber && soNumber.toLowerCase().includes(lowerQuery)) {
                      isMatch = true;
                    }
                  }

                  // Tentukan class untuk baris
                  const rowClass = isMatch
                    ? 'bg-yellow-100' // Warna highlight baris
                    : '';

                  return (
                    <tr
                      key={`${trip.visitId}-${trip.order}`}
                      className={`hover:bg-gray-50 ${rowClass}`}
                    >
                      <Td>
                        <p className={redText}>{trip.order}</p>
                      </Td>
                      <Td>
                        {isHub ? (
                          <strong className={redText}>HUB</strong>
                        ) : (
                          // Gunakan komponen HighlightText di sini
                          <HighlightText text={outletName} highlight={searchQuery} />
                        )}
                      </Td>
                      <Td>
                        {isHub ? (
                          ''
                        ) : (
                          // Gunakan komponen HighlightText di sini
                          <HighlightText text={soNumber} highlight={searchQuery} />
                        )}
                      </Td>
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
