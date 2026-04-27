'use client';

import { syncDriversData, syncHubsData, syncRolesData } from '@/lib/api';
import { getLocalStorage } from '@/lib/localStorageHandler';
import { toastError, toastSuccess } from '@/lib/toastHelper';
import { useEffect, useState } from 'react';

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
        className={`p-5 border border-gray-200 rounded-lg hover:border-sky-300 transition-colors bg-slate-50 flex flex-col justify-between h-full ${
          isReadOnly ? '' : 'min-h-40'
        }`}
      >
        <div className="text-center md:text-left">
          <div className="font-bold text-slate-800">{label}</div>
          <div className="text-xs text-slate-500 mt-1.5">
            {translate('setting.last_updated')} <br />
            <span className="font-medium text-slate-600">
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
            className="w-full mt-4 py-2.5 text-sm bg-white text-slate-700 hover:bg-sky-50 border border-slate-300 hover:border-sky-300 hover:text-sky-700 rounded-md font-medium disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 disabled:cursor-not-allowed cursor-pointer transition-all"
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
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 border-b border-gray-100 pb-4 gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-800">
              {translate('setting.tab.sync_data.sync_title')}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
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
      </div>
    </div>
  );
}
