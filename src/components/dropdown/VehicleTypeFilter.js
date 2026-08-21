'use client';

import Dropdown from '@/components/Dropdown';
import { getVehicleTypes } from '@/lib/api';
import { getBaseVehicleType } from '@/lib/utils';
import { useEffect, useMemo, useState } from 'react';

export default function VehicleTypeFilter({
  data = [],
  typeKey = 'type',
  selectedType,
  onApply,
  onMasterTypesLoad,
  disabled = false,
  className = 'w-full',
  t,
}) {
  const [masterTypes, setMasterTypes] = useState([]);

  useEffect(() => {
    getVehicleTypes()
      .then((res) => {
        const types = res.map((v) => v.name);
        setMasterTypes(types);
        if (onMasterTypesLoad) onMasterTypesLoad(types);
      })
      .catch(() => {});
  }, [onMasterTypesLoad]);

  const uniqueTypes = useMemo(() => {
    const typesSet = new Set();
    data.forEach((item) => {
      if (item[typeKey]) typesSet.add(getBaseVehicleType(item[typeKey], masterTypes));
    });
    return Array.from(typesSet).sort();
  }, [data, typeKey, masterTypes]);

  const options = useMemo(() => {
    const opts = [{ label: t('common.all'), value: 'all' }];
    uniqueTypes.forEach((type) => {
      opts.push({ label: type, value: type });
    });
    return opts;
  }, [uniqueTypes, t]);

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
