// File: app/page.js
'use client';

import AppLayout from '@/components/AppLayout';
import LocationDropdown from '@/components/LocationDropdown';
import SelectionLayout from '@/components/SelectionLayout';
import Spinner from '@/components/Spinner';
import DashboardSummary from '@/features/dashboard/DashboardSummary';
import UserSelectionGrid from '@/features/userSelection/UserSelectionGrid';
import { ROLE_ID } from '@/lib/constants';
import { useEffect, useState } from 'react';
import { getHubs } from '../lib/apiService';
import { getOrFetchDriverData } from '../lib/driverDataHelper';
import { toastError } from '../lib/toastHelper';

export default function Home() {
  // === STATE UNTUK DATA ===
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedLocationName, setSelectedLocationName] = useState('');
  const [tempSelectedLocation, setTempSelectedLocation] = useState('');
  const [tempSelectedLocationName, setTempSelectedLocationName] = useState('');
  const [driverData, setDriverData] = useState({ data: [] });

  // === STATE UNTUK KONTROL ===
  const [isPageLoading, setIsLoading] = useState(true); // Ini status loading awal
  const [pageError, setPageError] = useState(null);
  const [allHubsList, setAllHubsList] = useState(null);
  const [currentHubListView, setCurrentHubListView] = useState(null);

  // State Kontrol UI dari TmsSummary
  const [isAnyLoading, setIsAnyLoading] = useState(false);
  const [isMapping, setIsMapping] = useState(false);

  // ... (useEffect initializeApp dan fetchDriverData tetap SAMA) ...
  useEffect(() => {
    async function initializeApp() {
      setIsLoading(true);
      setPageError(null);

      // --- PERBAIKAN: Deklarasikan 'processedHubs' di sini ---
      let processedHubs = [];
      // ---------------------------------------------------

      try {
        // 1. Ambil data hubs
        const hubs = await getHubs();

        processedHubs = hubs // <-- Assign nilai, jangan deklarasi ulang
          .filter((hub) => hub.name !== 'Hub Demo')
          .map((hub) => ({
            ...hub,
            name: hub.name.replace('Hub ', ''),
          }));

        setAllHubsList(processedHubs);
        localStorage.setItem('allHubsList', JSON.stringify(processedHubs));
      } catch (e) {
        // toastError sudah di-handle oleh apiService
        setPageError(e.message);
        setIsLoading(false);
        return; // Hentikan eksekusi jika hubs gagal dimuat
      }

      // --- LOGIKA SISA (sekarang bisa akses 'processedHubs') ---
      try {
        const storedLocation = localStorage.getItem('userLocation');
        const storedLocationName = localStorage.getItem('userLocationName');
        const storedUser = localStorage.getItem('selectedUser');
        const storedDrivers = localStorage.getItem('driverData');

        if (storedUser) {
          const user = JSON.parse(storedUser);
          setSelectedUser(user);
          const userHubIds = user.hubId || [];

          // 'processedHubs' sekarang bisa diakses di sini
          const allowed =
            userHubIds.length > 1
              ? processedHubs.filter((h) => userHubIds.includes(h._id))
              : processedHubs;
          setCurrentHubListView(allowed);

          if (storedLocation && storedLocationName) {
            if (userHubIds.length === 0 || userHubIds.includes(storedLocation)) {
              setSelectedLocation(storedLocation);
              setSelectedLocationName(storedLocationName);
              setTempSelectedLocation(storedLocation);
              setTempSelectedLocationName(storedLocationName);
            } else {
              localStorage.removeItem('userLocation');
              localStorage.removeItem('userLocationName');
            }
          }
        } else {
          // 'processedHubs' juga bisa diakses di sini
          setCurrentHubListView(processedHubs);
        }

        if (storedLocation && storedDrivers) {
          setDriverData({ data: JSON.parse(storedDrivers) });
        }
      } catch (e) {
        // Tangani error jika JSON.parse atau localStorage gagal
        setPageError(e.message);
        toastError(e.message);
      } finally {
        setIsLoading(false);
      }
    }
    initializeApp();
  }, []);

  useEffect(() => {
    async function fetchDriverData() {
      const storedDrivers = localStorage.getItem('driverData');
      if (storedDrivers) {
        setDriverData({ data: JSON.parse(storedDrivers) });
        return;
      }
      try {
        const data = await getOrFetchDriverData(selectedLocation);
        setDriverData({ data: data });
      } catch (err) {
        toastError(e.message);
      }
    }
    if (selectedLocation) {
      fetchDriverData();
    }
  }, [selectedLocation]);

  // ... (handleLocationChange, handleSaveLocation, handleUserSelect, handleResetAll, handleResetLocation tetap SAMA) ...
  const handleLocationChange = (id, name) => {
    setTempSelectedLocation(id);
    setTempSelectedLocationName(name);
  };
  const handleSaveLocation = () => {
    if (!tempSelectedLocation) {
      alert('Silakan pilih lokasi cabang.');
      return;
    }
    if (!selectedUser) {
      localStorage.removeItem('selectedUser');
      setSelectedUser(null);
    }
    localStorage.removeItem('driverData');
    setDriverData({ data: [] });
    localStorage.setItem('userLocation', tempSelectedLocation);
    localStorage.setItem('userLocationName', tempSelectedLocationName);
    setSelectedLocation(tempSelectedLocation);
    setSelectedLocationName(tempSelectedLocationName);
  };
  const handleUserSelect = (user) => {
    localStorage.setItem('selectedUser', JSON.stringify(user));
    setSelectedUser(user);
  };
  const handleResetAll = () => {
    localStorage.removeItem('userLocation');
    localStorage.removeItem('userLocationName');
    localStorage.removeItem('selectedUser');
    localStorage.removeItem('driverData');
    setSelectedUser(null);
    setSelectedLocation('');
    setSelectedLocationName('');
    setDriverData({ data: [] });
    setCurrentHubListView(allHubsList);
  };
  const handleResetLocation = () => {
    localStorage.removeItem('userLocation');
    localStorage.removeItem('userLocationName');
    localStorage.removeItem('driverData');
    setSelectedLocation('');
    setSelectedLocationName('');
    setDriverData({ data: [] });
    const allowed = allHubsList.filter((h) => selectedUser.hubId.includes(h._id));
    const allowedWithNames = allowed.map((hub) => ({
      _id: hub._id,
      name: hub.name ? hub.name : hub._id,
    }));
    setCurrentHubListView(allowedWithNames);
  };

  // --- TAMPILAN (RENDER) ---

  if (isPageLoading || allHubsList === null) {
    return (
      <SelectionLayout>
        <Spinner />
      </SelectionLayout>
    );
  }

  if (pageError) {
    return (
      <SelectionLayout>
        <div className="text-center">
          <p className="text-xl text-red-500">Gagal Memuat Aplikasi</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-sky-600 text-white rounded hover:bg-sky-700"
          >
            Refresh Halaman
          </button>
        </div>
      </SelectionLayout>
    );
  }

  // Alur Render BARU (Poin 1)

  // 1. Jika LOKASI belum dipilih -> Tampilkan Layout Seleksi (Tanpa Navbar)
  if (!selectedLocation) {
    return (
      <SelectionLayout>
        {/* --- TAMBAHKAN 'w-full' DI SINI --- */}
        <div className="text-center w-full">
          <h1 className="text-4xl font-bold">SELAMAT DATANG!</h1>
          <h2 className="text-xl mt-2 text-gray-500">Silakan pilih lokasi cabang</h2>
          <LocationDropdown
            value={tempSelectedLocation}
            onChange={handleLocationChange}
            onStatusChange={() => {}}
            hubsToShow={currentHubListView}
            className="mt-6 p-2 rounded border border-gray-300 w-64"
          />
          <div className="mt-4">
            <button
              onClick={handleSaveLocation}
              disabled={!tempSelectedLocation}
              className="px-6 py-2 bg-sky-600 text-white rounded hover:bg-sky-700 disabled:bg-gray-400 cursor-pointer"
            >
              Lanjutkan
            </button>
          </div>
        </div>
      </SelectionLayout>
    );
  }

  // 2. Jika LOKASI ada, tapi USER belum -> Tampilkan Layout Seleksi (Tanpa Navbar)
  if (selectedLocation && !selectedUser) {
    return (
      <SelectionLayout>
        <div className="text-center w-full">
          <h1 className="text-3xl font-bold">PILIH USER</h1>
          <h2 className="text-lg mt-2 text-gray-500">
            Lokasi: <strong>{selectedLocationName}</strong>
          </h2>
          <UserSelectionGrid
            hubId={selectedLocation}
            roleId={ROLE_ID.planner}
            onUserSelect={handleUserSelect}
          />
          <button
            onClick={handleResetAll}
            className="mt-4 px-4 py-2 bg-slate-600 text-white rounded hover:bg-slate-700 text-sm disabled:bg-slate-500 disabled:text-slate-300"
          >
            Kembali
          </button>
        </div>
      </SelectionLayout>
    );
  }

  // 3. Jika LOKASI dan USER ada -> Tampilkan Layout APLIKASI UTAMA (Dengan Navbar)
  return (
    // Gunakan <AppLayout> agar Navbar muncul
    <AppLayout mainClassName="items-center justify-center px-6">
      {/* Render komponen Dashboard baru */}
      <DashboardSummary driverData={driverData.data} />
    </AppLayout>
  );
}
