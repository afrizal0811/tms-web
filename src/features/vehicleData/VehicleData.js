'use client';

import Button from '@/components/Button';
import BodyCard from '@/components/card/BodyCard';
import HeaderCard from '@/components/card/HeaderCard';
import StorageTypeFilter from '@/components/dropdown/StorageTypeFilter';
import VehicleTypeFilter from '@/components/dropdown/VehicleTypeFilter';
import SearchBar from '@/components/SearchBar';
import { useLanguage } from '@/context/LanguageContext';
import { getDriverData } from '@/lib/driverData';
import { getLocalStorage } from '@/lib/localStorageHandler';
import { getBaseVehicleType, isEmpty } from '@/lib/utils';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toastError } from '../../lib/toast';
import TemplateTab from './components/TemplateTab';
import VehicleTab from './components/VehicleTab';
import { handleConfirmDownload } from './help';

const countSpaces = (str) => (str ? (str.match(/ /g) || []).length : 0);
const sortData = (a, b) => {
  const typeCmp = (a.type || '').localeCompare(b.type || '');
  if (typeCmp !== 0) return typeCmp;
  return (a.email || '').localeCompare(b.email || '');
};

const processVehicleData = (rawDriversData) => {
  const processedData = rawDriversData.map((v) => {
    let parsedTags = [];
    if (v.tags) {
      try {
        parsedTags = JSON.parse(v.tags);
      } catch {
        parsedTags = [v.tags];
      }
    } else if (v.type) {
      parsedTags = [v.type];
    }

    const isIncomplete = !v.email || !v.type;

    return {
      ...v,
      parsedTags,
      isIncomplete,
    };
  });

  const emailToVehiclesMap = new Map();
  const noEmailVehicles = [];

  processedData.forEach((v) => {
    if (!v.email) {
      noEmailVehicles.push(v);
    } else {
      const emailKey = v.email.toLowerCase();
      if (!emailToVehiclesMap.has(emailKey)) emailToVehiclesMap.set(emailKey, []);
      emailToVehiclesMap.get(emailKey).push(v);
    }
  });

  const masterList = [];
  const conditionalList = [];

  noEmailVehicles.forEach((v) => {
    masterList.push({ ...v, isDuplicateDriver: false });
  });

  for (const vehicles of emailToVehiclesMap.values()) {
    const isDuplicate = vehicles.length > 1;

    if (!isDuplicate) {
      masterList.push({ ...vehicles[0], isDuplicateDriver: false });
    } else {
      const sorted = [...vehicles].sort((a, b) => countSpaces(a.plat) - countSpaces(b.plat));

      masterList.push({ ...sorted[0], isDuplicateDriver: true });

      for (let i = 1; i < sorted.length; i++) {
        const currentVehicle = { ...sorted[i], isDuplicateDriver: true };
        if (countSpaces(currentVehicle.plat) > 2) {
          conditionalList.push(currentVehicle);
        } else {
          masterList.push(currentVehicle);
        }
      }
    }
  }

  const masterSorted = masterList.sort(sortData);
  const conditionalSorted = conditionalList.sort(sortData);
  const templateData = [...masterSorted, ...conditionalSorted];

  return {
    templateData,
    masterData: masterSorted,
    conditionalData: conditionalSorted,
  };
};

