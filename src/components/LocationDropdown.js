// File: src/components/LocationDropdown.js
'use client';

import { useState, useEffect } from 'react';

// Komponen ini menerima 'hubsToShow' (data yang sudah difilter)
// dan tidak lagi fetch data sendiri.
export default function LocationDropdown({ value, onChange, onStatusChange, hubsToShow }) {
  
  const [hubsData, setHubsData] = useState({
    loading: true,
    data: [],
    error: null,
  });

  // useEffect sekarang hanya merespons perubahan props
  useEffect(() => {
    // hubsToShow adalah daftar SEMUA hub yang di-pass dari page.js
    if (hubsToShow && hubsToShow.length > 0) {
      //eslint-disable-next-line
      setHubsData({
        loading: false,
        data: hubsToShow, // Langsung gunakan data dari props
        error: null,
      });
      if (onStatusChange) {
        onStatusChange({ loading: false, error: null });
      }
    } else if (hubsToShow) { // Jika hubsToShow ada tapi kosong
       setHubsData({ loading: false, data: [], error: null });
       if (onStatusChange) {
        onStatusChange({ loading: false, error: null });
      }
    } else { // Jika hubsToShow masih null (sedang di-fetch oleh parent)
      setHubsData({ loading: true, data: [], error: null });
      if (onStatusChange) {
        onStatusChange({ loading: true, error: null });
      }
    }
  }, [hubsToShow, onStatusChange]); // Bereaksi jika hubsToShow berubah

  return (
    <>
      <select 
        value={value}
        onChange={(e) => {
          // Kirim ID dan NAMA
          const id = e.target.value;
          const name = e.target.value ? e.target.options[e.target.selectedIndex].text : '';
          onChange(id, name); 
        }}
        disabled={hubsData.loading || !!hubsData.error}
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
            {/* Loop dari hubsData.data (DAFTAR SEMUA HUB) */}
            {hubsData.data.map((hub) => (
              <option key={hub._id} value={hub._id}>
                {hub.name}
              </option>
            ))}
          </>
        )}
      </select>
      
      {hubsData.error && (
        <p className="text-red-500 text-sm mt-2">{hubsData.error}</p>
      )}
    </>
  );
}