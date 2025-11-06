// File: src/components/VehicleData.js
'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { normalizeEmail } from '@/lib/utils';
import * as XLSX from 'xlsx-js-style';
import Tooltip from './Tooltip';
import { toastError } from '../lib/toastHelper';

// --- (Komponen Styling: TabButton, Th, Td - TIDAK BERUBAH) ---
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
// --- (Komponen PaginationControls - TIDAK BERUBAH) ---
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
// --- Selesai Komponen ---

export default function VehicleData() {
  const [activeTab, setActiveTab] = useState('master');
  const [driverMap, setDriverMap] = useState(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [masterData, setMasterData] = useState([]);
  const [conditionalData, setConditionalData] = useState([]);
  const [templateData, setTemplateData] = useState([]);

  const [isDownloadDropdownOpen, setIsDownloadDropdownOpen] = useState(false);
  const [sheetSelection, setSheetSelection] = useState({
    master: true,
    conditional: true,
    template: true,
  });
  const downloadDropdownRef = useRef(null);

  // Helper format volume (tidak berubah)
  const formatVolume = (vol) => {
    if (vol === null || vol === undefined) return null;
    const num = parseFloat(vol);
    if (isNaN(num)) return null;
    return parseFloat(num.toFixed(12));
  };

  // useEffect untuk fetch data (tidak berubah)
  useEffect(() => {
    // ... (Logika fetch data, pemisahan master/conditional/template - TIDAK BERUBAH) ...
    async function fetchData() {
      setIsLoading(true);
      try {
        const userLocation = localStorage.getItem('userLocation');
        const driverDataString = localStorage.getItem('driverData');
        if (!userLocation || !driverDataString) throw new Error('Data user tidak ditemukan.');

        const drivers = JSON.parse(driverDataString);
        const map = new Map();
        drivers.forEach((driver) => {
          const normalizedEmail = normalizeEmail(driver.email);
          if (normalizedEmail) map.set(normalizedEmail, driver.name);
        });
        setDriverMap(map);

        const params = new URLSearchParams({ limit: 500, hubId: userLocation });
        const apiUrl = `/api/get-vehicles?${params.toString()}`;
        const response = await fetch(apiUrl);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Gagal mengambil data');
        if (!data || !Array.isArray(data.data)) throw new Error('Format data API tidak sesuai.');

        const rawApiData = data.data;
        if (rawApiData.length === 0) {
          throw new Error('Tidak ada data yang ditemukan untuk tanggal ini.');
        }
        const emailToVehiclesMap = new Map();
        for (const vehicle of rawApiData) {
          const email = vehicle.assignee;
          if (email) {
            if (!emailToVehiclesMap.has(email)) {
              emailToVehiclesMap.set(email, []);
            }
            emailToVehiclesMap.get(email).push(vehicle);
          }
        }

        const masterList = [];
        const conditionalList = [];
        const countSpaces = (str) => (str.match(/ /g) || []).length;

        for (const [email, vehicles] of emailToVehiclesMap.entries()) {
          if (vehicles.length === 1) {
            const vehicle = vehicles[0];
            masterList.push(vehicle);
          } else {
            const sortedVehicles = [...vehicles].sort((a, b) => {
              return countSpaces(a.name) - countSpaces(b.name);
            });
            const masterVehicle = sortedVehicles[0];
            masterList.push(masterVehicle);
            for (let i = 1; i < sortedVehicles.length; i++) {
              const vehicle = sortedVehicles[i];
              if (countSpaces(vehicle.name) > 2) {
                conditionalList.push(vehicle);
              }
            }
          }
        }

        const sortByEmail = (a, b) => (a.assignee || '').localeCompare(b.assignee || '');
        setMasterData(masterList.sort(sortByEmail));
        setConditionalData(conditionalList.sort(sortByEmail));
        setTemplateData(rawApiData.sort(sortByEmail));
      } catch (err) {
        toastError(err.message);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  // useEffect untuk Click-Outside (tidak berubah)
  useEffect(() => {
    function handleClickOutside(event) {
      if (downloadDropdownRef.current && !downloadDropdownRef.current.contains(event.target)) {
        setIsDownloadDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [downloadDropdownRef]);

  // Handler untuk Checkbox/Toggle (tidak berubah)
  const handleToggleChange = (e) => {
    const { name, checked } = e.target;
    setSheetSelection((prev) => ({
      ...prev,
      [name]: checked,
    }));
  };

  // Logika Konfirmasi Download
  const handleConfirmDownload = () => {
    setIsDownloading(true);
    try {
      const wb = XLSX.utils.book_new();
      const headerStyle = { font: { bold: true } };

      // ... (Logika penambahan sheet - tidak berubah)
      if (sheetSelection.master) {
        const headers1 = ['Plat', 'Type', 'Email', 'Name'];
        const data1 = masterData.map((v) => [
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
      }
      if (sheetSelection.conditional && conditionalData.length > 0) {
        const headersC = ['Plat', 'Type', 'Email', 'Name'];
        const dataC = conditionalData.map((v) => [
          v.name,
          v.tags?.[0] || null,
          v.assignee,
          driverMap.get(normalizeEmail(v.assignee)) || null,
        ]);
        const wsC = XLSX.utils.aoa_to_sheet([headersC, ...dataC]);
        wsC['!cols'] = [{ wch: 25 }, { wch: 25 }, { wch: 30 }, { wch: 30 }];
        ['A1', 'B1', 'C1', 'D1'].forEach((cell) => {
          if (wsC[cell]) wsC[cell].s = headerStyle;
        });
        XLSX.utils.book_append_sheet(wb, wsC, 'Conditional Vehicle');
      }
      if (sheetSelection.template) {
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
        const data2 = templateData.map((v) => [
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
          formatVolume(v.capacity?.volume?.max),
        ]);
        const ws2 = XLSX.utils.aoa_to_sheet([headers2, ...data2]);
        ws2['!cols'] = Array(headers2.length).fill({ wch: 20 });
        headers2.forEach((h, i) => {
          const cellRef = XLSX.utils.encode_cell({ c: i, r: 0 });
          if (ws2[cellRef]) ws2[cellRef].s = headerStyle;
        });
        XLSX.utils.book_append_sheet(wb, ws2, 'Template Vehicle');
      }

      if (wb.SheetNames.length === 0) {
        alert('Pilih setidaknya satu sheet untuk di-download.');
      } else {
        // --- (PERUBAHAN 1): Nama File Dinamis ---
        const locationName = localStorage.getItem('userLocationName') || 'Lokasi_Tidak_Ditemukan';
        const fileName = `Data Kendaraan - ${locationName}.xlsx`;
        XLSX.writeFile(wb, fileName);
        // --- SELESAI PERUBAHAN 1 ---
      }
    } catch (err) {
      toastError(err.message);
    } finally {
      setIsDownloading(false);
      setIsDownloadDropdownOpen(false);
    }
  };

  // --- (Logika Filter/Paginasi - TIDAK BERUBAH) ---
  const sourceData = useMemo(() => {
    switch (activeTab) {
      case 'master':
        return masterData;
      case 'conditional':
        return conditionalData;
      case 'template':
        return templateData;
      default:
        return [];
    }
  }, [activeTab, masterData, conditionalData, templateData]);

  const filteredData = useMemo(() => {
    return sourceData.filter((v) => {
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
  }, [sourceData, searchQuery, driverMap]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeTab]);

  const handleItemsPerPageChange = (value) => {
    setItemsPerPage(value === 'all' ? 'all' : Number(value));
    setCurrentPage(1);
  };

  const totalItems = filteredData.length;
  const paginatedData = useMemo(() => {
    if (itemsPerPage === 'all') {
      return filteredData;
    }
    return filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  }, [filteredData, currentPage, itemsPerPage]);

  return (
    <div className="w-full max-w-none px-4 sm:px-6">
      {/* Kontrol Atas: Search dan Download */}
      <div className="mb-4 flex flex-col sm:flex-row justify-between items-center">
        {/* --- (PERUBAHAN 2): Input Search dengan Tombol Clear --- */}
        <div className="relative w-full max-w-sm mb-2 sm:mb-0">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1); // Reset halaman saat search
            }}
            placeholder="Cari (Plat, Email, Nama, Tag)..."
            // Tambahkan padding kanan (pr-8) untuk ruang 'X'
            className="w-full p-2 pr-8 border border-gray-300 rounded-md text-gray-900 placeholder-gray-400"
          />
          {/* Tombol Clear 'X' */}
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              aria-label="Hapus pencarian"
            >
              {/* Ikon X (Heroicons) */}
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
        {/* --- SELESAI PERUBAHAN 2 --- */}

        {/* Tombol Dropdown Download (Tidak berubah) */}
        <div className="relative" ref={downloadDropdownRef}>
          <button
            onClick={() => setIsDownloadDropdownOpen((prev) => !prev)}
            disabled={isDownloading}
            className="px-4 py-2 w-40 text-center bg-green-600 text-white font-semibold rounded-md hover:bg-green-700 disabled:bg-gray-400"
          >
            Download Excel
          </button>
          {isDownloadDropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-md shadow-lg border border-gray-200 z-10">
              <div className="p-3">
                <p className="text-sm font-semibold text-gray-700 mb-2">
                  Pilih sheet untuk di-download:
                </p>
                <label className="flex items-center space-x-2 p-2 rounded hover:bg-gray-50">
                  <input
                    type="checkbox"
                    name="master"
                    checked={sheetSelection.master}
                    onChange={handleToggleChange}
                    className="form-checkbox h-4 w-4 text-blue-600 rounded"
                  />
                  <span className="text-sm text-gray-800">Master Vehicle</span>
                </label>
                {conditionalData.length > 0 && (
                  <label className="flex items-center space-x-2 p-2 rounded hover:bg-gray-50">
                    <input
                      type="checkbox"
                      name="conditional"
                      checked={sheetSelection.conditional}
                      onChange={handleToggleChange}
                      className="form-checkbox h-4 w-4 text-blue-600 rounded"
                    />
                    <span className="text-sm text-gray-800">Conditional Vehicle</span>
                  </label>
                )}
                <label className="flex items-center space-x-2 p-2 rounded hover:bg-gray-50">
                  <input
                    type="checkbox"
                    name="template"
                    checked={sheetSelection.template}
                    onChange={handleToggleChange}
                    className="form-checkbox h-4 w-4 text-blue-600 rounded"
                  />
                  <span className="text-sm text-gray-800">Template Vehicle</span>
                </label>
              </div>
              <div className="border-t border-gray-200 p-2">
                <button
                  onClick={handleConfirmDownload}
                  disabled={isDownloading}
                  className="w-full px-4 py-2 text-center bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 disabled:bg-blue-700"
                >
                  {isDownloading ? (
                    <div className="flex justify-center items-center">
                      <div className="w-5 h-5 border-2 border-blue-300 border-t-white rounded-full animate-spin" />
                    </div>
                  ) : (
                    'Download'
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Kontrol Tab (Tidak berubah) */}
      <div className="flex space-x-1 border-b border-gray-200">
        <TabButton isActive={activeTab === 'master'} onClick={() => setActiveTab('master')}>
          Master Vehicle
        </TabButton>
        {conditionalData.length > 0 && (
          <TabButton
            isActive={activeTab === 'conditional'}
            onClick={() => setActiveTab('conditional')}
          >
            Conditional Vehicle
          </TabButton>
        )}
        <TabButton isActive={activeTab === 'template'} onClick={() => setActiveTab('template')}>
          Template Vehicle
        </TabButton>
      </div>

      {/* Kontainer Tabel (Tidak berubah) */}
      <div className="bg-white shadow-md rounded-b-lg">
        {(activeTab === 'master' || activeTab === 'conditional') && (
          <div className="overflow-x-auto">
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
                    <Td>{formatVolume(v.capacity?.volume?.max)}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Kontrol Paginasi (Tidak berubah) */}
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
