// File: src/features/vehicleData/VehicleData.js
'use client';

import BodyCard from '@/components/card/BodyCard';
import HeaderCard from '@/components/card/HeaderCard';
import DownloadButton from '@/components/DownloadButton';
import SearchBar from '@/components/SearchBar';
import Spinner from '@/components/Spinner';
import { getLocalStorage } from '@/lib/localStorageHandler';
import { normalizeEmail } from '@/lib/utils';
import { useEffect, useMemo, useRef, useState } from 'react';
import { getVehicles } from '../../lib/apiService';
import { getOrFetchDriverData } from '../../lib/driverDataHelper';
import { toastError } from '../../lib/toastHelper';
import Pagination from './components/Pagination';
import TemplateTab from './components/TemplateTab';
import VehicleTab from './components/VehicleTab';
import { handleConfirmDownload } from './help';

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

  const downloadOptions = [
    { name: 'master', label: 'Master Vehicle' },
    {
      name: 'conditional',
      label: 'Conditional Vehicle',
      show: conditionalData.length > 0,
    },
    { name: 'template', label: 'Template Vehicle' },
  ];

  const noSheetSelected = !(
    sheetSelection.master ||
    sheetSelection.template ||
    (conditionalData.length > 0 && sheetSelection.conditional)
  );

  const handleToggleChange = (e) => {
    const { name, checked } = e.target;
    setSheetSelection((prev) => ({
      ...prev,
      [name]: checked,
    }));
  };

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const { storedLocation: userLocation, storedVehicleTag: storedMapString } =
          getLocalStorage();
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

  const searchBar = (
    <SearchBar
      className="w-full lg:max-w-xs"
      disabled={isLoading}
      onChange={(val) => setSearchQuery(val)}
      placeholder="Cari Plat, Customer, atau SO"
      value={searchQuery}
    />
  );

  const downloadButton = (
    <div className="w-full md:w-auto z-50" ref={downloadDropdownRef}>
      <DownloadButton
        onClick={() => setIsDownloadDropdownOpen((prev) => !prev)}
        disabled={isDownloading || isLoading}
        isLoading={isLoading || isDownloading}
        width="w-full md:w-auto"
      />

      {isDownloadDropdownOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-md shadow-lg border border-gray-200 z-10">
          <div className="p-3">
            <p className="text-sm font-semibold text-gray-700 mb-2">Pilih sheet untuk diunduh:</p>
            {downloadOptions.map((option) => {
              if (option.show === false) return null;
              return (
                <label
                  key={option.name}
                  className="flex items-center space-x-2 p-2 rounded hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    name={option.name}
                    checked={sheetSelection[option.name]}
                    onChange={handleToggleChange}
                    className="form-checkbox h-4 w-4 text-sky-600 rounded cursor-pointer"
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
                  <Spinner size="w-5 h-5 border-2" />
                </div>
              ) : (
                'Download'
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );

  const headerItems = [
    { label: 'Filter', component: searchBar, hideLabel: false },
    { label: 'Action', component: downloadButton, hideLabel: true },
  ];

  const tabs = [
    { id: 'master', label: 'Master Vehicle' },
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
      >
        <div className="flex-1 flex flex-col justify-between overflow-hidden m-6 border border-gray-300 rounded-xl">
          {(activeTab === 'master' || activeTab === 'conditional') && (
            // Kirim searchQuery ke komponen tab
            <VehicleTab
              paginatedData={paginatedData}
              driverMap={driverMap}
              searchQuery={searchQuery}
            />
          )}
          {activeTab === 'template' && (
            // Kirim searchQuery ke komponen tab
            <TemplateTab
              paginatedData={paginatedData}
              driverMap={driverMap}
              searchQuery={searchQuery}
            />
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
      </BodyCard>
    </div>
  );
}
