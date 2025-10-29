// File: app/page.js
'use client'; 

import { useState, useEffect } from 'react';
// Impor komponen kita
import LocationDropdown from '@/components/LocationDropdown';
import UserSelectionGrid from '@/components/UserSelectionGrid'; // <-- Komponen baru
// Impor konstanta kita
import { ROLE_ID } from '@/lib/constants'; // <-- Role ID baru

export default function Home() {
  // === STATE UNTUK ALUR ===
  // 1. State untuk lokasi yg dipilih
  const [selectedLocation, setSelectedLocation] = useState('');
  // 2. State untuk menandai LOKASI sudah disimpan
  const [isLocationSaved, setIsLocationSaved] = useState(false);
  // 3. State untuk menandai USER sudah dipilih
  const [selectedUser, setSelectedUser] = useState(null); // Mulai dgn null
  
  // State untuk loading halaman
  const [isPageLoading, setIsLoading] = useState(true);
  
  // State untuk status dropdown (kita masih butuh ini)
  const [dropdownStatus, setDropdownStatus] = useState({
    loading: true,
    error: null,
  });

  // === EFEK SAAT HALAMAN DIBUKA ===
  // Cek localStorage untuk *kedua* item
  useEffect(() => {
    // 1. Cek lokasi
    const storedLocation = localStorage.getItem('userLocation');
    if (storedLocation) {
      //eslint-disable-next-line
      setSelectedLocation(storedLocation);
      setIsLocationSaved(true);
    }
    
    // 2. Cek user
    const storedUser = localStorage.getItem('selectedUser');
    if (storedUser) {
      setSelectedUser(JSON.parse(storedUser));
    }
    
    setIsLoading(false); // Selesai cek
  }, []); 

  // === FUNGSI HANDLER ===
  
  // 1. Saat tombol "Save" lokasi diklik
  const handleSaveLocation = () => {
    if (!selectedLocation) {
      alert('Silakan pilih lokasi cabang terlebih dahulu.');
      return;
    }
    localStorage.setItem('userLocation', selectedLocation);
    setIsLocationSaved(true); // Pindah ke langkah 2
  };
  
  // 2. Saat "user" dipilih dari grid (diterima dari komponen)
  const handleUserSelect = (user) => {
    // Siapkan data yg akan disimpan
    const dataToSave = {
      name: user.name,
      _id: user._id,
      hubId: user.hubId // hubId adalah array, sesuai hasil.json
    };
    
    // Simpan ke localStorage
    localStorage.setItem('selectedUser', JSON.stringify(dataToSave));
    // Set state untuk pindah ke langkah 3
    setSelectedUser(dataToSave);
  };

  // 3. Saat me-reset semua
  const handleReset = () => {
    // Hapus kedua item
    localStorage.removeItem('userLocation');
    localStorage.removeItem('selectedUser');
    
    // Reset semua state
    setIsLocationSaved(false);
    setSelectedLocation('');
    setSelectedUser(null);
  };

  // === TAMPILAN (RENDER) ===
  
  // Tampilan loading awal
  if (isPageLoading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-24">
        <p>Loading...</p>
      </main>
    );
  }

  // Tampilan utama
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 sm:p-24">
      
      {/* LANGKAH 3: SUKSES (User & Lokasi sudah ada) */}
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
          <button
            onClick={handleReset}
            className="mt-6 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Reset Pilihan
          </button>
        </div>
      
      /* LANGKAH 2: PILIH USER (Lokasi ada, User belum) */
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
            roleId={ROLE_ID.planner} // Ambil dari constants
            onUserSelect={handleUserSelect} // Kirim fungsi handler
          />
          {/* Tombol untuk kembali ke langkah 1 */}
          <button 
            onClick={handleReset}
            className="mt-8 text-sm text-gray-400 hover:text-white"
          >
            Kembali pilih lokasi
          </button>
        </div>

      /* LANGKAH 1: PILIH LOKASI (Default) */
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