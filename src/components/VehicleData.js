// File: src/components/VehicleData.js
'use client';

import { useState, useEffect } from 'react';
import { normalizeEmail } from '@/lib/utils';
import * as XLSX from 'xlsx-js-style';
import Tooltip from './Tooltip'; // Asumsi Tooltip ada di file terpisah

// --- Styling Tema Putih ---
function TabButton({ children, isActive, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-6 py-3 font-semibold text-sm ${
        isActive ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'
      }`}
    >
      {children}
    </button>
  );
}
function Th({ children }) {
  return (
    <th className="p-3 text-left text-xs font-semibold text-gray-600 uppercase bg-gray-100 border-b border-gray-200">
      {children}
    </th>
  );
}
function Td({ children }) {
  return (
    <td className="p-3 text-sm text-gray-800 border-b border-gray-200 align-top">{children}</td>
  );
}
// --- Selesai Styling ---

// --- Komponen Pagination ---
function PaginationControls({
  totalItems,
  itemsPerPage,
  currentPage,
  onPageChange,
  onItemsPerPageChange,
}) {
  // ... (Kode PaginationControls tetap sama) ...
  const totalPages = itemsPerPage === 'all' ? 1 : Math.ceil(totalItems / itemsPerPage);
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      onPageChange(newPage);
    }
  };
  if (totalItems === 0) return null;
  return (
    <div className="flex flex-col sm:flex-row justify-between items-center mt-4 p-3">
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
// --- Selesai Komponen Pagination ---

export default function VehicleData() {
  const [activeTab, setActiveTab] = useState('master');
  const [vehicleData, setVehicleData] = useState([]);
  const [driverMap, setDriverMap] = useState(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // --- (PERUBAHAN 1): BUAT FUNGSI HELPER DI SINI ---
  const formatVolume = (vol) => {
    if (vol === null || vol === undefined) {
      return null; // Kembalikan null jika input kosong
    }
    const num = parseFloat(vol); // Ubah ke angka (jika string)
    if (isNaN(num)) {
      return null; // Kembalikan null jika bukan angka
    }
    // Bulatkan ke 12 desimal, lalu ubah lagi ke float
    // untuk menghapus nol di belakang koma (misal: 10800.00 -> 10800)
    return parseFloat(num.toFixed(12));
  };
  // --- SELESAI PERUBAHAN 1 ---

  useEffect(() => {
    // ... (Logika fetchData tetap sama) ...
    async function fetchData() {
      setIsLoading(true);
      setError(null);
      try {
        const userLocation = localStorage.getItem('userLocation');
        const driverDataString = localStorage.getItem('driverData');
        if (!userLocation) throw new Error('userLocation tidak ditemukan.');
        if (!driverDataString) throw new Error('driverData tidak ditemukan.');

        const drivers = JSON.parse(driverDataString);
        const map = new Map();
        for (const driver of drivers) {
          const normalizedEmail = normalizeEmail(driver.email);
          if (normalizedEmail) map.set(normalizedEmail, driver.name);
        }
        setDriverMap(map);

        const params = new URLSearchParams({ limit: 500, hubId: userLocation });
        const apiUrl = `/api/get-vehicles?${params.toString()}`;
        const response = await fetch(apiUrl);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Gagal mengambil data');

        if (data && Array.isArray(data.data)) {
          const sortedData = data.data.sort((a, b) => {
            const emailA = a.assignee || '';
            const emailB = b.assignee || '';
            return emailA.localeCompare(emailB);
          });
          setVehicleData(sortedData);
        } else {
          throw new Error('Format data API tidak sesuai.');
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  // Fungsi Download Excel
  const handleDownloadExcel = () => {
    setIsDownloading(true);
    try {
      const wb = XLSX.utils.book_new();
      const headerStyle = { font: { bold: true } };

      // ... (Sheet 1: Master Vehicle tetap sama) ...
      const headers1 = ['Plat', 'Type', 'Email', 'Name'];
      const data1 = vehicleData.map((v) => [
        v.name,
        v.tags?.[0] || null,
        v.assignee,
        driverMap.get(normalizeEmail(v.assignee)) || null,
      ]);
      const ws1 = XLSX.utils.aoa_to_sheet([headers1, ...data1]);
      ws1['!cols'] = [{ wch: 25 }, { wch: 25 }, { wch: 30 }, { wch: 30 }];
      ['A1', 'B1', 'C1', 'D1'].forEach((cell) => {
        if (ws1[cell]) ws1[cell].s = headerStyle;
      });
      XLSX.utils.book_append_sheet(wb, ws1, 'Master Vehicle');

      // Sheet 2: Template Vehicle
      const headers2 = [
        'Name*',
        'Assignee',
        'Start Time',
        'End Time',
        'Break Start',
        'Break End',
        'Multiday',
        'Speed Km/h',
        'Cost Factor',
        'Vehicle Tags',
        'Odd Even',
        'Weight Min',
        'Weight Max',
        'Volume Min',
        'Volume Max',
      ];
      const data2 = vehicleData.map((v) => [
        v.name,
        v.assignee,
        v.workingTime?.startTime || null,
        v.workingTime?.endTime || null,
        v.breaktime?.startTime || null,
        v.breaktime?.endTime || null,
        v.workingTime?.multiday || 0,
        v.speed,
        null,
        v.tags?.join('; ') || null,
        v.oddEven,
        0,
        v.capacity?.weight?.max || null,
        0,

        // --- (PERUBAHAN 2): GUNAKAN FUNGSI HELPER DI EXCEL ---
        formatVolume(v.capacity?.volume?.max),
        // --- SELESAI PERUBAHAN 2 ---
      ]);
      const ws2 = XLSX.utils.aoa_to_sheet([headers2, ...data2]);
      ws2['!cols'] = Array(headers2.length).fill({ wch: 20 });
      headers2.forEach((h, i) => {
        const cellRef = XLSX.utils.encode_cell({ c: i, r: 0 });
        if (ws2[cellRef]) ws2[cellRef].s = headerStyle;
      });
      XLSX.utils.book_append_sheet(wb, ws2, 'Template Vehicle');

      XLSX.writeFile(wb, 'Data_Kendaraan.xlsx');
    } catch (err) {
      console.error('Gagal membuat file excel:', err);
      alert('Gagal mengunduh file Excel: ' + err.message);
    } finally {
      setIsDownloading(false);
    }
  };

  // ... (Logika Filter, Handler Pagination, Kalkulasi Paginasi tetap sama) ...
  const filteredData = vehicleData.filter((v) => {
    const lowerCaseQuery = searchQuery.toLowerCase();
    const searchableString = [
      v.name,
      v.assignee,
      driverMap.get(normalizeEmail(v.assignee)),
      ...(v.tags || []),
    ]
      .join(' ')
      .toLowerCase();
    return searchableString.includes(lowerCaseQuery);
  });
  const handleItemsPerPageChange = (value) => {
    setItemsPerPage(value === 'all' ? 'all' : Number(value));
    setCurrentPage(1);
  };
  const totalItems = filteredData.length;
  const paginatedData =
    itemsPerPage === 'all'
      ? filteredData
      : filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // ... (Tampilan loading dan error tetap sama) ...
  if (isLoading) {
    /* ... */
  }
  if (error) {
    /* ... */
  }

  return (
    <div className="w-full max-w-none px-4 sm:px-6">
      {/* Kontrol Atas: Search dan Download */}
      <div className="mb-4 flex flex-col sm:flex-row justify-between items-center">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setCurrentPage(1);
          }}
          placeholder="Cari (Plat, Email, Nama, Tag)..."
          className="w-full max-w-sm p-2 border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 mb-2 sm:mb-0"
        />
        <button
          onClick={handleDownloadExcel}
          disabled={isDownloading}
          className="px-4 py-2 w-40 text-center bg-green-600 text-white font-semibold rounded-md hover:bg-green-700 disabled:bg-green-700"
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

      {/* Kontrol Tab */}
      <div className="flex space-x-1 border-b border-gray-200">
        <TabButton isActive={activeTab === 'master'} onClick={() => setActiveTab('master')}>
          Master Vehicle
        </TabButton>
        <TabButton isActive={activeTab === 'template'} onClick={() => setActiveTab('template')}>
          Template Vehicle
        </TabButton>
      </div>

      {/* Kontainer Tabel */}
      <div className="bg-white shadow-md rounded-b-lg">
        {/* ... (Tabel Master Vehicle tetap sama) ... */}
        {activeTab === 'master' && (
          <div className="overflow-x-auto">
            {/* ... (thead, tbody) ... */}
            <table className="w-full border-collapse min-w-[600px]">
              <thead>
                <tr>
                  <Th>Plat</Th>
                  <Th>Type</Th>
                  <Th>Email</Th>
                  <Th>Name</Th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((v) => (
                  <tr key={v._id} className="hover:bg-gray-50">
                    <Td>{v.name}</Td>
                    <Td>{v.tags?.[0] || null}</Td>
                    <Td>{v.assignee}</Td>
                    <Td>{driverMap.get(normalizeEmail(v.assignee)) || null}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'template' && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[1200px]">
              {/* ... (thead tetap sama) ... */}
              <thead>
                <tr>
                  <Th>Name*</Th>
                  <Th>Assignee</Th>
                  <Th>Start Time</Th>
                  <Th>End Time</Th>
                  <Th>Break Start</Th>
                  <Th>Break End</Th>
                  <Th>Multiday</Th>
                  <Th>Speed Km/h</Th>
                  <Th>Cost Factor</Th>
                  <Th>Vehicle Tags</Th>
                  <Th>Odd Even</Th>
                  <Th>Weight Min</Th>
                  <Th>Weight Max</Th>
                  <Th>Volume Min</Th>
                  <Th>Volume Max</Th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((v) => (
                  <tr key={v._id} className="hover:bg-gray-50">
                    <Td>{v.name}</Td>
                    <Td>{v.assignee}</Td>
                    <Td>{v.workingTime?.startTime || null}</Td>
                    <Td>{v.workingTime?.endTime || null}</Td>
                    <Td>{v.breaktime?.startTime || null}</Td>
                    <Td>{v.breaktime?.endTime || null}</Td>
                    <Td>{v.workingTime?.multiday || 0}</Td>
                    <Td>{v.speed}</Td>
                    <Td>{null}</Td>
                    <Td>
                      {(() => {
                        const tags = v.tags || [];
                        if (tags.length === 0) return null;
                        const firstTag = tags[0];
                        const remainingTags = tags.slice(1);
                        const remainingCount = remainingTags.length;
                        if (remainingCount === 0) return firstTag;
                        return (
                          <Tooltip tooltipContent={remainingTags.join('\n')}>
                            <span>
                              {firstTag}; (+{remainingCount} lainnya)
                            </span>
                          </Tooltip>
                        );
                      })()}
                    </Td>
                    <Td>{v.oddEven}</Td>
                    <Td>0</Td>
                    <Td>{v.capacity?.weight?.max || null}</Td>
                    <Td>0</Td>

                    {/* --- (PERUBAHAN 2): GUNAKAN FUNGSI HELPER DI TABEL --- */}
                    <Td>{formatVolume(v.capacity?.volume?.max)}</Td>
                    {/* --- SELESAI PERUBAHAN 2 --- */}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Kontrol Paginasi */}
        <PaginationControls
          totalItems={totalItems}
          itemsPerPage={itemsPerPage}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={handleItemsPerPageChange}
        />
      </div>
    </div>
  );
}
