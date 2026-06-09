'use client';

import Spinner from '@/components/Spinner';
import TabButton from '@/components/table/TabButton';
import { useLanguage } from '@/context/LanguageContext';
import { getDriversSyncStatus, getHubs, getReasons, getRoles, getVehicleTypes } from '@/lib/api';
import { getLocalStorage, getSuperadminRoleId } from '@/lib/localStorageHandler';
import { toastError } from '@/lib/toastHelper';
import { formatDateUniversal } from '@/lib/utils';
import { useCallback, useEffect, useState } from 'react';
import GeneralTab from './tabs/GeneralTab';
import SyncDataTab from './tabs/SyncDataTab';

export default function SettingPage() {
  const { t } = useLanguage();

  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoadingPage, setIsLoadingPage] = useState(true);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [lastUpdated, setLastUpdated] = useState({ hubs: '-', roles: '-', drivers: '-' });
  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [hubs, setHubs] = useState([]);
  const [reasons, setReasons] = useState([]);

  const fetchAllData = useCallback(
    async (userRoleId, cachedSuperadminId) => {
      try {
        const [hubsDb, rolesDb, dStatus, vTypes, reasonsDb] = await Promise.all([
          getHubs(),
          getRoles(),
          getDriversSyncStatus(),
          getVehicleTypes(),
          getReasons(),
        ]);

        let maxDriverDate = null;
        dStatus.forEach((d) => {
          if (d._max && d._max.updatedAt) {
            const dateObj = new Date(d._max.updatedAt);
            if (!maxDriverDate || dateObj > maxDriverDate) {
              maxDriverDate = dateObj;
            }
          }
        });
        const latestDriverSync = maxDriverDate
          ? formatDateUniversal(maxDriverDate, 'DD/MM/YYYY HH:mm:ss')
          : '-';

        setHubs(hubsDb);
        setLastUpdated({
          hubs:
            hubsDb.length > 0 && hubsDb[0].updatedAt
              ? formatDateUniversal(new Date(hubsDb[0].updatedAt), 'DD/MM/YYYY HH:mm:ss')
              : '-',
          roles:
            rolesDb.length > 0 && rolesDb[0].updatedAt
              ? formatDateUniversal(new Date(rolesDb[0].updatedAt), 'DD/MM/YYYY HH:mm:ss')
              : '-',
          drivers: latestDriverSync,
        });

        setVehicleTypes(vTypes);
        setReasons(reasonsDb || []);

        const ownerRole = rolesDb.find((r) => r.name.toLowerCase() === 'owner');

        if (userRoleId === cachedSuperadminId || (ownerRole && userRoleId === ownerRole._id)) {
          setIsReadOnly(false);
        } else {
          setIsReadOnly(true);
        }
      } catch (error) {
        toastError(t('common.toast.error', { err: error.message }));
      }
    },
    [t]
  );

  useEffect(() => {
    const checkAuthAndLoadData = async () => {
      try {
        const { storedUser } = getLocalStorage();
        if (!storedUser) {
          toastError(t('home.toast.no_session'));
          return;
        }

        setIsAuthorized(true);

        const user = JSON.parse(storedUser);
        const cachedSuperadminId = getSuperadminRoleId();

        await fetchAllData(user.roleId, cachedSuperadminId);
      } catch (error) {
        toastError(t('common.toast.error', { err: error.message }));
      } finally {
        setIsLoadingPage(false);
      }
    };

    checkAuthAndLoadData();
  }, [fetchAllData, t]);

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
    { tab: 'general', label: t('setting.tab.general.title') },
    { tab: 'sync', label: t('setting.tab.sync_data.title') },
  ];

  const renderTabContent = () => {
    const triggerRefresh = () => {
      const { storedUser } = getLocalStorage();
      if (storedUser) {
        const user = JSON.parse(storedUser);
        fetchAllData(user.roleId, getSuperadminRoleId());
      }
    };

    switch (activeTab) {
      case 'general':
        return (
          <GeneralTab
            vehicleTypes={vehicleTypes}
            hubs={hubs}
            reasons={reasons}
            onRefresh={triggerRefresh}
            isReadOnly={isReadOnly}
            translate={t}
          />
        );
      case 'sync':
        return (
          <SyncDataTab
            lastUpdated={lastUpdated}
            onRefresh={triggerRefresh}
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
        <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100">
          {t('setting.title')}
        </h1>
      </div>
      <div className="flex border-b border-gray-200 dark:border-slate-700 mb-6 mt-4 overflow-x-auto">
        {buttonData.map((data) => (
          <TabButton
            key={data.tab}
            isActive={activeTab === data.tab}
            onClick={() => setActiveTab(data.tab)}
          >
            {data.label}
          </TabButton>
        ))}
      </div>
      {renderTabContent()}
    </div>
  );
}
