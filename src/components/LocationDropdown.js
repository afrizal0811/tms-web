// File: src/components/LocationDropdown.js
'use client';

import { useState, useEffect } from 'react';

// Ini adalah komponen dropdown barumu
// Dia menerima 3 "props" (input) dari parent (page.js):
// 1. value: Nilai yang sedang terpilih
// 2. onChange: Fungsi yang harus dijalankan saat nilainya berubah
// 3. onStatusChange: Fungsi untuk memberi tahu parent tentang status (loading/error)
export default function LocationDropdown({ value, onChange, onStatusChange }) {
  
  // State untuk data hubs, SEKARANG ADA DI DALAM SINI
  const [hubsData, setHubsData] = useState({
    loading: true,
    data: [],
    error: null,
  });

  // useEffect untuk mengambil data, SEKARANG ADA DI DALAM SINI
  useEffect(() => {
    // Beri tahu parent bahwa kita mulai loading
    if (onStatusChange) {
      onStatusChange({ loading: true, error: null });
    }

    async function fetchHubs() {
      try {
        const apiUrl = '/api/get-hubs'; 
        const response = await fetch(apiUrl);
        const data = await response.json(); 

        if (!response.ok) {
          throw new Error(data.error || `Gagal mengambil data hubs`);
        }

        // 'data' harusnya adalah array
        const hubsArray = data.data; // Ganti jika array-nya ada di (data.results)

        if (!Array.isArray(hubsArray)) {
          throw new Error("Data hubs yang diterima bukanlah array.");
        }

        const processedData = hubsArray
          .filter(hub => hub.name !== "Hub Demo")
          .map(hub => ({
            ...hub, 
            name: hub.name.replace("Hub ", "") 
          }));
        
        // Atur state internal
        setHubsData({
          loading: false,
          data: processedData, 
          error: null,
        });
        
        // Beri tahu parent bahwa loading selesai
        if (onStatusChange) {
          onStatusChange({ loading: false, error: null });
        }

      } catch (err) {
        console.error('Error fetching hubs:', err);
        // Atur state internal
        setHubsData({
          loading: false,
          data: [],
          error: err.message,
        });
        // Beri tahu parent bahwa ada error
        if (onStatusChange) {
          onStatusChange({ loading: false, error: err.message });
        }
      }
    }
    
    fetchHubs();
  }, [onStatusChange]); // Dependensi

  // Ini adalah JSX untuk dropdown itu sendiri
  return (
    <>
      <select 
        value={value} // Gunakan 'value' dari props
        onChange = {
          (e) => {
            // Ambil ID dan Teks/Nama dari opsi yang dipilih
            const id = e.target.value;
            const name = e.target.value ? e.target.options[e.target.selectedIndex].text : '';
            // Kirimkan keduanya ke parent (app/page.js)
            onChange(id, name);
          }
        }
        disabled={hubsData.loading || !!hubsData.error} // '!!' mengubah error (string) menjadi boolean (true)
        className="mt-6 p-2 rounded border border-gray-300 text-black w-64"
      >
        {hubsData.loading && (
          <option value="">Memuat lokasi...</option>
        )}
        
        {hubsData.error && (
          <option value="">Gagal memuat lokasi</option>
        )}
        
        {!hubsData.loading && !hubsData.error && (
          <>
            <option value="">-- Pilih Lokasi --</option>
            {hubsData.data.map((hub) => (
              <option key={hub._id} value={hub._id}>
                {hub.name}
              </option>
            ))}
          </>
        )}
      </select>
      
      {/* Tampilkan pesan error di bawah dropdown */}
      {hubsData.error && (
        <p className="text-red-500 text-sm mt-2">{hubsData.error}</p>
      )}
    </>
  );
}