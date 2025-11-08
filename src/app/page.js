// File: app/page.js
'use client';

import LocationDropdown from '@/components/LocationDropdown';
import TmsSummary from '@/components/TmsSummary';
import UserSelectionGrid from '@/components/UserSelectionGrid';
import { ROLE_ID } from '@/lib/constants';
import { useEffect, useState } from 'react';
// --- Impor Layout Baru ---
import AppLayout from '@/components/AppLayout';
import SelectionLayout from '@/components/SelectionLayout';
import Spinner from '@/components/Spinner';
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
      let hubs = [];
      let processedHubs = [];
      try {
        const response = await fetch('/api/get-hubs');
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Gagal mengambil data hubs dari server');
        }
        if (Array.isArray(data)) {
          hubs = data;
        } else if (data && Array.isArray(data.data)) {
          hubs = data.data;
        } else if (data && Array.isArray(data.results)) {
          hubs = data.results;
        } else {
          throw new Error('Format data hubs tidak dikenal.');
        }
        processedHubs = hubs
          .filter((hub) => hub.name !== 'Hub Demo')
          .map((hub) => ({
            ...hub,
            name: hub.name.replace('Hub ', ''),
          }));
        setAllHubsList(processedHubs);
        localStorage.setItem('allHubsList', JSON.stringify(processedHubs));
      } catch (e) {
        setPageError(e.message);
        toastError(e.message);
        setIsLoading(false);
        return;
      }
      const storedLocation = localStorage.getItem('userLocation');
      const storedLocationName = localStorage.getItem('userLocationName');
      const storedUser = localStorage.getItem('selectedUser');
      const storedDrivers = localStorage.getItem('driverData');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        setSelectedUser(user);
        const userHubIds = user.hubId || [];
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
        setCurrentHubListView(processedHubs);
      }
      if (storedLocation && storedDrivers) {
        setDriverData({ data: JSON.parse(storedDrivers) });
      }
      setIsLoading(false);
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
        const driverRoleId = '6703410af6be892f3208ecde';
        const driverJktRoleId = '68f74e1cff7fa2efdd0f6a38';
        const specialHubs = ['6895a281bc530d4a4908f5ef', '68b8038b1aa98343380e3ab2'];
        const isSpecialHub = specialHubs.includes(selectedLocation);
        const rolesToFetch = [driverRoleId];
        if (isSpecialHub) {
          rolesToFetch.push(driverJktRoleId);
        }
        const driverPromises = rolesToFetch.map((roleId) => {
          const apiUrl = `/api/get-users?hubId=${selectedLocation}&roleId=${roleId}&status=active`;
          return fetch(apiUrl);
        });
        const vehicleApiUrl = `/api/get-vehicles?hubId=${selectedLocation}&limit=500`;
        const vehiclePromise = fetch(vehicleApiUrl);
        const driverResponses = await Promise.all(driverPromises);
        const vehicleResponse = await vehiclePromise;
        let rawDrivers = [];
        for (const res of driverResponses) {
          if (!res.ok) throw new Error('Gagal mengambil data users (driver).');
          const data = await res.json();
          if (data && Array.isArray(data.data)) {
            rawDrivers = rawDrivers.concat(data.data);
          }
        }
        const processedDrivers = rawDrivers.map((driver) => ({
          _id: driver._id,
          name: driver.name,
          email: driver.email,
        }));
        if (!vehicleResponse.ok) throw new Error('Gagal mengambil data vehicles.');
        const vehicleResult = await vehicleResponse.json();
        if (!vehicleResult || !Array.isArray(vehicleResult.data)) {
          throw new Error('Data vehicle tidak sesuai.');
        }
        const vehicleMap = vehicleResult.data.reduce((acc, vehicle) => {
          if (vehicle.assignee) {
            acc[vehicle.assignee] = {
              plat: vehicle.name,
              type: vehicle.tags && vehicle.tags.length > 0 ? vehicle.tags[0] : null,
            };
          }
          return acc;
        }, {});
        const mergedDriverData = processedDrivers.map((driver) => {
          const vehicleInfo = vehicleMap[driver.email];
          return {
            email: driver.email,
            name: driver.name,
            plat: vehicleInfo ? vehicleInfo.plat : null,
            type: vehicleInfo ? vehicleInfo.type : null,
          };
        });
        setDriverData({ data: mergedDriverData });
        localStorage.setItem('driverData', JSON.stringify(mergedDriverData));
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
    <AppLayout mainClassName="items-center justify-center px-6">
      <TmsSummary
        selectedLocation={selectedLocation}
        selectedLocationName={selectedLocationName}
        selectedUser={selectedUser}
        driverData={driverData.data}
        isAnyLoading={isAnyLoading}
        setIsAnyLoading={setIsAnyLoading}
        isMapping={isMapping}
        setIsMapping={setIsMapping}
      />
    </AppLayout>
  );
}
