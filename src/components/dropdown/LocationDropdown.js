'use client';

import Dropdown from '@/components/dropdown/Dropdown';
import { useLanguage } from '@/context/LanguageContext';
import { getLocalStorage, getSyncHubs, updateActiveHub } from '@/lib/localStorageHandler';
import { toastError } from '@/lib/toast';
import { isEmpty } from '@/lib/utils';
import { useEffect, useState } from 'react';

export default function LocationSelector({
  className = '',
  disabled = false,
  hubsToShow = [],
  onChange,
  value,
}) {
  const { t } = useLanguage();
  const rawData = Array.isArray(hubsToShow) ? hubsToShow : [];
  const data = rawData.filter((hub) => hub.isActive !== false);
  const placeholder = `-- ${t('common.select')} ${t('common.branch')}--`;
  const handleChange = (id) => {
    const option = data.find((d) => String(d._id) === String(id));
    const label = option ? (option.name ?? '') : '';
    onChange?.(id, label);
  };

  const getOptions = () => {
    let opts = [];
    if (placeholder) opts.push({ label: placeholder, value: '' });
    if (isEmpty(data)) opts.push({ label: t('common.no_data'), value: '' });

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

  useEffect(() => {
    async function fetchHubsFromDatabase(userStr) {
      try {
        const user = JSON.parse(userStr);
        setCurrentUser(user);

        const cached = (await getSyncHubs()) || [];

        const userHubIds = Array.isArray(user.hubId) ? user.hubId : [];
        const allowed =
          userHubIds.length > 0
            ? (cached || []).filter((h) => userHubIds.includes(h._id) && h.isActive !== false)
            : (cached || []).filter((h) => h.isActive !== false);

        setAllowedHubs(allowed);
      } catch (e) {
        setAllowedHubs([]);
        toastError(t('common.toast.error', { err: e.message }), e);
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

  const handleLocationChange = async (id) => {
    const selectedHub = allowedHubs.find((h) => h._id === id);
    if (!selectedHub) return;

    const name = selectedHub.name;
    const acronym = selectedHub.acronym || '';

    updateActiveHub(id, name, acronym);
    window.location.reload();
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
    <Dropdown
      options={options}
      value={currentLocationId || ''}
      onChange={handleLocationChange}
      getLabel={getLabel}
      className="w-30"
    />
  );
}
