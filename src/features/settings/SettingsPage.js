'use client';

import { getDriversSyncStatus, getHubs, getRoles, getVehicleTypes } from '@/lib/api';
import { getLocalStorage } from '@/lib/localStorageHandler';
import { toastError } from '@/lib/toastHelper';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import MasterDataTab from './tabs/MasterDataTab';
import SyncDataTab from './tabs/SyncDataTab';

export default function SettingsPage() {
  const router = useRouter();

  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoadingPage, setIsLoadingPage] = useState(true);
  const [isReadOnly, setIsReadOnly] = useState(false);

  const [activeTab, setActiveTab] = useState('sync');

  const [hubsList, setHubsList] = useState([]);
  const [driverSyncStatus, setDriverSyncStatus] = useState({});
  const [lastUpdated, setLastUpdated] = useState({});
  const [vehicleTypes, setVehicleTypes] = useState([]);

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

        // Jika bukan owner atau superadmin, jadikan Mode Lihat (Read Only)
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
  }, [router]);

  const fetchAllData = async () => {
    try {
      const [hubs, rolesDb, dStatus, vTypes] = await Promise.all([
        getHubs(),
        getRoles(),
        getDriversSyncStatus(),
        getVehicleTypes(),
      ]);

      setLastUpdated({
        hubs:
          hubs.length > 0 && hubs[0].updatedAt
            ? new Date(hubs[0].updatedAt).toLocaleString('id-ID')
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
      setHubsList(hubs);
      setVehicleTypes(vTypes);
    } catch (error) {
      toastError('Gagal memuat data pengaturan');
    }
  };

  if (isLoadingPage) {
    return (
      <div className="p-8 text-center text-slate-500 flex flex-col justify-center items-center h-full">
        <span className="animate-spin h-8 w-8 border-4 border-slate-300 border-t-sky-600 rounded-full mb-4"></span>
        Memuat pengaturan...
      </div>
    );
  }

  if (!isAuthorized) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 pb-12 w-full">
      {/* HEADER DIKEMBALIKAN KE VERSI STANDAR */}
      <div className="mb-2">
        <h1 className="text-3xl font-bold text-slate-900">Pengaturan Sistem</h1>
        <p className="text-slate-500 mt-1">
          Kelola data master dan sinkronisasi database aplikasi secara terpusat.
        </p>
      </div>

      <div className="flex border-b border-gray-200 mb-6 mt-4">
        <button
          onClick={() => setActiveTab('sync')}
          className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 cursor-pointer ${
            activeTab === 'sync'
              ? 'border-sky-600 text-sky-600'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          Sinkronisasi Data
        </button>
        <button
          onClick={() => setActiveTab('master')}
          className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 cursor-pointer ${
            activeTab === 'master'
              ? 'border-sky-600 text-sky-600'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          Master Data
        </button>
      </div>

      {activeTab === 'sync' && (
        <SyncDataTab
          hubsList={hubsList}
          lastUpdated={lastUpdated}
          driverSyncStatus={driverSyncStatus}
          onRefresh={fetchAllData}
          isReadOnly={isReadOnly}
        />
      )}

      {activeTab === 'master' && (
        <MasterDataTab
          vehicleTypes={vehicleTypes}
          onRefresh={fetchAllData}
          isReadOnly={isReadOnly}
        />
      )}
    </div>
  );
}
