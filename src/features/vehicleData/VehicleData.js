// File: src/features/vehicleData/VehicleData.js
'use client';

import Button from '@/components/Button';
import BodyCard from '@/components/card/BodyCard';
import HeaderCard from '@/components/card/HeaderCard';
import SearchBar from '@/components/SearchBar';
import StorageTypeFilter from '@/components/StorageTypeFilter';
import { useLanguage } from '@/context/LanguageContext';
import { getLocalStorage } from '@/lib/localStorageHandler';
import { isEmpty } from '@/lib/utils';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { getDrivers, getVehicleMappings } from '../../lib/api';
import { toastError } from '../../lib/toastHelper';
import TemplateTab from './components/TemplateTab';
import VehicleTab from './components/VehicleTab';
import { handleConfirmDownload } from './help';

export default function VehicleData() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('master');
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
        const { storedSession } = getLocalStorage();
        const userLocation = storedSession?.activeHubId;
        if (!userLocation) throw new Error('Lokasi user tidak ditemukan.');

        const [rawDriversData, mappingsDB] = await Promise.all([
          getDrivers(userLocation),
          getVehicleMappings(),
        ]);

        if (!rawDriversData || isEmpty(rawDriversData))
          throw new Error('Tidak ada data kendaraan.');

        const sortByEmail = (a, b) => (a.email || '').localeCompare(b.email || '');

        let processedData = rawDriversData.map((v) => {
          let parsedTags = [];
          if (v.tags) {
            try {
              parsedTags = JSON.parse(v.tags);
            } catch (e) {
              parsedTags = [v.type];
            }
          } else if (v.type) {
            parsedTags = [v.type];
          }
          return { ...v, parsedTags };
        });

        setTemplateData([...processedData].sort(sortByEmail));

        const mappingsObj = mappingsDB.reduce((acc, curr) => {
          acc[curr.plat] = curr.mappedType;
          return acc;
        }, {});

        try {
          processedData.forEach((vehicle) => {
            const plate = vehicle.plat;
            if (plate && mappingsObj[plate]) {
              const mappedType = mappingsObj[plate];
              const storagePrefix = vehicle.storage;

              const newFullTag = storagePrefix ? `${storagePrefix}-${mappedType}` : mappedType;
              vehicle.type = newFullTag;
              if (vehicle.parsedTags.length > 0) vehicle.parsedTags[0] = newFullTag;
              else vehicle.parsedTags = [newFullTag];
            }
          });
        } catch (error) {
          toastError(t('vehicle.toast.failed_mapping', { error: error.message }));
        }

        const emailToVehiclesMap = new Map();
        processedData.forEach((v) => {
          if (!v.email) return;
          if (!emailToVehiclesMap.has(v.email)) emailToVehiclesMap.set(v.email, []);
          emailToVehiclesMap.get(v.email).push(v);
        });

        const masterList = [];
        const conditionalList = [];
        const countSpaces = (str) => (str ? (str.match(/ /g) || []).length : 0);

        for (const [_, vehicles] of emailToVehiclesMap.entries()) {
          if (vehicles.length === 1) {
            masterList.push(vehicles[0]);
          } else {
            const sorted = [...vehicles].sort((a, b) => countSpaces(a.plat) - countSpaces(b.plat));
            masterList.push(sorted[0]);
            for (let i = 1; i < sorted.length; i++) {
              if (countSpaces(sorted[i].plat) > 2) conditionalList.push(sorted[i]);
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

  const applyStorageFilter = useCallback(
    (list) => {
      return list.filter((item) => {
        if (storageFilter.length === 2) return true;
        if (storageFilter.length === 0) return false;
        return storageFilter.includes(item.storage);
      });
    },
    [storageFilter]
  );

  const filteredData = useMemo(() => {
    let data = [];
    if (activeTab === 'master') data = masterData;
    else if (activeTab === 'conditional') data = conditionalData;
    else if (activeTab === 'template') data = templateData;

    data = applyStorageFilter(data);

    if (!searchQuery) return data;

    const lowerQuery = searchQuery.toLowerCase();
    return data.filter((v) => {
      const plat = (v.plat || '').toLowerCase();
      const name = (v.name || '').toLowerCase();
      const email = (v.email || '').toLowerCase();
      const type = (v.type || '').toLowerCase();
      const tags = (v.parsedTags || []).join(' ').toLowerCase();

      return (
        plat.includes(lowerQuery) ||
        name.includes(lowerQuery) ||
        email.includes(lowerQuery) ||
        type.includes(lowerQuery) ||
        tags.includes(lowerQuery)
      );
    });
  }, [activeTab, masterData, conditionalData, templateData, searchQuery, applyStorageFilter]);

  const handleExcelDownload = () => {
    const filteredMaster = applyStorageFilter(masterData);
    const filteredConditional = applyStorageFilter(conditionalData);
    const filteredTemplate = applyStorageFilter(templateData);

    let filePrefix = '';
    if (storageFilter.includes('DRY') && !storageFilter.includes('FROZEN')) filePrefix = 'DRY';
    if (!storageFilter.includes('DRY') && storageFilter.includes('FROZEN')) filePrefix = 'FRZ';

    handleConfirmDownload({
      masterData: filteredMaster,
      conditionalData: filteredConditional,
      templateData: filteredTemplate,
      setIsDownloading,
      sheetSelection: { master: true, conditional: true, template: true },
      t,
      fileNamePrefix: filePrefix,
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
    <Button
      onClick={handleExcelDownload}
      isLoading={isDownloading}
      disabled={
        isLoading ||
        isDownloading ||
        (isEmpty(masterData) && isEmpty(conditionalData) && isEmpty(templateData))
      }
      text={t('common.download')}
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
    { label: 'Filter', component: searchBar },
    { label: t('common.storage_type'), component: storageFilterComponent, hideLabel: false },
    { label: 'Export', component: downloadBtn, hideLabel: true },
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
            <VehicleTab paginatedData={filteredData} searchQuery={searchQuery} t={t} />
          )}
          {activeTab === 'template' && (
            <TemplateTab paginatedData={filteredData} searchQuery={searchQuery} t={t} />
          )}
        </div>
      </BodyCard>
    </div>
  );
}
