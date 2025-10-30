// File: app/page.js
'use client'; 

import { useState, useEffect } from 'react';
import LocationDropdown from '@/components/LocationDropdown';
import UserSelectionGrid from '@/components/UserSelectionGrid';
import TmsSummary from '@/components/TmsSummary'
import { ROLE_ID } from '@/lib/constants'; 

export default function Home() {
  // === STATE UNTUK ALUR ===
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedLocationName, setSelectedLocationName] = useState(''); // <-- TAMBAHKAN STATE INI
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
  // === EFEK SAAT HALAMAN DIBUKA ===
  useEffect(() => {
    // Cek semua data yang tersimpan
    const storedLocation = localStorage.getItem('userLocation');
    const storedLocationName = localStorage.getItem('userLocationName'); 
    const storedUser = localStorage.getItem('selectedUser');
    const storedDrivers = localStorage.getItem('driverData');
    if (storedLocation) {
      setSelectedLocation(storedLocation);
      setIsLocationSaved(true);
    }
    if (storedLocationName) { // <-- TAMBAHKAN INI
      setSelectedLocationName(storedLocationName);
    }
    if (storedUser) {
      setSelectedUser(JSON.parse(storedUser));
    }
    if (storedDrivers) {
      setDriverData({
        loading: false,
        data: JSON.parse(storedDrivers),
        error: null
      });
    }
    setIsLoading(false);
  }, []);

  // === UPDATE BESAR DI SINI: useEffect untuk mengambil DATA DRIVER & VEHICLE ===
  useEffect(() => {
    // Hanya fetch jika:
    // 1. Kita di langkah 2 (isLocationSaved, !selectedUser)
    // 2. Data driver di state KOSONG (dari cache)
    if (isLocationSaved && !selectedUser && selectedLocation && driverData.data.length === 0) {
      
      async function fetchDriverAndVehicleData() {
        setDriverData({ loading: true, data: [], error: null });
        
        const hubId = selectedLocation;
        
        // --- 1. Siapkan semua promise ---
        const driverRoleId = '6703410af6be892f3208ecde';
        const driverJktRoleId = '68f74e1cff7fa2efdd0f6a38';
        const specialHubs = [
          '6895a281bc530d4a4908f5ef', // Cikarang
          '68b8038b1aa98343380e3ab2'  // Daan Mogot
        ];

        // Buat daftar promise untuk fetch driver
        const driverRolesToFetch = [driverRoleId];
        if (specialHubs.includes(hubId)) {
          driverRolesToFetch.push(driverJktRoleId);
        }
        
        const driverPromises = driverRolesToFetch.map(roleId => {
          const apiUrl = `/api/get-users?hubId=${hubId}&roleId=${roleId}&status=active`;
          return fetch(apiUrl);
        });

        // Buat promise untuk fetch vehicle
        const vehicleApiUrl = `/api/get-vehicles?hubId=${hubId}&limit=500`;
        const vehiclePromise = fetch(vehicleApiUrl);
        // --- Selesai siapkan promise ---

        try {
          // --- 2. Jalankan semua promise secara paralel ---
          const driverResponses = await Promise.all(driverPromises);
          const vehicleResponse = await vehiclePromise; // Tunggu vehicle
          
          // --- 3. Proses Response Driver ---
          // Cek error driver
          for (const res of driverResponses) {
            if (!res.ok) {
              const errorData = await res.json();
              throw new Error(errorData.error || `Gagal mengambil data driver`);
            }
          }
          // Ambil JSON driver
          const driverJsonPromises = driverResponses.map(res => res.json());
          const driverResults = await Promise.all(driverJsonPromises);
          // Gabungkan data driver (dari 'driver' dan 'driverJkt')
          const rawDrivers = driverResults.flatMap(result => result.data);
          // Proses data driver (ambil yg perlu saja)
          const processedDrivers = rawDrivers.map(driver => ({
            _id: driver._id,
            name: driver.name,
            email: driver.email
          }));

          // --- 4. Proses Response Vehicle ---
          if (!vehicleResponse.ok) {
            const errorData = await vehicleResponse.json();
            throw new Error(errorData.error || `Gagal mengambil data vehicle`);
          }
          // Ambil JSON vehicle
          const vehicleResult = await vehicleResponse.json();
          const rawVehicles = vehicleResult.data; // Berdasarkan hasil.json
          
          if (!Array.isArray(rawVehicles)) {
            throw new Error("Data vehicle yang diterima bukanlah array.");
          }
          
          // Buat "Lookup Map" dari data vehicle untuk penggabungan yg cepat
          // Key: email (assignee), Value: { plat, type }
          const vehicleMap = rawVehicles.reduce((acc, vehicle) => {
            if (vehicle.assignee) { // Hanya proses jika ada assignee
              acc[vehicle.assignee] = {
                plat: vehicle.name, // 'name' diubah jadi 'plat'
                type: vehicle.tags && vehicle.tags.length > 0 ? vehicle.tags[0] : null // 'tags[0]' diubah jadi 'type'
              };
            }
            return acc;
          }, {});

          // --- 5. Gabungkan Data Driver dan Vehicle ---
          const mergedDriverData = processedDrivers.map(driver => {
            const vehicleInfo = vehicleMap[driver.email]; // Cocokkan email
            
            return {
              email: driver.email,
              name: driver.name,
              plat: vehicleInfo ? vehicleInfo.plat : null, // Ambil plat jika ada
              type: vehicleInfo ? vehicleInfo.type : null  // Ambil type jika ada
            };
          });
          
          // --- 6. Simpan ke State dan localStorage ---
          setDriverData({
            loading: false,
            data: mergedDriverData,
            error: null
          });
          
          localStorage.setItem('driverData', JSON.stringify(mergedDriverData));

        } catch (err) {
          console.error('Error fetching data:', err);
          setDriverData({
            loading: false,
            data: [],
            error: err.message
          });
        }
      }
      
      fetchDriverAndVehicleData();
    }
  }, [isLocationSaved, selectedUser, selectedLocation, driverData.data.length]);

  // === FUNGSI HANDLER (Tidak berubah) ===
  const handleSaveLocation = () => {
    if (!selectedLocation || !selectedLocationName) { // <-- Perbarui cek
      alert('Silakan pilih lokasi cabang terlebih dahulu.');
      return;
    }
    localStorage.setItem('userLocation', selectedLocation);
    localStorage.setItem('userLocationName', selectedLocationName); // <-- TAMBAHKAN INI
    setIsLocationSaved(true);
  };
  
  const handleUserSelect = (user) => {
    const dataToSave = {
      name: user.name,
      _id: user._id, 
      hubId: user.hubId 
    };
    localStorage.setItem('selectedUser', JSON.stringify(dataToSave));
    setSelectedUser(dataToSave);
  };

  const handleReset = () => {
    localStorage.removeItem('userLocation');
    localStorage.removeItem('userLocationName');
    localStorage.removeItem('selectedUser');
    localStorage.removeItem('driverData'); 
    
    setIsLocationSaved(false);
    setSelectedLocation('');
    setSelectedLocationName('');
    setSelectedUser(null);
    setDriverData({ loading: false, data: [], error: null }); 
  };

  // === TAMPILAN (RENDER) (Tidak berubah) ===
