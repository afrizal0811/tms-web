// File: features/location/LocationSwitcher.js
'use client';

import { useEffect, useState } from 'react';
import { toastError } from '../../lib/toastHelper';
import LocationDropdown from '../LocationDropdown';

// Hook & modal
import VehicleTagMappingModal from '@/components/VehicleTagMappingModal';
import { useVehicleTagCheck } from '@/lib/hooks/useVehicleTagCheck';

export default function LocationSwitcher() {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentLocationName, setCurrentLocationName] = useState('');
  const [allowedHubs, setAllowedHubs] = useState([]); // hanya { _id, name }

  // Hook untuk cek tag/kendaraan
  const {
    isChecking, // tetap tersedia dari hook (tapi kita gak tampilkan spinner)
    showModal,
    unmappedData,
    triggerCheck,
    handleMappingCompleted,
  } = useVehicleTagCheck();

  // Ambil user + allHubsList dari localStorage (hanya name & _id)
  useEffect(() => {
    try {
      const userStr = localStorage.getItem('selectedUser');
      const locationName = localStorage.getItem('userLocationName');
      //eslint-disable-next-line
      if (locationName) setCurrentLocationName(locationName);

      if (userStr) {
        const user = JSON.parse(userStr);
        setCurrentUser(user);

        const allHubsStr = localStorage.getItem('allHubsList');
        if (allHubsStr) {
          try {
            const hubsRaw = JSON.parse(allHubsStr);
            // Pastikan array bentuk { name, _id } saja
            const hubsSimple = Array.isArray(hubsRaw)
              ? hubsRaw.map((h) => ({ _id: h._id, name: h.name }))
              : Array.isArray(hubsRaw.allHubsList) // kompatibilitas jika disimpan sebagai object wrapper
                ? hubsRaw.allHubsList.map((h) => ({ _id: h._id, name: h.name }))
                : [];

            // Jika user.hubId tersedia, filter allowed hubs; jika tidak, tampilkan semua
            const userHubIds = Array.isArray(user.hubId) ? user.hubId : [];
            const allowed =
              userHubIds.length > 0
                ? hubsSimple.filter((h) => userHubIds.includes(h._id))
                : hubsSimple;
            setAllowedHubs(allowed);
          } catch (e) {
            console.error('allHubsList parse error', e);
            setAllowedHubs([]);
          }
        }
      }
    } catch (e) {
      toastError('Gagal memuat data user/lokasi: ' + e.message);
    }
  }, []);

  // Handle location change:
  //  - panggil triggerCheck(hubId, onSuccess)
  //  - onSuccess: simpan userLocation & userLocationName di localStorage (sesuai permintaan)
  const handleLocationChange = (id, name) => {
    try {
      triggerCheck(id, () => {
        // simpan perubahan di localStorage (hanya id & name)
        localStorage.setItem('userLocation', id);
        localStorage.setItem('userLocationName', name);
        // opsi: jangan ubah allHubsList di sini — allHubsList tetap sumber kebenaran
        // hapus driverData lama jika perlu (sesuai perilaku lama)
        localStorage.removeItem('driverData');
        // reload supaya app memakai lokasi baru
        window.location.reload();
      });
    } catch (err) {
      // fallback: apabila triggerCheck melempar error, tetap simpan agar user tidak terjebak
      console.error('triggerCheck error:', err);
      localStorage.setItem('userLocation', id);
      localStorage.setItem('userLocationName', name);
      localStorage.removeItem('driverData');
      window.location.reload();
    }
  };

  // Bila data belum siap, tampilkan null (tidak menggangu header)
  if (!currentUser) return null;

  // Jika user hanya punya 1 lokasi, tampilkan nama saja (sesuai sebelumnya)
  if (allowedHubs.length <= 1) {
    return <span className="text-sm font-medium text-slate-700">{currentLocationName}</span>;
  }

  return (
    <>
      <LocationDropdown
        value={localStorage.getItem('userLocation') || ''}
        onChange={handleLocationChange}
        hubsToShow={allowedHubs} // hanya { _id, name }
        className="text-sm border border-gray-300 rounded-md bg-white"
        showPlaceholder={false}
      />

      {/* Modal mapping jika hook meminta mapping.
          Kita panggil handleMappingCompleted() yang disediakan hook agar hook bisa menjalankan onSuccess internalnya. */}
      {showModal && (
        <VehicleTagMappingModal
          unmappedData={unmappedData}
          onCompleted={() => {
            try {
              handleMappingCompleted();
            } catch (err) {
              console.error('handleMappingCompleted error:', err);
            }
          }}
        />
      )}
    </>
  );
}
