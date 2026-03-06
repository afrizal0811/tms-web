// File: src/components/navbar/LocationSwitcher.js
'use client';

import LocationDropdown from '@/components/LocationDropdown';
import VehicleTagMappingModal from '@/components/VehicleTagMappingModal';
import { useLanguage } from '@/context/LanguageContext';
import { useVehicleTagCheck } from '@/lib/hooks/useVehicleTagCheck';
import { getLocalStorage, removeLocalStorage, setLocalStorage } from '@/lib/localStorageHandler';
import { toastError } from '@/lib/toastHelper';
import { useEffect, useState } from 'react';

export default function LocationSwitcher() {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentLocationName, setCurrentLocationName] = useState('');
  const [currentLocationId, setCurrentLocationId] = useState('');
  const [allowedHubs, setAllowedHubs] = useState([]);
  const { t } = useLanguage();

  const { isChecking, showModal, unmappedData, triggerCheck, handleMappingCompleted } =
    useVehicleTagCheck();

  useEffect(() => {
    async function fetchHubsFromDatabase(userStr) {
      try {
        const response = await fetch('/api/get-hubs');
        const hubsSimple = await response.json();

        const user = JSON.parse(userStr);
        setCurrentUser(user);

        const userHubIds = Array.isArray(user.hubId) ? user.hubId : [];
        const allowed =
          userHubIds.length > 0 ? hubsSimple.filter((h) => userHubIds.includes(h._id)) : hubsSimple;

        setAllowedHubs(allowed);
      } catch (e) {
        toastError(t('common.error', { err: 'Gagal memuat cabang dari database' }));
        setAllowedHubs([]);
      }
    }

    // KUNCI PERBAIKAN: Menggunakan setTimeout untuk menghindari "Cascading Renders"
    const timer = setTimeout(() => {
      const {
        storedUser: userStr,
        storedLocationName: locName,
        storedLocation: locId,
      } = getLocalStorage();

      if (locName) setCurrentLocationName(locName);
      if (locId) setCurrentLocationId(locId);
      if (userStr) fetchHubsFromDatabase(userStr);
    }, 0);

    return () => clearTimeout(timer);
  }, [t]);

  const handleLocationChange = (id, name) => {
    try {
      triggerCheck(id, () => {
        setLocalStorage('userLocation', id);
        setLocalStorage('userLocationName', name);
        removeLocalStorage('driverData');
        window.location.reload();
      });
    } catch (err) {
      setLocalStorage('userLocation', id);
      setLocalStorage('userLocationName', name);
      removeLocalStorage('driverData');
      window.location.reload();
    }
  };

  if (!currentUser) return null;

  if (allowedHubs.length <= 1) {
    return <span className="text-sm font-medium text-slate-700">{currentLocationName}</span>;
  }

  return (
    <>
      <LocationDropdown
        className="text-sm border border-gray-300 rounded-md bg-white"
        compact={true}
        hubsToShow={allowedHubs}
        onChange={handleLocationChange}
        showPlaceholder={false}
        value={currentLocationId || ''}
      />
      {showModal && (
        <VehicleTagMappingModal
          t={t}
          unmappedData={unmappedData}
          onCompleted={handleMappingCompleted}
        />
      )}
    </>
  );
}
