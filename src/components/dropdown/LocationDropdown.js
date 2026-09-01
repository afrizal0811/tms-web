'use client';

import Dropdown from '@/components/dropdown/Dropdown';
import VehicleTagMappingModal from '@/components/modal/VehicleTagMappingModal';
import { useLanguage } from '@/context/LanguageContext';
import { getHubs } from '@/lib/api';
import { useVehicleTagCheck } from '@/lib/hooks/useVehicleTagCheck';
import {
  getCachedHubs,
  getLocalStorage,
  setCachedHubs,
  updateActiveHub,
} from '@/lib/localStorageHandler';
import { toastError } from '@/lib/toast';
import { isEmpty } from '@/lib/utils';
import { useEffect, useState } from 'react';

export default function LocationSelector({
  className = '',
  disabled = false,
  hubsToShow = [],
  onChange,
  placeholder = '-- Pilih Lokasi --',
  value,
}) {
  const data = Array.isArray(hubsToShow) ? hubsToShow : [];

  const handleChange = (id) => {
    const option = data.find((d) => String(d._id) === String(id));
    const label = option ? (option.name ?? '') : '';
    onChange?.(id, label);
  };

  const getOptions = () => {
    let opts = [];
    if (placeholder) opts.push({ label: placeholder, value: '' });
    if (isEmpty(data)) opts.push({ label: '-- Tidak ada lokasi --', value: '' });

    const dataOpts = data.map((hub) => {
      const val = String(hub._id ?? hub.id ?? '');
      const label = hub.name ?? String(val);
      return { label, value: val };
    });

    return [...opts, ...dataOpts];
  };

  const options = getOptions();

  const getLabel = (val) => {
    const opt = options.find((o) => String(o.value) === String(val));
    return opt ? opt.label : placeholder || '';
  };

  return (
    <Dropdown
      options={options}
      value={value ?? ''}
      onChange={handleChange}
      getLabel={getLabel}
      disabled={disabled}
      className={className}
    />
  );
}

export function LocationSwitcher() {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentLocationName, setCurrentLocationName] = useState('');
  const [currentLocationId, setCurrentLocationId] = useState('');
  const [allowedHubs, setAllowedHubs] = useState([]);
  const { t } = useLanguage();

  const { showModal, unmappedData, triggerCheck, handleMappingCompleted } = useVehicleTagCheck();

  useEffect(() => {
    async function fetchHubsFromDatabase(userStr) {
      try {
        const user = JSON.parse(userStr);
        setCurrentUser(user);

        let cached = getCachedHubs();

        if (!cached || isEmpty(cached)) {
          cached = await getHubs();
          if (!isEmpty(cached)) setCachedHubs(cached);
        }

        const userHubIds = Array.isArray(user.hubId) ? user.hubId : [];
        const allowed =
          userHubIds.length > 0
            ? (cached || []).filter((h) => userHubIds.includes(h._id))
            : cached || [];

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

  const handleLocationChange = (id) => {
    const selectedHub = allowedHubs.find((h) => h._id === id);
    if (!selectedHub) return;

    const name = selectedHub.name;
    const acronym = selectedHub.acronym || '';

    const updateLocationAndReload = () => {
      updateActiveHub(id, name, acronym);
      window.location.reload();
    };

    try {
      triggerCheck(id, updateLocationAndReload);
    } catch (err) {
      updateLocationAndReload();
    }
  };

  const options = allowedHubs.map((h) => ({ label: h.name, value: h._id }));

  const getLabel = (val) => {
    const hub = allowedHubs.find((h) => h._id === val);
    return hub ? hub.name : currentLocationName;
  };

  if (!currentUser) return null;

  if (allowedHubs.length <= 1) {
    return (
      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
        {currentLocationName}
      </span>
    );
  }

  return (
    <>
      <Dropdown
        options={options}
        value={currentLocationId || ''}
        onChange={handleLocationChange}
        getLabel={getLabel}
        className="w-30"
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
