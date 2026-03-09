'use client';

import BodyCard from '@/components/card/BodyCard';
import HeaderCard from '@/components/card/HeaderCard';
import DownloadButton from '@/components/DownloadButton';
import SearchBar from '@/components/SearchBar';
import StorageTypeFilter from '@/components/StorageTypeFilter'; // 1. Import Component
import { useLanguage } from '@/context/LanguageContext';
import { getLocalStorage } from '@/lib/localStorageHandler';
import { isEmpty, normalizeEmail } from '@/lib/utils';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { getVehicles } from '../../lib/api';
import { getOrFetchDriverData } from '../../lib/driverDataHelper';
import { toastError } from '../../lib/toastHelper';
import TemplateTab from './components/TemplateTab';
import VehicleTab from './components/VehicleTab';
import { handleConfirmDownload } from './help';

export default function VehicleData() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('master');
  const [driverMap, setDriverMap] = useState(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [storageFilter, setStorageFilter] = useState(['DRY', 'FROZEN']);
  const [masterData, setMasterData] = useState([]);
  const [conditionalData, setConditionalData] = useState([]);
  const [templateData, setTemplateData] = useState([]);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const { storedLocation: userLocation, storedVehicleTag: storedMapString } =
          getLocalStorage();
        if (!userLocation) throw new Error('Lokasi user tidak ditemukan.');

        const drivers = await getOrFetchDriverData(userLocation);
        const localDriverMap = new Map();
        if (drivers) {
          drivers.forEach((d) => {
            const normEmail = normalizeEmail(d.email);
            if (normEmail) localDriverMap.set(normEmail, d.name);
          });
        }
        setDriverMap(localDriverMap);
        const rawApiData = await getVehicles({ limit: 500, hubId: userLocation });
        if (!rawApiData || isEmpty(rawApiData)) throw new Error('Tidak ada data.');
        const sortByEmail = (a, b) => (a.assignee || '').localeCompare(b.assignee || '');
        setTemplateData([...rawApiData].sort(sortByEmail));
        let processedData = rawApiData.map((v) => ({ ...v, tags: v.tags ? [...v.tags] : [] }));

        try {
          if (storedMapString) {
            const tagMap = JSON.parse(storedMapString);
            const hubMap = tagMap[userLocation];
            if (hubMap) {
              processedData.forEach((vehicle) => {
                if (!vehicle.tags || isEmpty(vehicle.tags) || !vehicle.name) return;
                const originalTag = vehicle.tags[0];
                const plate = vehicle.name;
                const parts = originalTag.split('-');
                let storagePrefix = '';
                let currentType = '';
                if (parts.length >= 2) {
                  storagePrefix = parts[0];
                  currentType = parts[1];
                } else {
                  currentType = originalTag;
                }
                const emailKey = normalizeEmail(vehicle.assignee);
                const driverName = localDriverMap.get(emailKey) || '';
                const upperName = driverName.toUpperCase();

                if (upperName.includes('FRZ') || upperName.includes('FROZEN')) {
                  storagePrefix = 'FROZEN';
                } else if (upperName.includes('DRY')) {
                  storagePrefix = 'DRY';
                }
                if (hubMap[plate] && hubMap[plate][currentType]) {
                  const mappedType = hubMap[plate][currentType];
                  const newFullTag = storagePrefix ? `${storagePrefix}-${mappedType}` : mappedType;

                  vehicle.tags[0] = newFullTag;
                }
              });
            }
          }
        } catch (error) {
          toastError(t('vehicle.failed_mapping', { error }));
        }
        const emailToVehiclesMap = new Map();
        processedData.forEach((v) => {
          if (!v.assignee) return;
          if (!emailToVehiclesMap.has(v.assignee)) emailToVehiclesMap.set(v.assignee, []);
          emailToVehiclesMap.get(v.assignee).push(v);
        });

        const masterList = [];
        const conditionalList = [];
        const countSpaces = (str) => (str.match(/ /g) || []).length;

        for (const [_, vehicles] of emailToVehiclesMap.entries()) {
          if (vehicles.length === 1) {
            masterList.push(vehicles[0]);
          } else {
            const sorted = [...vehicles].sort((a, b) => countSpaces(a.name) - countSpaces(b.name));
            masterList.push(sorted[0]);
            for (let i = 1; i < sorted.length; i++) {
              if (countSpaces(sorted[i].name) > 2) conditionalList.push(sorted[i]);
            }
          }
        }

        setMasterData(masterList.sort(sortByEmail));
        setConditionalData(conditionalList.sort(sortByEmail));
      } catch (err) {
        toastError(err.message); // Pastikan toastError aman
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [t]);

  // 3. Helper Fungsi Filter Storage (Reusable)
  const applyStorageFilter = useCallback(
    (list) => {
      return list.filter((item) => {
        // Jika semua dipilih atau tidak ada (fallback), tampilkan semua
        if (storageFilter.length === 2) return true;
        if (storageFilter.length === 0) return false;

        // Ambil nama driver dari map
        const driverName = (driverMap.get(normalizeEmail(item.assignee)) || '').toUpperCase();

        // Cek keyword DRY atau FRZ
        const isDry = driverName.includes("'DRY'");
        const isFrz = driverName.includes("'FRZ'");

        if (storageFilter.includes('DRY') && isDry) return true;
        if (storageFilter.includes('FROZEN') && isFrz) return true;

        return false;
      });
    },
    [storageFilter, driverMap]
  );

  // 4. Update Filtered Data untuk Tampilan
  const filteredData = useMemo(() => {
    let data = [];
    if (activeTab === 'master') data = masterData;
    else if (activeTab === 'conditional') data = conditionalData;
    else if (activeTab === 'template') data = templateData;

    // A. Apply Storage Filter
    data = applyStorageFilter(data);

    // B. Apply Search Filter
    if (!searchQuery) return data;

    const lowerQuery = searchQuery.toLowerCase();
    return data.filter((v) => {
      const name = (v.name || '').toLowerCase();
      const assigneeName = (driverMap.get(normalizeEmail(v.assignee)) || '').toLowerCase();
      const tags = (v.tags || []).join(' ').toLowerCase();
      const type = (v.vehicleType || '').toLowerCase();

      return (
        name.includes(lowerQuery) ||
        assigneeName.includes(lowerQuery) ||
        tags.includes(lowerQuery) ||
        type.includes(lowerQuery)
      );
    });
  }, [
    activeTab,
    masterData,
    conditionalData,
    templateData,
    searchQuery,
    driverMap,
    applyStorageFilter, // Dependency baru
  ]);

  const handleExcelDownload = () => {
    // 5. Filter data sebelum didownload agar sesuai dengan pilihan storage
    const filteredMaster = applyStorageFilter(masterData);
    const filteredConditional = applyStorageFilter(conditionalData);
    const filteredTemplate = applyStorageFilter(templateData);

    // Tentukan prefix nama file (opsional, untuk kerapian file output)
    let filePrefix = '';
    if (storageFilter.includes('DRY') && !storageFilter.includes('FROZEN')) filePrefix = 'DRY';
    if (!storageFilter.includes('DRY') && storageFilter.includes('FROZEN')) filePrefix = 'FRZ';

    handleConfirmDownload({
      masterData: filteredMaster,
      conditionalData: filteredConditional,
      templateData: filteredTemplate,
      driverMap,
      setIsDownloading,
      sheetSelection: { master: true, conditional: true, template: true }, // Download semua tab yg relevan
      t,
      fileNamePrefix: filePrefix, // Kirim prefix ke helper (jika helper support, atau diabaikan tidak masalah)
    });
  };

  const searchBar = (
    <SearchBar
      value={searchQuery}
      onChange={setSearchQuery}
      placeholder={t('vehicle.search_placeholder')}
      disabled={isLoading}
    />
  );

  const downloadBtn = (
    <DownloadButton
      onClick={handleExcelDownload}
      isLoading={isDownloading}
      disabled={
        isLoading ||
        isDownloading ||
        (isEmpty(masterData) && isEmpty(conditionalData) && isEmpty(templateData))
      }
      text={t('common.download') + ' Excel'}
      width="w-auto"
    />
  );

  const storageFilterComponent = (
    <StorageTypeFilter
      selectedTypes={storageFilter}
      onApply={setStorageFilter}
      disabled={isLoading || isDownloading}
    />
  );

  const headerItems = [
    { label: t('common.search'), component: searchBar, hideLabel: true },
    { label: t('common.storage_type'), component: storageFilterComponent, hideLabel: false },
    { label: t('common.download'), component: downloadBtn, hideLabel: true },
  ];

  const totalItems = filteredData.length;

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
              paginatedData={filteredData}
              searchQuery={searchQuery}
              t={t}
            /> 
          )}
        </div>
      </BodyCard>
    </div>
  );
}
