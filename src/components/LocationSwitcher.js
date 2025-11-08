'use client';

import { useEffect, useState } from 'react';
import LocationDropdown from './LocationDropdown';
import { toastError } from '../lib/toastHelper';

export default function LocationSwitcher() {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentLocationName, setCurrentLocationName] = useState('');
  const [allHubs, setAllHubs] = useState([]);
  const [allowedHubs, setAllowedHubs] = useState([]);

  // Ambil data dari localStorage saat komponen pertama kali dimuat
  useEffect(() => {
    try {
      const userStr = localStorage.getItem('selectedUser');
      const locationName = localStorage.getItem('userLocationName');

      if (locationName) {
        //eslint-disable-next-line
        setCurrentLocationName(locationName);
      }

      if (userStr) {
        const user = JSON.parse(userStr);
        setCurrentUser(user);

        // Ambil daftar semua hub (disimpan oleh page.js)
        const allHubsStr = localStorage.getItem('allHubsList');
        if (allHubsStr) {
          const hubs = JSON.parse(allHubsStr);
          setAllHubs(hubs);

          // Tentukan hub apa saja yang boleh diakses user ini
          const userHubIds = user.hubId || [];
          if (userHubIds.length > 1) {
            const allowed = hubs.filter((h) => userHubIds.includes(h._id));
            setAllowedHubs(allowed);
          }
        }
      }
    } catch (e) {
      toastError('Gagal memuat data user/lokasi: ' + e.message);
    }
  }, []);

  // Fungsi untuk menangani perubahan lokasi
  const handleLocationChange = (id, name) => {
    localStorage.setItem('userLocation', id);
    localStorage.setItem('userLocationName', name);
    localStorage.removeItem('driverData'); // Hapus driverData lama
    window.location.reload(); // Refresh halaman
  };

  // --- Render Logic ---

  // Jangan tampilkan apa-apa jika data user/lokasi belum ada
  if (!currentUser || !currentLocationName) {
    return null;
  }

  // Jika user HANYA punya 1 lokasi (tidak ada privilege ganti), tampilkan teks
  if (allowedHubs.length <= 1) {
    return <span className="text-sm font-medium text-slate-700">{currentLocationName}</span>;
  }

  return (
    <LocationDropdown
      value={localStorage.getItem('userLocation') || ''}
      onChange={handleLocationChange}
      onStatusChange={() => {}}
      hubsToShow={allowedHubs}
      className="text-sm border border-gray-300 rounded-md bg-white"
      showPlaceholder={false}
    />
  );
}
