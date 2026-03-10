'use client';

import { syncDriversData, syncHubsData, syncRolesData } from '@/lib/api';
import { getLocalStorage } from '@/lib/localStorageHandler';
import { toastError, toastInfo } from '@/lib/toastHelper';
import { useEffect, useState } from 'react';

export default function SyncDataTab({
  hubsList,
  lastUpdated,
  driverSyncStatus,
  onRefresh,
  isReadOnly,
}) {
  const [syncLoading, setSyncLoading] = useState({ all: false });
  const [activeHubId, setActiveHubId] = useState('');
  const [activeHubName, setActiveHubName] = useState('');

  useEffect(() => {
    const { storedSession } = getLocalStorage();
    if (storedSession && storedSession.activeHubId) {
      setActiveHubId(storedSession.activeHubId);
      setActiveHubName(storedSession.activeHubName || 'Cabang Aktif');
    }
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

      toastInfo(`✅ Sinkronisasi berhasil!`);
      await onRefresh();
    } catch (error) {
      toastError(error.message);
    } finally {
      setSyncLoading((prev) => ({ ...prev, [type]: false }));
    }
  };

  return (
    <div className="w-full">
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 border-b border-gray-100 pb-4 gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Sinkronisasi Data Terpusat</h2>
            <p className="text-xs text-slate-500 mt-1">
              Penyelarasan data master dan operasional cabang dengan server pusat
            </p>
          </div>
          {activeHubName && (
            <div className="px-3 py-1.5 bg-sky-50 text-sky-700 border border-sky-200 rounded-md text-sm font-semibold whitespace-nowrap">
              {activeHubName}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* 1. DATA CABANG (HUBS) */}
          <div className="p-5 border border-gray-200 rounded-lg hover:border-sky-300 transition-colors bg-slate-50 flex flex-col justify-between min-h-40">
            <div>
              <div className="font-bold text-slate-800">Data Cabang (Hubs)</div>
              <div className="text-xs text-slate-500 mt-1.5">
                Terakhir diperbarui: <br />
                <span className="font-medium text-slate-600">{lastUpdated.hubs}</span>
              </div>
            </div>
            {!isReadOnly && (
              <button
                onClick={() => executeSync('hubs')}
                disabled={syncLoading.hubs}
                className="w-full mt-4 py-2.5 text-sm bg-white text-slate-700 hover:bg-sky-50 border border-slate-300 hover:border-sky-300 hover:text-sky-700 rounded-md font-medium disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 disabled:cursor-not-allowed cursor-pointer transition-all"
              >
                {syncLoading.hubs ? 'Menyelaraskan...' : 'Sync Hubs'}
              </button>
            )}
          </div>

          {/* 2. DATA PERAN (ROLES) */}
          <div className="p-5 border border-gray-200 rounded-lg hover:border-sky-300 transition-colors bg-slate-50 flex flex-col justify-between min-h-40">
            <div>
              <div className="font-bold text-slate-800">Data Peran (Roles)</div>
              <div className="text-xs text-slate-500 mt-1.5">
                Terakhir diperbarui: <br />
                <span className="font-medium text-slate-600">{lastUpdated.roles}</span>
              </div>
            </div>
            {!isReadOnly && (
              <button
                onClick={() => executeSync('roles')}
                disabled={syncLoading.roles}
                className="w-full mt-4 py-2.5 text-sm bg-white text-slate-700 hover:bg-sky-50 border border-slate-300 hover:border-sky-300 hover:text-sky-700 rounded-md font-medium disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 disabled:cursor-not-allowed cursor-pointer transition-all"
              >
                {syncLoading.roles ? 'Menyelaraskan...' : 'Sync Roles'}
              </button>
            )}
          </div>

          {/* 3. DATA SUPIR & KENDARAAN (Kini memiliki styling yang sama persis) */}
          <div className="p-5 border border-gray-200 rounded-lg hover:border-sky-300 transition-colors bg-slate-50 flex flex-col justify-between min-h-40">
            <div>
              <div className="font-bold text-slate-800">Supir & Kendaraan</div>
              <div className="text-xs text-slate-500 mt-1.5">
                Terakhir diperbarui: <br />
                <span className="font-medium text-slate-600">
                  {activeHubId && driverSyncStatus[activeHubId]
                    ? driverSyncStatus[activeHubId]
                    : 'Belum pernah'}
                </span>
              </div>
            </div>
            {!isReadOnly && (
              <button
                onClick={() => executeSync(`drivers-${activeHubId}`)}
                disabled={!activeHubId || syncLoading[`drivers-${activeHubId}`]}
                className="w-full mt-4 py-2.5 text-sm bg-white text-slate-700 hover:bg-sky-50 border border-slate-300 hover:border-sky-300 hover:text-sky-700 rounded-md font-medium disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 disabled:cursor-not-allowed cursor-pointer transition-all"
              >
                {syncLoading[`drivers-${activeHubId}`]
                  ? 'Menyelaraskan...'
                  : 'Sync Supir & Kendaraan'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
