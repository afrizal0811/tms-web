'use client';

import LocationDropdown from '@/components/LocationDropdown';
import VehicleTagMappingModal from '@/components/modal/VehicleTagMappingModal';
import { useLanguage } from '@/context/LanguageContext';
import { getHubs } from '@/lib/api';
import { useVehicleTagCheck } from '@/lib/hooks/useVehicleTagCheck';
import { getLocalStorage, setLocalStorage } from '@/lib/localStorageHandler';
import { toastError } from '@/lib/toastHelper';
import { isEmpty } from '@/lib/utils';
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
        const hubsSimple = await getHubs();
        if (isEmpty(hubsSimple)) {
          throw new Error(t('common.no_data'));
        }
        const user = JSON.parse(userStr);
        setCurrentUser(user);

        const userHubIds = Array.isArray(user.hubId) ? user.hubId : [];
        const allowed =
          userHubIds.length > 0 ? hubsSimple.filter((h) => userHubIds.includes(h._id)) : hubsSimple;

        setAllowedHubs(allowed);
      } catch (e) {
        setAllowedHubs([]);
        toastError(t('common.toast.error', { err: e.message }));
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

      setLocalStorage('data', JSON.stringify(newSession));
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
        className="w-full sm:w-auto text-xs sm:text-sm font-semibold text-slate-700 bg-white! border-0! rounded-lg! focus:ring-2! focus:ring-white/50! py-2! px-3! cursor-pointer transition-all"
        compact={true}
        hubsToShow={allowedHubs}
        onChange={handleLocationChange}
        showPlaceholder={false}
        value={currentLocationId || ''}
        translate={t}
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
