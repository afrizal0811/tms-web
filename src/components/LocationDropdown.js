'use client';

import { useEffect, useState } from 'react';
import { toastError } from '@/lib/toastHelper'; // <-- Import ini sekarang akan kita gunakan

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
    error: null, // Kita tetap simpan error di state
  });

  useEffect(() => {
    // hubsToShow adalah daftar SEMUA hub yang di-pass dari page.js
    if (hubsToShow && hubsToShow.length > 0) {
      //eslint-disable-next-line
      setHubsData({
        loading: false,
        data: hubsToShow,
        error: null,
      });
      if (onStatusChange) {
        onStatusChange({ loading: false, error: null });
      }
    } else if (hubsToShow) {
      // Jika hubsToShow ada tapi kosong
      // Ini BUKAN error, ini hanya tidak ada data
      setHubsData({ loading: false, data: [], error: null });
      if (onStatusChange) {
        onStatusChange({ loading: false, error: null });
      }
    } else {
      // Jika hubsToShow masih null (sedang di-fetch oleh parent)
      // Ini juga BUKAN error, ini loading
      setHubsData({ loading: true, data: [], error: null });
      if (onStatusChange) {
        onStatusChange({ loading: true, error: null });
      }
    }

    if (hubsData.error) {
      toastError(hubsData.error);
    }
    // --- SELESAI PERBAIKAN ---
  }, [hubsToShow, onStatusChange, hubsData.error]); // <-- Tambahkan hubsData.error

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
        className={combinedClassName}
      >
        {hubsData.loading && <option value="">Memuat...</option>}
        {hubsData.error && <option value="">Gagal memuat</option>}

        {!hubsData.loading && !hubsData.error && (
          <>
            {showPlaceholder && <option value="">-- Pilih Lokasi --</option>}

            {hubsData.data.map((hub) => (
              <option key={hub._id} value={hub._id}>
                {hub.name}
              </option>
            ))}

            {hubsData.data.length === 0 && (
              <option value="" disabled>
                -- Tidak ada lokasi --
              </option>
            )}
          </>
        )}
      </select>
    </>
  );
}
