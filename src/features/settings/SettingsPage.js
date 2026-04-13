'use client';

import Spinner from '@/components/Spinner';
import { useLanguage } from '@/context/LanguageContext';
import { getDriversSyncStatus, getHubs, getRoles, getVehicleTypes } from '@/lib/api';
import { getLocalStorage } from '@/lib/localStorageHandler';
import { toastError } from '@/lib/toastHelper';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import GeneralTab from './tabs/GeneralTab';
import MasterDataTab from './tabs/MasterDataTab';
import SyncDataTab from './tabs/SyncDataTab';

export default function SettingsPage() {
  const router = useRouter();
  const { t } = useLanguage();

  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoadingPage, setIsLoadingPage] = useState(true);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [driverSyncStatus, setDriverSyncStatus] = useState({});
  const [lastUpdated, setLastUpdated] = useState({});
  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [hubs, setHubs] = useState([]);

  const fetchAllData = useCallback(async () => {
    try {
      const [hubsDb, rolesDb, dStatus, vTypes] = await Promise.all([
        getHubs(),
        getRoles(),
        getDriversSyncStatus(),
        getVehicleTypes(),
      ]);

      setHubs(hubsDb);
      setLastUpdated({
        hubs:
          hubsDb.length > 0 && hubsDb[0].updatedAt
            ? new Date(hubsDb[0].updatedAt).toLocaleString('id-ID')
            : '-',
        roles:
          rolesDb.length > 0 && rolesDb[0].updatedAt
            ? new Date(rolesDb[0].updatedAt).toLocaleString('id-ID')
            : '-',
      });

      const dMap = {};
      dStatus.forEach((d) => {
        if (d._max.updatedAt) dMap[d.hubId] = new Date(d._max.updatedAt).toLocaleString('id-ID');
      });
      setDriverSyncStatus(dMap);
      setVehicleTypes(vTypes);
    } catch (error) {
      toastError(t('common.error', { err: error.message }));
    }
  }, [t]);

  useEffect(() => {
    const checkAuthAndLoadData = async () => {
      try {
        const { storedUser } = getLocalStorage();
        if (!storedUser) {
          router.push('/');
          return;
        }

        setIsAuthorized(true);

        const user = JSON.parse(storedUser);
        const roles = await getRoles();
        const superadminRole = roles.find((r) => r.name.toLowerCase() === 'superadmin');
        const ownerRole = roles.find((r) => r.name.toLowerCase() === 'owner');

        if (
          (superadminRole && user.roleId === superadminRole._id) ||
          (ownerRole && user.roleId === ownerRole._id)
        ) {
          setIsReadOnly(false);
        } else {
          setIsReadOnly(true);
        }

        await fetchAllData();
      } catch (error) {
        console.error(error);
        router.push('/');
      } finally {
        setIsLoadingPage(false);
      }
    };

    checkAuthAndLoadData();
  }, [router, fetchAllData]);

  if (isLoadingPage) {
    return (
      <div className="p-8 text-center text-slate-500 flex flex-col justify-center items-center h-full gap-4">
        <Spinner />
        {t('common.loading')}
      </div>
    );
  }

  if (!isAuthorized) return null;

  const buttonData = [
    { tab: 'general', label: 'General' },
    { tab: 'master', label: t('setting.tab.master_data.title') },
    { tab: 'sync', label: t('setting.tab.sync_data.title') },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general':
        return (
          <GeneralTab
            vehicleTypes={vehicleTypes}
            hubs={hubs}
            onRefresh={fetchAllData}
            isReadOnly={isReadOnly}
            translate={t}
          />
        );
      case 'master':
        return (
          <MasterDataTab
            vehicleTypes={vehicleTypes}
            onRefresh={fetchAllData}
            isReadOnly={isReadOnly}
            translate={t}
          />
        );
      case 'sync':
        return (
          <SyncDataTab
            lastUpdated={lastUpdated}
            driverSyncStatus={driverSyncStatus}
            onRefresh={fetchAllData}
            isReadOnly={isReadOnly}
            translate={t}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 pb-12 w-full">
      <div className="mb-2">
        <h1 className="text-3xl font-bold text-slate-900">{t('setting.title')}</h1>
      </div>
      <div className="flex border-b border-gray-200 mb-6 mt-4">
        {buttonData.map((data) => (
          <button
            key={data.tab}
            onClick={() => setActiveTab(data.tab)}
            className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 cursor-pointer ${activeTab === data.tab ? 'border-sky-600 text-sky-600' : 'border-transparent text-slate-600 hover:text-slate-800'}`}
          >
            {data.label}
          </button>
        ))}
      </div>
      {renderTabContent()}
    </div>
  );
}
