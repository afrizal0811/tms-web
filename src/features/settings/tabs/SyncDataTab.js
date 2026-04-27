'use client';

import { syncDriversData, syncHubsData, syncRolesData } from '@/lib/api';
import { getLocalStorage } from '@/lib/localStorageHandler';
import { toastError, toastSuccess } from '@/lib/toastHelper';
import { useEffect, useState } from 'react';
import Card from '../components/Card';

export default function SyncDataTab({
  lastUpdated,
  driverSyncStatus,
  onRefresh,
  isReadOnly,
  translate,
}) {
  const [syncLoading, setSyncLoading] = useState({ all: false });
  const [activeHubId, setActiveHubId] = useState('');

  useEffect(() => {
    const { storedUser, storedLocation, storedLocationName } = getLocalStorage();
    let hubId = storedLocation;
    let hubName = storedLocationName;

    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        if (parsed.activeHubId) hubId = parsed.activeHubId;
        if (parsed.activeHubName) hubName = parsed.activeHubName;
      } catch (e) {}
    }

    setActiveHubId(hubId || '');
  }, []);

  const executeSync = async (type) => {
    if (isReadOnly) return;

    setSyncLoading((prev) => ({ ...prev, [type]: true }));
    try {
      if (type === 'hubs') await syncHubsData();
      else if (type === 'roles') await syncRolesData();
      else if (type.startsWith('drivers-')) {
        const targetId = type.split('drivers-')[1];
        if (targetId === 'all') await syncDriversData([]);
        else await syncDriversData([targetId]);
      }
      toastSuccess(translate('common.toast.success'));
      await onRefresh();
      window.location.reload();
    } catch (error) {
      toastError(translate('common.toast.error', { err: error.message }));
    } finally {
      setSyncLoading((prev) => ({ ...prev, [type]: false }));
    }
  };

  const syncData = [
    {
      type: 'hubs',
      label: translate('setting.tab.sync_data.hubs'),
    },
    {
      type: 'roles',
      label: translate('setting.tab.sync_data.roles'),
    },
    {
      type: `drivers-${activeHubId}`,
      label: translate('setting.tab.sync_data.driver_vehicles'),
    },
  ];

  const renderSyncButton = (type, label) => {
    return (
      <div
        className={`flex h-full flex-col justify-between p-5 bg-slate-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-md dark:shadow-slate-700/40 transition-colors ${
          isReadOnly ? '' : 'min-h-40'
        }`}
      >
        <div className="text-center md:text-left">
          <span className="font-bold text-slate-800 dark:text-slate-200">{label}</span>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
            {translate('setting.last_updated')} <br />
            <span className="font-medium text-slate-600 dark:text-slate-500">
              {type === `drivers-${activeHubId}`
                ? driverSyncStatus[activeHubId]
                : lastUpdated[type]}
            </span>
          </div>
        </div>
        {!isReadOnly && (
          <button
            onClick={() => executeSync(type)}
            disabled={syncLoading[type]}
            className="w-full mt-4 py-2.5 bg-slate-50 dark:bg-sky-100 text-sm font-medium text-slate-700 dark:text-sky-600 border border-slate-300 hover:border-sky-400 dark:hover:border-sky-600 disabled:border-slate-200 rounded-md shadow-none hover:bg-slate-100 dark:hover:bg-sky-200 hover:text-sky-700 dark:hover:text-sky-700 transition-all cursor-pointer disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed "
          >
            {syncLoading[type]
              ? translate('setting.sync_loading')
              : translate('setting.tab.button.btn_sync')}
          </button>
        )}
      </div>
    );
  };
  return (
    <div className="w-full">
      <Card>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 border-b border-gray-100 pb-4 gap-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-slate-200">
              {translate('setting.tab.sync_data.sync_title')}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {translate('setting.tab.sync_data.subtitle')}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {syncData.map((item, index) => (
            <div key={index} className="col-span-1">
              {renderSyncButton(item.type, item.label)}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
