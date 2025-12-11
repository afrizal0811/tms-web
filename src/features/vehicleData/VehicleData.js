// File: src/features/vehicleData/VehicleData.js
'use client';

import DownloadButton from '@/components/DownloadButton';
import BodyCard from '@/components/card/BodyCard'; // Import Card Reusable
import HeaderCard from '@/components/card/HeaderCard';
import { normalizeEmail } from '@/lib/utils';
import { useEffect, useMemo, useRef, useState } from 'react';
import { getVehicles } from '../../lib/apiService';
import { getOrFetchDriverData } from '../../lib/driverDataHelper';
import { toastError } from '../../lib/toastHelper';
import Pagination from './components/Pagination';
import TemplateTab from './components/TemplateTab';
import VehicleTab from './components/VehicleTab';

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

  // --- FETCH DATA LOGIC (TIDAK BERUBAH) ---
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
          tags: v.tags ? [...v.tags] : [],
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

  // --- FILTER & PAGINATION LOGIC ---
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

  // --- HEADER ITEMS ---
  const searchBar = (
    <div className="relative w-full">
      <input
        className={`w-full max-w-full p-2 pr-8 border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 ${
          isLoading
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200'
            : 'bg-white text-slate-700 cursor-text '
        }`}
        disabled={isLoading}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Plat, Customer, atau SO"
        type="text"
        value={searchQuery}
      />
      {searchQuery && (
        <button
          onClick={() => setSearchQuery('')}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
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
  );

  const downloadButton = (
    <DownloadButton
      onClick={() => setIsDownloadDropdownOpen((prev) => !prev)}
      disabled={isDownloading || isLoading}
      isLoading={isLoading || isDownloading}
      width="w-full md:w-auto"
    />
  );

  const headerItems = [
    { label: 'Filter', component: searchBar, hideLabel: false },
    { label: 'Action', component: downloadButton, hideLabel: true },
  ];

  // --- TABS CONFIGURATION ---
  // Card akan otomatis merender tab berdasarkan array ini
  const tabs = [
    { id: 'master', label: 'Master Vehicle' },
    // Hanya tampilkan tab Conditional jika ada datanya
    ...(conditionalData.length > 0 ? [{ id: 'conditional', label: 'Conditional Vehicle' }] : []),
    { id: 'template', label: 'Template Vehicle' },
  ];

  const subtitle = (
    <>
      Manajemen daftar <span className="font-semibold text-sky-600">kendaraan</span>
    </>
  );

  return (
    <div className="w-full max-w-none px-4 sm:px-6">
      <HeaderCard title="Data Kendaraan" subtitle={subtitle} items={headerItems} />

      <BodyCard
        tabs={tabs}
        activeTabId={activeTab}
        onTabClick={setActiveTab}
        isLoading={isLoading}
        loadingText="Memuat Data Kendaraan..."
        isEmpty={!isLoading && totalItems === 0}
        emptyMessage="Tidak ada data ditemukan untuk filter ini."
      >
        <div className="flex-1 flex flex-col justify-between overflow-hidden">
          {/* CONTENT TABLE */}
          {(activeTab === 'master' || activeTab === 'conditional') && (
            <VehicleTab paginatedData={paginatedData} driverMap={driverMap} />
          )}
          {activeTab === 'template' && (
            <TemplateTab paginatedData={paginatedData} driverMap={driverMap} />
          )}

          {/* PAGINATION (Sticky Bottom) */}
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
      </BodyCard>
    </div>
  );
}
