'use client';

import { syncDriversData, syncHubsData, syncRolesData } from '@/lib/api';
import { toastError, toastInfo } from '@/lib/toastHelper';
import { useState } from 'react';

export default function SyncDataTab({
  hubsList,
  lastUpdated,
  driverSyncStatus,
  onRefresh,
  isReadOnly,
}) {
  const [syncLoading, setSyncLoading] = useState({ all: false });

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
    <div className="space-y-6 max-w-4xl">
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-800 mb-4 border-b border-gray-100 pb-3">
          Sinkronisasi Data Utama
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 border border-gray-200 rounded-lg hover:border-sky-300 transition-colors bg-slate-50 flex flex-col justify-between">
            <div>
              <div className="font-bold text-slate-800">Data Cabang (Hubs)</div>
              <div className="text-xs text-slate-500 mt-1 mb-4">
                Terakhir diperbarui: <br />
                {lastUpdated.hubs}
              </div>
            </div>
            {/* SEMBUNYIKAN TOMBOL JIKA READ ONLY */}
            {!isReadOnly && (
              <button
                onClick={() => executeSync('hubs')}
                disabled={syncLoading.hubs}
                className="w-full py-2 text-sm bg-white text-slate-700 hover:bg-sky-50 border border-slate-300 hover:border-sky-300 hover:text-sky-700 rounded-md font-medium disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 disabled:cursor-not-allowed cursor-pointer transition-all"
              >
                {syncLoading.hubs ? 'Menyelaraskan...' : 'Sync Hubs'}
              </button>
            )}
          </div>

          <div className="p-4 border border-gray-200 rounded-lg hover:border-sky-300 transition-colors bg-slate-50 flex flex-col justify-between">
            <div>
              <div className="font-bold text-slate-800">Data Peran (Roles)</div>
              <div className="text-xs text-slate-500 mt-1 mb-4">
                Terakhir diperbarui: <br />
                {lastUpdated.roles}
              </div>
            </div>
            {/* SEMBUNYIKAN TOMBOL JIKA READ ONLY */}
            {!isReadOnly && (
              <button
                onClick={() => executeSync('roles')}
                disabled={syncLoading.roles}
                className="w-full py-2 text-sm bg-white text-slate-700 hover:bg-sky-50 border border-slate-300 hover:border-sky-300 hover:text-sky-700 rounded-md font-medium disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 disabled:cursor-not-allowed cursor-pointer transition-all"
              >
                {syncLoading.roles ? 'Menyelaraskan...' : 'Sync Roles'}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 border-b border-gray-100 pb-3 gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Data Supir & Kendaraan</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Sinkronisasi data driver berdasarkan cabang (Hub)
            </p>
          </div>
          {/* SEMBUNYIKAN TOMBOL JIKA READ ONLY */}
          {!isReadOnly && (
            <button
              onClick={() => executeSync('drivers-all')}
              disabled={syncLoading['drivers-all']}
              className="px-4 py-2 text-sm bg-sky-600 text-white hover:bg-sky-700 rounded-md font-medium disabled:bg-slate-300 cursor-pointer shadow-sm"
            >
              {syncLoading['drivers-all'] ? 'Loading...' : 'Sync Semua Cabang'}
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-2">
          {hubsList.map((hub) => (
            <div
              key={hub._id}
              className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-white hover:shadow-md transition-shadow"
            >
              <div>
                <div
                  className="font-semibold text-slate-700 text-sm truncate max-w-[150px] sm:max-w-[200px]"
                  title={hub.name}
                >
                  {hub.name}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Terakhir: {driverSyncStatus[hub._id] || 'Belum pernah'}
                </div>
              </div>
              {/* SEMBUNYIKAN TOMBOL JIKA READ ONLY */}
              {!isReadOnly && (
                <button
                  onClick={() => executeSync(`drivers-${hub._id}`)}
                  disabled={syncLoading[`drivers-${hub._id}`] || syncLoading['drivers-all']}
                  className="px-3 py-1.5 text-xs bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300 rounded font-medium disabled:bg-slate-100 disabled:text-slate-400 cursor-pointer min-w-[75px]"
                >
                  {syncLoading[`drivers-${hub._id}`] ? 'Wait...' : 'Sync'}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
