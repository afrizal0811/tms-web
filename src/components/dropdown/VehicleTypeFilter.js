'use client';

import Dropdown from '@/components/dropdown/Dropdown';
import { useLanguage } from '@/context/LanguageContext';
import { getVehicleTypes } from '@/lib/api/mileapp';
import { useEffect, useMemo, useState } from 'react';

export default function VehicleTypeFilter({
  selectedType,
  onApply,
  onMasterTypesLoad,
  disabled = false,
  className = 'w-full',
}) {
  const { t } = useLanguage();
  const [masterTypes, setMasterTypes] = useState([]);
  useEffect(() => {
    getVehicleTypes()
      .then((res) => {
        setMasterTypes(res.activeTypes);
        if (onMasterTypesLoad) onMasterTypesLoad(types);
      })
      .catch(() => {});
  }, [onMasterTypesLoad]);

  const options = useMemo(() => {
    const opts = [{ label: t('common.all'), value: 'all' }];
    masterTypes.forEach((type) => {
      opts.push({ label: type, value: type });
    });
    return opts;
  }, [masterTypes, t]);

  const getLabel = (val) => {
    return val === 'all' || !val ? t('common.all') : val;
  };

  const isDisabled = disabled || masterTypes.length === 0;

  return (
    <Dropdown
      options={options}
      value={selectedType || 'all'}
      onChange={onApply}
      getLabel={getLabel}
      disabled={isDisabled}
      className={className}
    />
  );
}