if (isPageLoading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-24">
        <p>Loading...</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 sm:p-24">
      
      {/* --- BAGIAN INI YANG BERUBAH --- */}
      {/* LANGKAH 3: TAMPILKAN KOMPONEN TMS SUMMARY */}
      {isLocationSaved && selectedUser ? (
        <>
          <TmsSummary 
            selectedLocation={selectedLocation}
            selectedLocationName={selectedLocationName}
            selectedUser={selectedUser}
            driverData={driverData.data} // Kirim data driver (tanpa loading/error)
          />
          {/* Tombol Reset tetap ada di bawahnya */}
          <button
            onClick={handleReset}
            className="mt-8 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
          >
            Reset Pilihan Awal
          </button>
        </>
      
      /* LANGKAH 2: PILIH USER */
      ) : isLocationSaved && !selectedUser ? (
        // ... (Tampilan Pilih User tetap sama) ...
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
              Memuat data driver & vehicle...
            </p>
          )}
          {driverData.error && (
            <p className="mt-4 text-sm text-red-500">
              Gagal memuat data: {driverData.error}
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
        // ... (Tampilan Pilih Lokasi tetap sama) ...
        <div className="text-center">
          <h1 className="text-4xl font-bold">
            SELAMAT DATANG!
          </h1>
          <h2 className="text-xl mt-2 text-gray-400">
            Silakan pilih lokasi cabang
          </h2>
          
          <LocationDropdown 
            value={selectedLocation}
            onChange = {
              (id, name) => {
                setSelectedLocation(id);
                setSelectedLocationName(name);
              }
            }
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