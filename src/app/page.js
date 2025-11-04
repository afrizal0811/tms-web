// File: app/page.js
'use client';

import LocationDropdown from '@/components/LocationDropdown';
import TmsSummary from '@/components/TmsSummary';
import UserSelectionGrid from '@/components/UserSelectionGrid';
import { ROLE_ID } from '@/lib/constants';
import { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';

export default function Home() {
  // === STATE UNTUK DATA ===
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [tempSelectedLocation, setTempSelectedLocation] = useState('');
  const [tempSelectedLocationName, setTempSelectedLocationName] = useState('');
  const [selectedLocationName, setSelectedLocationName] = useState('');
  const [driverData, setDriverData] = useState({ data: [] });
  const [isAnyLoading, setIsAnyLoading] = useState(false);
  const [isMapping, setIsMapping] = useState(false);
  // === STATE UNTUK KONTROL ===
  const [isPageLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState(null);

  const [allHubsList, setAllHubsList] = useState(null);
  const [currentHubListView, setCurrentHubListView] = useState(null);

  // --- EFEK SAAT HALAMAN DIBUKA (Inisialisasi Awal) ---
  useEffect(() => {
    async function initializeApp() {
      setIsLoading(true);
      setPageError(null);

      let hubs = [];
      let processedHubs = [];

      // 1. Fetch SEMUA hubs
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
      } catch (e) {
        setPageError(e.message);
        setIsLoading(false);
        return;
      }

      // 2. Cek localStorage
      const storedLocation = localStorage.getItem('userLocation');
      const storedLocationName = localStorage.getItem('userLocationName');
      const storedUser = localStorage.getItem('selectedUser');
      const storedDrivers = localStorage.getItem('driverData');

      if (storedUser) {
        // --- User Sudah Ada ---
        const user = JSON.parse(storedUser);
        setSelectedUser(user);

        const userHubIds = user.hubId || [];

        // Tentukan daftar hub yang boleh dipilih
        const allowed =
          userHubIds.length > 1
            ? processedHubs.filter((h) => userHubIds.includes(h._id))
            : processedHubs; // Jika user hubId = 1, biarkan (akan disembunyikan nanti)

        setCurrentHubListView(allowed);

        // Cek lokasi
        if (storedLocation && storedLocationName) {
          // Validasi: Apakah lokasi yg disimpan masih ada di hubId user?
          if (userHubIds.length === 0 || userHubIds.includes(storedLocation)) {
            setSelectedLocation(storedLocation);
            setSelectedLocationName(storedLocationName);
            // --- TAMBAHKAN INI ---
            setTempSelectedLocation(storedLocation);
            setTempSelectedLocationName(storedLocationName);
            // --- SELESAI TAMBAHAN ---
          } else {
            // Lokasi disimpan salah (misal data user berubah), paksa pilih ulang
            localStorage.removeItem('userLocation');
            localStorage.removeItem('userLocationName');
          }
        }
      } else {
        // --- User Belum Ada (Pertama Kali Buka) ---
        // Tampilkan semua hub
        setCurrentHubListView(processedHubs);
      }

      // Muat driver jika ada
      if (storedLocation && storedDrivers) {
        setDriverData({ data: JSON.parse(storedDrivers) });
      }

      setIsLoading(false);
    }

    initializeApp();
  }, []); // [] = Hanya jalan sekali saat halaman dimuat

  // --- EFEK UNTUK MENGAMBIL DATA DRIVER ---
  useEffect(() => {
    // Fungsi ini akan berjalan SETELAH Langkah 1 selesai
    // (saat 'selectedLocation' diisi)
    async function fetchDriverData() {
      // 1. Cek cache dulu
      const storedDrivers = localStorage.getItem('driverData');
      if (storedDrivers) {
        setDriverData({ data: JSON.parse(storedDrivers) });
        return;
      }

      // 2. Jika cache tidak ada, fetch
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
        setPageError(err.message);
      }
    }

    if (selectedLocation) {
      fetchDriverData();
    }
  }, [selectedLocation]); // <-- Efek ini "mengawasi" selectedLocation

  // --- FUNGSI HANDLER ---

  // Dipanggil dari LocationDropdown
  const handleLocationChange = (id, name) => {
    setTempSelectedLocation(id);
    setTempSelectedLocationName(name);
  };

  // Dipanggil dari tombol "Save" di Langkah 1 (Lokasi)
  const handleSaveLocation = () => {
    if (!tempSelectedLocation) {
      // Cek state sementara
      alert('Silakan pilih lokasi cabang.');
      return;
    }

    // --- PERUBAHAN LOGIKA DI SINI ---
    // HANYA reset user JIKA user-nya belum ada di state
    // (Ini adalah alur pertama kali)
    if (!selectedUser) {
      localStorage.removeItem('selectedUser');
      setSelectedUser(null);
    }
    // Jika selectedUser SUDAH ADA (kasus ganti lokasi),
    // kita lewati bagian 'if' di atas dan user-nya tetap tersimpan.
    // --- SELESAI PERUBAHAN ---

    // Kita selalu reset driver & data lokasi
    localStorage.removeItem('driverData');
    setDriverData({
      data: [],
    }); // Pastikan state driver juga bersih

    // Simpan lokasi baru dari state sementara
    localStorage.setItem('userLocation', tempSelectedLocation);
    localStorage.setItem('userLocationName', tempSelectedLocationName);

    // Set state utama
    setSelectedLocation(tempSelectedLocation);
    setSelectedLocationName(tempSelectedLocationName);
  };
  // Dipanggil dari UserSelectionGrid di Langkah 2 (POIN 1: HANYA SEKALI)
  const handleUserSelect = (user) => {
    localStorage.setItem('selectedUser', JSON.stringify(user));
    setSelectedUser(user);
  };

  // Reset total, kembali ke pemilihan LOKASI
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

  // (POIN 5 & 6) Reset HANYA lokasi (untuk multi-hub user)
  const handleResetLocation = () => {
    localStorage.removeItem('userLocation');
    localStorage.removeItem('userLocationName');
    localStorage.removeItem('driverData'); // Driver data tergantung lokasi

    setSelectedLocation('');
    setSelectedLocationName('');
    setDriverData({ data: [] });

    // Siapkan dropdown HANYA untuk hub user
    const allowed = allHubsList.filter((h) => selectedUser.hubId.includes(h._id));
    // Poin 6: Jika nama tidak ada, tampilkan ID-nya
    const allowedWithNames = allowed.map((hub) => ({
      _id: hub._id,
      name: hub.name ? hub.name : hub._id, // Fallback ke ID
    }));

    setCurrentHubListView(allowedWithNames);
  };

  // --- TAMPILAN (RENDER) ---

  if (isPageLoading || allHubsList === null) {
    return (
      <AppLayout className="flex min-h-screen flex-col items-center justify-center p-24">
        <p className="text-xl text-white">Loading Aplikasi...</p>
      </AppLayout>
    );
  }
  if (pageError) {
    return (
      <AppLayout className="flex min-h-screen flex-col items-center justify-center p-24">
        <p className="text-xl text-red-500">Gagal Memuat Aplikasi</p>
        <p className="text-gray-400 mt-2 text-sm">{pageError}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Refresh Halaman
        </button>
      </AppLayout>
    );
  }

  // --- Alur Render BARU ---

  // 1. (POIN 3) Jika LOKASI belum dipilih
  if (!selectedLocation) {
    return (
      <AppLayout className="flex min-h-screen flex-col items-center justify-center p-24">
        <div className="text-center">
          <h1 className="text-4xl font-bold">SELAMAT DATANG!</h1>
          <h2 className="text-xl mt-2 text-gray-400">Silakan pilih lokasi cabang</h2>

          <LocationDropdown
            value={tempSelectedLocation}
            onChange={handleLocationChange}
            onStatusChange={() => {}}
            hubsToShow={currentHubListView}
          />

          <div className="mt-4">
            <button
              onClick={handleSaveLocation}
              disabled={!tempSelectedLocation}
              className="px-6 py-2 bg-blue-600 text-white rounded hovef:bg-blue-700 disabled:bg-gray-400"
            >
              Lanjutkan
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  // 2. (POIN 1 & 7) Jika LOKASI ada, tapi USER belum dipilih
  if (selectedLocation && !selectedUser) {
    return (
      <AppLayout className="flex min-h-screen flex-col items-center justify-center p-6 sm:p-24">
        <div className="text-center w-full">
          <h1 className="text-3xl font-bold">PILIH USER</h1>
          <h2 className="text-lg mt-2 text-gray-400">
            Lokasi: <strong>{selectedLocationName}</strong>
          </h2>
          <UserSelectionGrid
            hubId={selectedLocation}
            roleId={ROLE_ID.planner}
            onUserSelect={handleUserSelect}
          />
          <button onClick={handleResetAll} className="mt-8 text-sm text-gray-400 hover:text-white">
            Kembali (ganti lokasi)
          </button>
        </div>
      </AppLayout>
    );
  }

  // 3. (POIN 5 & 6) Jika LOKASI dan USER ada
  return (
    <AppLayout className="flex min-h-screen flex-col items-center justify-center p-6 sm:p-24">
      <>
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

        {/* (POIN 5) Tombol Ganti Lokasi HANYA muncul jika hubId > 1 */}
        {selectedUser.hubId && selectedUser.hubId.length > 1 && (
          <button
            onClick={handleResetLocation}
            className="mt-4 px-4 py-2 bg-slate-600 text-white rounded hover:bg-slate-700 text-sm disabled:bg-slate-500 disabled:text-slate-300"
            disabled={isAnyLoading || isMapping}
          >
            Ganti Lokasi
          </button>
        )}
      </>
    </AppLayout>
  );
}