const colorLegends = [
  {
    name: 'duplicate_driver',
    colors: 'text-white bg-yellow-100 dark:bg-yellow-400/30',
  },
  {
    name: 'incomplete_data',
    colors: 'text-white bg-red-100 dark:bg-red-400/30',
  },
];

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
  const [typeFilter, setTypeFilter] = useState('');
  const [masterVehicleTypes, setMasterVehicleTypes] = useState([]);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      setIsLoading(true);
      try {
        const { storedLocation } = getLocalStorage();
        if (!storedLocation) {
          throw new Error(t('common.toast.error', { err: 'Location not found' }));
        }

        const rawDriversData = await getDriverData(storedLocation);

        if (!rawDriversData || isEmpty(rawDriversData)) {
          throw new Error(t('common.toast.error', { err: t('common.no_driver') }));
        }

        const {
          templateData: temp,
          masterData: master,
          conditionalData: cond,
        } = processVehicleData(rawDriversData);

        if (!isMounted) return;

        setTemplateData(temp);
        setMasterData(master);
        setConditionalData(cond);
      } catch (err) {
        if (isMounted) toastError(err.message);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
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

  const applyTypeFilter = useCallback(
    (list) => {
      if (!typeFilter || typeFilter === 'all') return list;
      return list.filter(
        (item) => getBaseVehicleType(item.type, masterVehicleTypes) === typeFilter
      );
    },
    [typeFilter, masterVehicleTypes]
  );

  const filteredData = useMemo(() => {
    let data = [];
    if (activeTab === 'master') data = masterData;
    else if (activeTab === 'conditional') data = conditionalData;
    else if (activeTab === 'template') data = templateData;

    data = applyStorageFilter(data);
    data = applyTypeFilter(data);

    if (!searchQuery) return data;

    const lowerQuery = searchQuery.toLowerCase();
    return data.filter((v) => {
      const plat = (v.plat || '').toLowerCase();
      const name = (v.name || '').toLowerCase();
      const email = (v.email || '').toLowerCase();

      return plat.includes(lowerQuery) || name.includes(lowerQuery) || email.includes(lowerQuery);
    });
  }, [
    activeTab,
    masterData,
    conditionalData,
    templateData,
    searchQuery,
    applyStorageFilter,
    applyTypeFilter,
  ]);

  const handleExcelDownload = () => {
    const filteredMaster = applyTypeFilter(applyStorageFilter(masterData));
    const filteredConditional = applyTypeFilter(applyStorageFilter(conditionalData));
    const filteredTemplate = applyTypeFilter(applyStorageFilter(templateData));

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
  const searchPlaceholder = `${t('common.license_number')}, ${t('common.driver')}}`;

  const headerItems = [
    {
      label: t('common.search'),
      component: (
        <SearchBar
          disabled={isLoading}
          onChange={setSearchQuery}
          placeholder={t('common.search')}
          tooltip={searchPlaceholder}
          value={searchQuery}
        />
      ),
    },
    {
      label: t('common.storage_type'),
      hideLabel: false,
      component: (
        <StorageTypeFilter
          disabled={isLoading || isDownloading}
          onApply={setStorageFilter}
          selectedTypes={storageFilter}
          t={t}
        />
      ),
    },
    {
      label: t('common.vehicle_type'),
      hideLabel: false,
      component: (
        <VehicleTypeFilter
          data={templateData}
          disabled={isLoading || isDownloading}
          onApply={setTypeFilter}
          onMasterTypesLoad={setMasterVehicleTypes}
          selectedType={typeFilter}
          t={t}
        />
      ),
    },
    {
      label: 'Export',
      hideLabel: true,
      component: (
        <Button
          onClick={handleExcelDownload}
          isLoading={isDownloading}
          disabled={
            isLoading ||
            isDownloading ||
            (isEmpty(masterData) && isEmpty(conditionalData) && isEmpty(templateData))
          }
          text={t('common.download')}
          width="w-full"
        />
      ),
    },
  ];

  const totalItems = filteredData.length;
  const tabs = [
    { id: 'master', label: t('vehicle.tabs.master_title') },
    ...(conditionalData.length > 0
      ? [{ id: 'conditional', label: t('vehicle.tabs.conditional_title') }]
      : []),
    { id: 'template', label: t('vehicle.tabs.template_title') },
  ];

  return (
    <div className="w-full max-w-none px-4 sm:px-6">
      <HeaderCard
        title={t('vehicle.title')}
        subtitle={
          <>
            {t('vehicle.subtitle')}{' '}
            <span className="font-semibold text-sky-600">{t('vehicle.subtitle_highlight')}</span>
          </>
        }
        items={headerItems}
      />
      <BodyCard
        activeTabId={activeTab}
        isEmpty={!isLoading && totalItems === 0}
        isLoading={isLoading}
        onTabClick={setActiveTab}
        tabs={tabs}
      >
        <div className="flex-1 flex flex-col m-0 overflow-auto">
          {(activeTab === 'master' || activeTab === 'conditional') && (
            <VehicleTab paginatedData={filteredData} searchQuery={searchQuery} t={t} />
          )}
          {activeTab === 'template' && (
            <TemplateTab paginatedData={filteredData} searchQuery={searchQuery} t={t} />
          )}
        </div>
        <div className="px-4 py-3 bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700 shadow-sm shrink-0">
          <h4 className="text-xs font-bold mb-3 text-slate-700 dark:text-slate-200">
            {t('common.color_exp')}
          </h4>
          <div className="flex flex-col lg:flex-row lg:justify-start gap-x-6 gap-y-2 text-xs text-slate-600 dark:text-slate-300">
            {colorLegends.map((color, i) => (
              <div key={i} className="flex items-center gap-2">
                <span
                  className={`w-4 h-4 border border-gray-400 dark:border-slate-600 rounded-sm ${color.colors}`}
                />
                <span>{t(`vehicle.tabs.${color.name}`)}</span>
              </div>
            ))}
          </div>
        </div>
      </BodyCard>
    </div>
  );
}
