'use client';

import {
  createVehicleType,
  deleteVehicleType,
  getDriversSyncStatus,
  getHubs,
  getRoles,
  getVehicleTypes,
  syncDriversData,
  syncHubsData,
  syncRolesData,
  updateVehicleType,
} from '@/lib/api';
import { getLocalStorage } from '@/lib/localStorageHandler';
import { toastError, toastInfo } from '@/lib/toastHelper';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import VehicleMappingManager from './VehicleMappingManager';

export default function SettingsPage() {
  const router = useRouter();

  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoadingPage, setIsLoadingPage] = useState(true);

  const [hubsList, setHubsList] = useState([]);
  const [driverSyncStatus, setDriverSyncStatus] = useState({});
  const [lastUpdated, setLastUpdated] = useState({});
  const [syncLoading, setSyncLoading] = useState({ all: false });

  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [newTypeName, setNewTypeName] = useState('');
  const [editTypeId, setEditTypeId] = useState(null);
  const [editTypeName, setEditTypeName] = useState('');

  useEffect(() => {
    const checkAuthAndLoadData = async () => {
      try {
        const { storedUser } = getLocalStorage();
        if (!storedUser) {
          router.push('/');
          return;
        }

        const user = JSON.parse(storedUser);
        const roles = await getRoles();
        const superadminRole = roles.find((r) => r.name.toLowerCase() === 'superadmin');
        const ownerRole = roles.find((r) => r.name.toLowerCase() === 'owner');

        if (
          (superadminRole && user.roleId === superadminRole._id) ||
          (ownerRole && user.roleId === ownerRole._id)
        ) {
          setIsAuthorized(true);
          await fetchAllData();
        } else {
          router.push('/');
        }
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

  const executeSync = async (type) => {
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
      await fetchAllData();
    } catch (error) {
      toastError(error.message);
    } finally {
      setSyncLoading((prev) => ({ ...prev, [type]: false }));
    }
  };

  const handleAddVehicleType = async () => {
    if (!newTypeName.trim()) return;
    try {
      await createVehicleType(newTypeName);
      setNewTypeName('');
      toastInfo('✅ Tipe kendaraan ditambahkan!');
      await fetchAllData();
    } catch (err) {
      toastError(err.message);
    }
  };

  const handleUpdateVehicleType = async (id) => {
    if (!editTypeName.trim()) return;
    try {
      await updateVehicleType(id, editTypeName);
      setEditTypeId(null);
      setEditTypeName('');
      toastInfo('✅ Tipe kendaraan diubah!');
      await fetchAllData();
    } catch (err) {
      toastError(err.message);
    }
  };

  const handleDeleteVehicleType = async (id) => {
    if (window.confirm('⚠️ Yakin menghapus tipe kendaraan ini? Data tidak dapat dikembalikan.')) {
      try {
        await deleteVehicleType(id);
        toastInfo('🗑️ Tipe kendaraan dihapus!');
        await fetchAllData();
      } catch (err) {
        toastError(err.message);
      }
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
      <div className="mb-6 border-b border-gray-200 pb-4">
        <h1 className="text-3xl font-bold text-slate-900">Pengaturan Sistem</h1>
        <p className="text-slate-500 mt-1">
          Kelola data master dan sinkronisasi database aplikasi secara terpusat.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="space-y-8">
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
                  <button
                    onClick={() => executeSync('hubs')}
                    disabled={syncLoading.hubs}
                    className="w-full py-2 text-sm bg-white text-slate-700 hover:bg-sky-50 border border-slate-300 hover:border-sky-300 hover:text-sky-700 rounded-md font-medium disabled:opacity-50 cursor-pointer transition-all"
                  >
                    {syncLoading.hubs ? 'Menyelaraskan...' : 'Sync Hubs'}
                  </button>
                </div>

                <div className="p-4 border border-gray-200 rounded-lg hover:border-sky-300 transition-colors bg-slate-50 flex flex-col justify-between">
                  <div>
                    <div className="font-bold text-slate-800">Data Peran (Roles)</div>
                    <div className="text-xs text-slate-500 mt-1 mb-4">
                      Terakhir diperbarui: <br />
                      {lastUpdated.roles}
                    </div>
                  </div>
                  <button
                    onClick={() => executeSync('roles')}
                    disabled={syncLoading.roles}
                    className="w-full py-2 text-sm bg-white text-slate-700 hover:bg-sky-50 border border-slate-300 hover:border-sky-300 hover:text-sky-700 rounded-md font-medium disabled:opacity-50 cursor-pointer transition-all"
                  >
                    {syncLoading.roles ? 'Menyelaraskan...' : 'Sync Roles'}
                  </button>
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
                <button
                  onClick={() => executeSync('drivers-all')}
                  disabled={syncLoading['drivers-all']}
                  className="px-4 py-2 text-sm bg-sky-600 text-white hover:bg-sky-700 rounded-md font-medium disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  {syncLoading['drivers-all'] ? 'Loading...' : 'Sync Semua Cabang'}
                </button>
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
                    <button
                      onClick={() => executeSync(`drivers-${hub._id}`)}
                      disabled={syncLoading[`drivers-${hub._id}`] || syncLoading['drivers-all']}
                      className="px-3 py-1.5 text-xs bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300 rounded font-medium disabled:opacity-50 cursor-pointer min-w-[75px]"
                    >
                      {syncLoading[`drivers-${hub._id}`] ? 'Wait...' : 'Sync'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <VehicleMappingManager hubsList={hubsList} vehicleTypes={vehicleTypes} />
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm h-fit sticky top-24">
          <h2 className="text-lg font-bold text-slate-800 mb-4 border-b border-gray-100 pb-3">
            Tipe Kendaraan
          </h2>

          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={newTypeName}
              onChange={(e) => setNewTypeName(e.target.value.toUpperCase())}
              placeholder="Tambah tipe baru..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 text-sm"
              onKeyDown={(e) => e.key === 'Enter' && handleAddVehicleType()}
            />
            <button
              onClick={handleAddVehicleType}
              disabled={!newTypeName.trim()}
              className="bg-sky-600 text-white px-3 py-2 rounded-md hover:bg-sky-700 font-medium text-sm disabled:bg-gray-400 cursor-pointer"
            >
              Tambah
            </button>
          </div>

          <div className="flex flex-col gap-2 max-h-[500px] overflow-y-auto pr-1">
            {vehicleTypes.length === 0 ? (
              <p className="text-center text-slate-500 text-sm py-4 italic">
                Belum ada data tipe kendaraan.
              </p>
            ) : (
              vehicleTypes.map((type) => (
                <div
                  key={type.id}
                  className="flex items-center justify-between p-3 border border-gray-200 rounded-md bg-slate-50 hover:bg-white transition-colors group"
                >
                  {editTypeId === type.id ? (
                    <input
                      type="text"
                      value={editTypeName}
                      onChange={(e) => setEditTypeName(e.target.value.toUpperCase())}
                      className="flex-1 px-2 py-1 border border-sky-400 rounded outline-none text-sm font-medium mr-2"
                      autoFocus
                      onKeyDown={(e) => e.key === 'Enter' && handleUpdateVehicleType(type.id)}
                    />
                  ) : (
                    <span className="font-semibold text-slate-700 text-sm">{type.name}</span>
                  )}

                  <div className="flex items-center gap-2">
                    {editTypeId === type.id ? (
                      <>
                        <button
                          onClick={() => handleUpdateVehicleType(type.id)}
                          className="text-xs text-green-600 hover:text-green-700 font-bold cursor-pointer bg-green-50 px-2 py-1 rounded"
                        >
                          Simpan
                        </button>
                        <button
                          onClick={() => {
                            setEditTypeId(null);
                            setEditTypeName('');
                          }}
                          className="text-xs text-slate-500 hover:text-slate-700 font-medium cursor-pointer bg-slate-200 px-2 py-1 rounded"
                        >
                          Batal
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            setEditTypeId(type.id);
                            setEditTypeName(type.name);
                          }}
                          className="text-xs text-sky-600 hover:text-sky-700 font-bold cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteVehicleType(type.id)}
                          className="text-xs text-red-500 hover:text-red-700 font-bold cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity ml-1"
                        >
                          Hapus
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
