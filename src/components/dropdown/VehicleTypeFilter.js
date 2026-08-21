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
    const opts = [{ label: 'Semua Tipe', value: 'all' }];
    uniqueTypes.forEach((type) => {
      opts.push({ label: type, value: type });
    });
    return opts;
  }, [uniqueTypes]);

  const getLabel = (val) => {
    return val === 'all' || !val ? 'Semua Tipe' : val;
  };

  const isDisabled = disabled || masterTypes.length === 0;

  return (
    <Dropdown
      options={options}
      value={selectedType || 'all'}
      onChange={onApply}
      getLabel={getLabel}
      disabled={isDisabled}
      className="w-full xl:w-40"
    />
  );
}
