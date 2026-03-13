'use client';

import LocationDropdown from '@/components/LocationDropdown';
import VehicleTagMappingModal from '@/components/modal/VehicleTagMappingModal';
import { useLanguage } from '@/context/LanguageContext';
import { useVehicleTagCheck } from '@/lib/hooks/useVehicleTagCheck';
import { getLocalStorage, setLocalStorage } from '@/lib/localStorageHandler';
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
        toastError(t('common.toast.error', { err: 'Gagal memuat cabang dari database' }));
        setAllowedHubs([]);
      }
    }

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
    const updateLocationAndReload = () => {
      const { storedUser } = getLocalStorage();
      let newSession = { activeHubId: id, activeHubName: name };

      // Pertahankan data user lama, hanya timpa lokasinya
      if (storedUser) {
        const userObj = JSON.parse(storedUser);
        newSession = { ...userObj, activeHubId: id, activeHubName: name };
      }

      setLocalStorage('tms_user_session', JSON.stringify(newSession));
      window.location.reload();
    };

    try {
      triggerCheck(id, updateLocationAndReload);
    } catch (err) {
      updateLocationAndReload();
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
