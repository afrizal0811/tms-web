// File: app/page.js
'use client'; 

import { useState, useEffect } from 'react';
import LocationDropdown from '@/components/LocationDropdown';
import UserSelectionGrid from '@/components/UserSelectionGrid';
import { ROLE_ID } from '@/lib/constants'; 

export default function Home() {
  // ... (State kamu yang lain tetap sama) ...
  const [selectedLocation, setSelectedLocation] = useState('');
  const [isLocationSaved, setIsLocationSaved] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null); 
  const [isPageLoading, setIsLoading] = useState(true);
  const [dropdownStatus, setDropdownStatus] = useState({
    loading: true,
    error: null,
  });
  const [driverData, setDriverData] = useState({
    loading: false,
    data: [], 
    error: null,
  });

  // ... (useEffect untuk cek localStorage di awal... tetap sama) ...
  useEffect(() => {
    const storedLocation = localStorage.getItem('userLocation');
    const storedUser = localStorage.getItem('selectedUser');
    const storedDrivers = localStorage.getItem('driverData'); 

    if (storedLocation) {
      setSelectedLocation(storedLocation);
      setIsLocationSaved(true);
    }
    if (storedUser) {
      setSelectedUser(JSON.parse(storedUser));
    }
    if (storedDrivers) {
      console.log("Memuat data driver dari cache localStorage...");
      setDriverData({ 
        loading: false, 
        data: JSON.parse(storedDrivers), 
        error: null 
      });
    }
    setIsLoading(false); 
  }, []); 

  // === UPDATE DI SINI: useEffect untuk mengambil DATA DRIVER ===
  useEffect(() => {
    // Hanya fetch jika:
    // 1. Kita di langkah 2 (isLocationSaved, !selectedUser)
    // 2. Data driver di state KOSONG (dari cache)
    if (isLocationSaved && !selectedUser && selectedLocation && driverData.data.length === 0) {
      
      async function fetchDrivers() {
        console.log("Cache driver kosong. Mengambil data driver dari API...");
        setDriverData({ loading: true, data: [], error: null });
        
        // --- LOGIKA BARU UNTUK MULTI-ROLE ---
        const hubId = selectedLocation;
        
        // Definisikan role
        const driverRoleId = '6703410af6be892f3208ecde';
        const driverJktRoleId = '68f74e1cff7fa2efdd0f6a38';
        
        // Definisikan hub spesial
        const specialHubs = [
          '6895a281bc530d4a4908f5ef', // Cikarang
          '68b8038b1aa98343380e3ab2'  // Daan Mogot
        ];

        // Tentukan role apa saja yang akan di-fetch
        const rolesToFetch = [driverRoleId]; // Selalu fetch role driver utama
        if (specialHubs.includes(hubId)) {
          rolesToFetch.push(driverJktRoleId); // Tambah driverJkt jika hub spesial
          console.log("Hub spesial terdeteksi. Menambahkan driverJkt...");
        }

        try {
          // Buat array berisi "promise" untuk setiap API call
          const fetchPromises = rolesToFetch.map(roleId => {
            const apiUrl = `/api/get-users?hubId=${hubId}&roleId=${roleId}&status=active`;
            return fetch(apiUrl);
          });

          // Jalankan semua API call secara paralel
          const responses = await Promise.all(fetchPromises);

          // Cek apakah SEMUA respons berhasil
          for (const res of responses) {
            if (!res.ok) {
              const errorData = await res.json();
              throw new Error(errorData.error || `Gagal mengambil data driver (status: ${res.status})`);
            }
          }

          // Ubah semua respons menjadi JSON
          const jsonPromises = responses.map(res => res.json());
          const results = await Promise.all(jsonPromises);

          // Gabungkan data dari semua hasil (results adalah array dari [{data: [...]}, {data: [...]}])
          // Gunakan flatMap untuk menggabungkan array 'data' dari setiap hasil
          const allDriversArray = results.flatMap(result => result.data);

          if (!Array.isArray(allDriversArray)) {
            throw new Error("Data driver yang diterima bukanlah array.");
          }
          
          // Proses data gabungan (hanya nama, email, id)
          const processedDrivers = allDriversArray.map(driver => ({
            name: driver.name,
            email: driver.email,
            _id: driver._id
          }));
          
          console.log(`Data driver (total ${processedDrivers.length}) berhasil diambil dari API.`);
          
          // Simpan ke state
          setDriverData({
            loading: false,
            data: processedDrivers,
            error: null
          });
          
          // Simpan ke localStorage
          localStorage.setItem('driverData', JSON.stringify(processedDrivers));
          console.log('Data driver gabungan disimpan ke cache localStorage.');

        } catch (err) {
          console.error('Error fetching drivers:', err);
          setDriverData({
            loading: false,
            data: [],
            error: err.message
          });
        }
      }
      
      fetchDrivers();
    }
  }, [isLocationSaved, selectedUser, selectedLocation, driverData.data.length]);

  // === FUNGSI HANDLER (Tetap sama) ===
  const handleSaveLocation = () => {
    if (!selectedLocation) {
      alert('Silakan pilih lokasi cabang terlebih dahulu.');
      return;
    }
    localStorage.setItem('userLocation', selectedLocation);
    setIsLocationSaved(true);
  };
  
  const handleUserSelect = (user) => {
    const dataToSave = {
      name: user.name,
      _id: user._id, // Ambil _id dari user yg dipilih
      hubId: user.hubId 
    };
    localStorage.setItem('selectedUser', JSON.stringify(dataToSave));
    setSelectedUser(dataToSave);
  };

  // ... (handleReset... tetap sama) ...
  const handleReset = () => {
    localStorage.removeItem('userLocation');
    localStorage.removeItem('selectedUser');
    localStorage.removeItem('driverData'); 
    
    setIsLocationSaved(false);
    setSelectedLocation('');
    setSelectedUser(null);
    setDriverData({ loading: false, data: [], error: null }); 
  };

  // === TAMPILAN (RENDER) (Tetap sama) ===
  // ... (Tampilan 'isPageLoading') ...
  if (isPageLoading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-24">
        <p>Loading...</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 sm:p-24">
      
      {/* LANGKAH 3: SUKSES */}
      {isLocationSaved && selectedUser ? (
        <div className="text-center">
          <h1 className="text-4xl font-bold text-green-500">
            Kamu berhasil!
          </h1>
          <p className="mt-4 text-lg">
            Lokasi: {selectedLocation}
          </p>
          <p className="mt-2 text-lg">
            User: {selectedUser.name}
          </p>
          <p className="mt-2 text-sm text-gray-400">
            (Berhasil memuat {driverData.data.length} data driver dari cache)
          </p>
          <button
            onClick={handleReset}
            className="mt-6 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Reset Pilihan
          </button>
        </div>
      
      /* LANGKAH 2: PILIH USER */
      ) : isLocationSaved && !selectedUser ? (
        <div className="text-center w-full">
          <h1 className="text-3xl font-bold">
            PILIH USER
          </h1>
          <h2 className="text-lg mt-2 text-gray-400">
            Pilih user yang akan login
          </h2>
          
          <UserSelectionGrid
            hubId={selectedLocation}
            roleId={ROLE_ID.planner} 
            onUserSelect={handleUserSelect}
          />
          
          {driverData.loading && (
            <p className="mt-4 text-sm text-yellow-500">
              Memuat data driver...
            </p>
          )}
          {driverData.error && (
            <p className="mt-4 text-sm text-red-500">
              Gagal memuat data driver: {driverData.error}
            </p>
          )}
          
          <button 
            onClick={handleReset}
            className="mt-8 text-sm text-gray-400 hover:text-white"
          >
            Kembali pilih lokasi
          </button>
        </div>

      /* LANGKAH 1: PILIH LOKASI */
      ) : (
        <div className="text-center">
          <h1 className="text-4xl font-bold">
            SELAMAT DATANG!
          </h1>
          <h2 className="text-xl mt-2 text-gray-400">
            Silakan pilih lokasi cabang
          </h2>
          
          <LocationDropdown 
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            onStatusChange={setDropdownStatus}
          />
          
          <div className="mt-4">
            <button
              onClick={handleSaveLocation}
              disabled={dropdownStatus.loading || !!dropdownStatus.error}
              className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
            >
              Save
            </button>
          </div>
        </div>
      )}
    </main>
  );
}