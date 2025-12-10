// File: src/components/VehicleData.js
'use client';

import DownloadButton from '@/components/DownloadButton';
import Spinner from '@/components/Spinner';
import Tooltip from '@/components/Tooltip';
import { normalizeEmail } from '@/lib/utils';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { getVehicles } from '../../lib/apiService';
import { getOrFetchDriverData } from '../../lib/driverDataHelper';
import { toastError } from '../../lib/toastHelper';
import Pagination from './components/Pagination';
import TemplateTab from './components/TemplateTab';
import VehicleTab from './components/VehicleTab';
import { handleConfirmDownload } from './help';

function TabButton({ children, isActive, onClick }) {
  const [isTruncated, setIsTruncated] = useState(false);
  const buttonRef = useRef(null);

  useLayoutEffect(() => {
    const element = buttonRef.current;
    if (element) {
      const isTextTruncated = element.scrollWidth > element.clientWidth;
      if (isTextTruncated !== isTruncated) {
        setIsTruncated(isTextTruncated);
      }
    }
  }, [children, isTruncated]);

  const buttonElement = (
    <button
      ref={buttonRef}
      onClick={onClick}
      className={`px-4 py-3 font-semibold text-sm truncate w-40 shrink-0 ${
        isActive
          ? 'border-b-2 border-sky-600 text-sky-600'
          : 'text-gray-500 hover:text-gray-700 opacity-40 cursor-pointer '
      }`}
    >
      {children}
    </button>
  );

  if (isTruncated) {
    return <Tooltip tooltipContent={children}>{buttonElement}</Tooltip>;
  }

  return buttonElement;
}

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
  const [templateData, setTemplateData] = useState([]); // Data Murni

  const [isDownloadDropdownOpen, setIsDownloadDropdownOpen] = useState(false);
  const [sheetSelection, setSheetSelection] = useState({
    master: true,
    conditional: true,
    template: true,
  });
  const downloadDropdownRef = useRef(null);
  const downloadOptions = [
    { name: 'master', label: 'Master Vehicle' },
    { name: 'conditional', label: 'Conditional Vehicle', show: conditionalData.length > 0 },
    { name: 'template', label: 'Template Vehicle' },
  ];

  const noSheetSelected = !(
    sheetSelection.master ||
    sheetSelection.template ||
    (conditionalData.length > 0 && sheetSelection.conditional)
  );

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const userLocation = localStorage.getItem('userLocation');
        if (!userLocation) {
          throw new Error('Lokasi user tidak ditemukan. Harap kembali ke Halaman Utama.');
        }
        const drivers = await getOrFetchDriverData(userLocation);
        if (!drivers) {
          throw new Error('Gagal memuat data driver.');
        }
        const map = new Map();
        drivers.forEach((driver) => {
          const normalizedEmail = normalizeEmail(driver.email);
          if (normalizedEmail) map.set(normalizedEmail, driver.name);
        });
        setDriverMap(map);

        // 1. Ambil Data Mentah dari API
        const rawApiData = await getVehicles({
          limit: 500,
          hubId: userLocation,
        });

        if (rawApiData.length === 0) {
          throw new Error('Tidak ada data yang ditemukan.');
        }

        const sortByEmail = (a, b) => (a.assignee || '').localeCompare(b.assignee || '');

        setTemplateData([...rawApiData].sort(sortByEmail));

        let processedData = rawApiData.map((v) => ({
          ...v,
          tags: v.tags ? [...v.tags] : [], // Clone array tags
        }));

        try {
          const storedMapString = localStorage.getItem('vehicleTagMap');

          if (storedMapString) {
            const tagMap = JSON.parse(storedMapString);
            const hubMap = tagMap[userLocation];

            if (hubMap) {
              processedData.forEach((vehicle) => {
                if (!vehicle.tags || vehicle.tags.length === 0 || !vehicle.name) return;

                const originalTag = vehicle.tags[0];
                const plate = vehicle.name;

                const parts = originalTag.split('-');

                if (parts.length >= 2) {
                  const storagePrefix = parts[0];
                  const currentType = parts[1];

                  if (hubMap[plate] && hubMap[plate][currentType]) {
                    const mappedType = hubMap[plate][currentType];

                    const newFullTag = `${storagePrefix}-${mappedType}`;

                    // Update tag HANYA di processedData
                    vehicle.tags[0] = newFullTag;
                  }
                }
              });
            }
          }
        } catch (error) {
          toastError(`Gagal melakukan mapping vehicle tag: ${error}`);
        }

        const emailToVehiclesMap = new Map();
        for (const vehicle of processedData) {
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

        setMasterData(masterList.sort(sortByEmail));
        setConditionalData(conditionalList.sort(sortByEmail));
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
      const vehicleType = v.tags?.[0] || '';

      const searchableString = [
        v.name,
        v.assignee,
        driverMap.get(normalizeEmail(v.assignee)),
        vehicleType,
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
      <div className="flex flex-col md:flex-row justify-between items-center md:items-end bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-6 gap-2">
        <div className="w-full md:w-auto relative z-0">
          <label className="block text-xs text-gray-400 mb-1 ml-1 font-medium">Filter</label>
          <input
            className={`w-full max-w-full p-2 pr-8 border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 ${isLoading ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200' : 'bg-white text-slate-700 cursor-text '}`}
            disabled={isLoading}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Plat, Tipe, Customer, atau SO"
            type="text"
            value={searchQuery}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-10 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
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
        <div className="w-full md:w-auto relative z-50" ref={downloadDropdownRef}>
          <label className="block text-xs text-transparent mb-1 ml-1 font-medium select-none">
            Action
          </label>
          <DownloadButton
            onClick={() => setIsDownloadDropdownOpen((prev) => !prev)}
            disabled={isDownloading || isLoading}
            isLoading={isLoading || isDownloading}
            width="w-full md:w-auto"
          />
          {isDownloadDropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-md shadow-lg border border-gray-200 z-10">
              <div className="p-3">
                <p className="text-sm font-semibold text-gray-700 mb-2">
                  Pilih sheet untuk diunduh:
                </p>
                {downloadOptions.map((option) => {
                  if (option.show === false) return null;
                  return (
                    <label
                      key={option.name}
                      className="flex items-center space-x-2 p-2 rounded hover:bg-gray-50"
                    >
                      <input
                        type="checkbox"
                        name={option.name}
                        checked={sheetSelection[option.name]}
                        onChange={handleToggleChange}
                        className="form-checkbox h-4 w-4 text-sky-600 rounded curson-pointer"
                      />
                      <span className="text-sm text-gray-800">{option.label}</span>
                    </label>
                  );
                })}
              </div>
              <div className="border-t border-gray-200 p-2">
                <button
                  onClick={() =>
                    handleConfirmDownload({
                      masterData,
                      driverMap,
                      conditionalData,
                      sheetSelection,
                      templateData,
                      setIsDownloading,
                      setIsDownloadDropdownOpen,
                    })
                  }
                  disabled={isDownloading || noSheetSelected}
                  className="w-full px-4 py-2 cursor-pointer text-center bg-sky-600 text-white font-semibold rounded-md hover:bg-sky-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {isDownloading ? (
                    <div className="flex justify-center items-center">
                      <Spinner />
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

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 h-[600px] flex flex-col">
        {isLoading && (
          <div className="w-full flex justify-center items-center p-20">
            <Spinner />
          </div>
        )}
        {!isLoading && (
          <div className="flex space-x-1 border-b border-gray-200 shrink-0">
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
        )}

        {!isLoading && totalItems === 0 && (
          <p className="p-10 text-center text-gray-500">
            Tidak ada data ditemukan untuk filter ini.
          </p>
        )}

        {!isLoading && totalItems > 0 && (
          <div className="bg-white rounded-b-lg flex-1 flex flex-col justify-between overflow-hidden">
            {(activeTab === 'master' || activeTab === 'conditional') && (
              <VehicleTab paginatedData={paginatedData} driverMap={driverMap} />
            )}
            {activeTab === 'template' && (
              <TemplateTab paginatedData={paginatedData} driverMap={driverMap} />
            )}
            <div className="border-t border-gray-200 bg-white z-20 shrink-0">
              <Pagination
                totalItems={totalItems}
                itemsPerPage={itemsPerPage}
                currentPage={currentPage}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={handleItemsPerPageChange}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
