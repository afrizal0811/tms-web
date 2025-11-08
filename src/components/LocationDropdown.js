// File: src/components/LocationDropdown.js
'use client';

import { useEffect, useState } from 'react';

// Komponen ini menerima 'hubsToShow' (data yang sudah difilter)
// dan tidak lagi fetch data sendiri.
export default function LocationDropdown({
  value,
  onChange,
  onStatusChange,
  hubsToShow,
  className = '',
  showPlaceholder = true,
  ...props 
}) {
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
    } else if (hubsToShow) {
      // Jika hubsToShow ada tapi kosong
      setHubsData({ loading: false, data: [], error: null });
      if (onStatusChange) {
        onStatusChange({ loading: false, error: null });
      }
    } else {
      // Jika hubsToShow masih null (sedang di-fetch oleh parent)
      setHubsData({ loading: true, data: [], error: null });
      if (onStatusChange) {
        onStatusChange({ loading: true, error: null });
      }
    }
  }, [hubsToShow, onStatusChange]); // Bereaksi jika hubsToShow berubah

  const defaultClasses = 'text-black cursor-pointer';
  const combinedClassName = `${defaultClasses} ${className}`;

  return (
    <>
      <select
        value={value}
        onChange={(e) => {
          const id = e.target.value;
          const name = e.target.value ? e.target.options[e.target.selectedIndex].text : '';
          onChange(id, name);
        }}
        disabled={hubsData.loading || !!hubsData.error || props.disabled}
        // Terapkan class gabungan
        className={combinedClassName}
      >
        {hubsData.loading && <option value="">Memuat...</option>}
        {hubsData.error && <option value="">Error</option>}

        {!hubsData.loading && !hubsData.error && (
          <>
            {/* 2. Tampilkan placeholder HANYA jika diminta */}
            {showPlaceholder && <option value="">-- Pilih Lokasi --</option>}

            {hubsData.data.map((hub) => (
              <option key={hub._id} value={hub._id}>
                {hub.name}
              </option>
            ))}
          </>
        )}
      </select>

      {hubsData.error && <p className="text-red-500 text-sm mt-2">{hubsData.error}</p>}
    </>
  );
}
