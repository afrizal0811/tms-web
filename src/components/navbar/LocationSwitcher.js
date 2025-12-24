// File: features/location/LocationSwitcher.js
'use client';

import VehicleTagMappingModal from '@/components/VehicleTagMappingModal';
import { useVehicleTagCheck } from '@/lib/hooks/useVehicleTagCheck';
import { getLocalStorage, removeLocalStorage, setLocalStorage } from '@/lib/localStorageHandler';
import { useEffect, useState } from 'react';
import { toastError } from '../../lib/toastHelper';
import LocationDropdown from '../LocationDropdown';

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

  const {
    storedUser: userStr,
    storedLocationName: locationName,
    storedHubs: allHubsStr,
    storedLocation,
  } = getLocalStorage();

  useEffect(() => {
    try {
      //eslint-disable-next-line
      if (locationName) setCurrentLocationName(locationName);

      if (userStr) {
        const user = JSON.parse(userStr);
        setCurrentUser(user);

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
            toastError('allHubsList parse error', e);
            setAllowedHubs([]);
          }
        }
      }
    } catch (e) {
      toastError('Gagal memuat data user/lokasi: ' + e.message);
    }
  }, [userStr, locationName, allHubsStr]);

  const handleLocationChange = (id, name) => {
    try {
      triggerCheck(id, () => {
        setLocalStorage('userLocation', id);
        setLocalStorage('userLocationName', name);
        removeLocalStorage('driverData');
        window.location.reload();
      });
    } catch (err) {
      toastError('triggerCheck error:', err);
      setLocalStorage('userLocation', id);
      setLocalStorage('userLocationName', name);
      removeLocalStorage('driverData');
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
        className="text-sm border border-gray-300 rounded-md bg-white"
        compact={true}
        hubsToShow={allowedHubs} // hanya { _id, name }
        onChange={handleLocationChange}
        showPlaceholder={false}
        value={storedLocation || ''}
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
              toastError('handleMappingCompleted error:', err);
            }
          }}
        />
      )}
    </>
  );
}
