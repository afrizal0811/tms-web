'use client';

import Button from '@/components/Button';
import BodyCard from '@/components/card/BodyCard';
import HeaderCard from '@/components/card/HeaderCard';
import SearchBar from '@/components/SearchBar';
import StorageTypeFilter from '@/components/StorageTypeFilter';
import { useLanguage } from '@/context/LanguageContext';
import { getDriverData } from '@/lib/driverData';
import { getLocalStorage } from '@/lib/localStorageHandler';
import { isEmpty } from '@/lib/utils';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { getVehicleMappings } from '../../lib/api';
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

const processVehicleData = (rawDriversData, mappingsDB) => {
  const mappingsObj = mappingsDB.reduce((acc, curr) => {
    acc[curr.plat] = curr.mappedType;
    return acc;
  }, {});

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

    let mappedTypeStr = v.type;
    if (v.plat && mappingsObj[v.plat]) {
      const mappedType = mappingsObj[v.plat];
      mappedTypeStr = v.storage ? `${v.storage}-${mappedType}` : mappedType;
    }

    const isIncomplete = !v.email || !mappedTypeStr;

    return {
      ...v,
      parsedTags,
      type: mappedTypeStr,
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
    let isMounted = true;

    async function loadData() {
      setIsLoading(true);
      try {
        const { storedLocation } = getLocalStorage();
        if (!storedLocation) {
          throw new Error(t('common.toast.error', { err: 'Location not found' }));
        }

        const [rawDriversData, mappingsDB] = await Promise.all([
          getDriverData(storedLocation),
          getVehicleMappings(),
        ]);

        if (!rawDriversData || isEmpty(rawDriversData)) {
          throw new Error(t('common.toast.error', { err: t('common.no_driver') }));
        }

        const {
          templateData: temp,
          masterData: master,
          conditionalData: cond,
        } = processVehicleData(rawDriversData, mappingsDB);

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

      return (
        plat.includes(lowerQuery) ||
        name.includes(lowerQuery) ||
        email.includes(lowerQuery) ||
        type.includes(lowerQuery)
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

  const headerItems = [
    {
      label: 'Filter',
      component: (
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder={t('vehicle.search_placeholder')}
          disabled={isLoading}
        />
      ),
    },
    {
      label: t('common.storage_type'),
      hideLabel: false,
      component: (
        <StorageTypeFilter
          selectedTypes={storageFilter}
          onApply={setStorageFilter}
          disabled={isLoading || isDownloading}
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
        <div className="flex-1 flex flex-col m-0 rounded-b-xl overflow-auto">
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
