// File: src/features/vehicleData/VehicleData.js
'use client';

import BodyCard from '@/components/card/BodyCard';
import HeaderCard from '@/components/card/HeaderCard';
import DownloadButton from '@/components/DownloadButton';
import SearchBar from '@/components/SearchBar';
import Spinner from '@/components/Spinner';
import { useLanguage } from '@/context/LanguageContext';
import { getLocalStorage } from '@/lib/localStorageHandler';
import { normalizeEmail } from '@/lib/utils';
import { useEffect, useMemo, useRef, useState } from 'react';
import { getVehicles } from '../../lib/apiService';
import { getOrFetchDriverData } from '../../lib/driverDataHelper';
import { toastError } from '../../lib/toastHelper';
import TemplateTab from './components/TemplateTab';
import VehicleTab from './components/VehicleTab';
import { handleConfirmDownload } from './help';

export default function VehicleData() {
  const [activeTab, setActiveTab] = useState('master');
  const [driverMap, setDriverMap] = useState(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
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
  const { t } = useLanguage();
  const downloadOptions = [
    { name: 'master', label: t('vehicle.tabs.master_title') },
    {
      name: 'conditional',
      label: t('vehicle.tabs.conditional_title'),
      show: conditionalData.length > 0,
    },
    { name: 'template', label: t('vehicle.tabs.template_title') },
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
          toastError(t('vehicle.failed_mapping', { error }));
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
  }, [t]);

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

  const totalItems = filteredData.length;

  const searchBar = (
    <SearchBar
      className="w-full lg:max-w-xs"
      disabled={isLoading}
      onChange={(val) => setSearchQuery(val)}
      placeholder={t('vehicle.search_placeholder')}
      value={searchQuery}
    />
  );

  const downloadButton = (
    <div className="w-full md:w-auto z-50" ref={downloadDropdownRef}>
      <DownloadButton
        disabled={isDownloading || isLoading}
        isLoading={isLoading || isDownloading}
        onClick={() => setIsDownloadDropdownOpen((prev) => !prev)}
        text={t('common.download_excel')}
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
                    checked={sheetSelection[option.name]}
                    className="form-checkbox h-4 w-4 text-sky-600 rounded cursor-pointer"
                    name={option.name}
                    onChange={handleToggleChange}
                    type="checkbox"
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
                  conditionalData,
                  driverMap,
                  masterData,
                  setIsDownloadDropdownOpen,
                  setIsDownloading,
                  sheetSelection,
                  t,
                  templateData,
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
                t('common.download')
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
    { id: 'master', label: t('vehicle.tabs.master_title') },
    ...(conditionalData.length > 0
      ? [{ id: 'conditional', label: t('vehicle.tabs.conditional_title') }]
      : []),
    { id: 'template', label: t('vehicle.tabs.template_title') },
  ];

  const subtitle = (
    <>
      {t('vehicle.subtitle')}{' '}
      <span className="font-semibold text-sky-600">{t('vehicle.subtitle_highlight')}</span>
    </>
  );

  return (
    <div className="w-full max-w-none px-4 sm:px-6">
      <HeaderCard title={t('vehicle.title')} subtitle={subtitle} items={headerItems} />

      <BodyCard
        activeTabId={activeTab}
        isEmpty={!isLoading && totalItems === 0}
        isLoading={isLoading}
        loadingText={t('common.loading')}
        onTabClick={setActiveTab}
        tabs={tabs}
      >
        <div className="flex-1 flex flex-col m-0 border border-gray-300 rounded-b-xl overflow-auto">
          {(activeTab === 'master' || activeTab === 'conditional') && (
            <VehicleTab
              driverMap={driverMap}
              paginatedData={filteredData}
              searchQuery={searchQuery}
              t={t}
            />
          )}
          {activeTab === 'template' && (
            <TemplateTab
              driverMap={driverMap}
              paginatedData={filteredData}
              searchQuery={searchQuery}
            />
          )}
        </div>
      </BodyCard>
    </div>
  );
}
