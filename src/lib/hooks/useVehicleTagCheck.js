'use client';

import { useLanguage } from '@/context/LanguageContext';
import { useCallback, useState } from 'react';
import { getDrivers, getVehicleTypes } from '../api/mileapp';
import { toastError } from '../toast';
import { isEmpty } from '../utils';

async function checkUnmappedVehicles() {
  let vehicleTypesPromise = null;
  try {
    if (!vehicleTypesPromise) vehicleTypesPromise = getVehicleTypes();
    const [vehicleTypesObj, drivers] = await Promise.all([vehicleTypesPromise, getDrivers()]);
    const VEHICLE_TYPES = vehicleTypesObj.map((v) => v.name);
    const unmappedList = [];
    const processedPlates = new Set();

    drivers.forEach((v) => {
      const rawTag = v._rawType ? String(v._rawType).toUpperCase() : null;
      if (isEmpty(rawTag)) return;

      const plat = v.plat || '';
      if (isEmpty(plat) || processedPlates.has(plat)) return;

      const parseType = (tag) => {
        if (!tag) return '';
        const clean = String(tag)
          .toUpperCase()
          .replace(/["'\\]/g, '')
          .trim();
        const p = clean.split('-');
        let spec = p.length > 1 ? p[1] : clean;
        if (p.length > 2 && p[2] === 'LONG' && ['CDE', 'CDD', 'FUSO'].includes(spec)) {
          spec = `${spec}-LONG`;
        }
        return spec;
      };

      const specificType = parseType(rawTag);
      const mappedType = parseType(v.type);

      const isStandard = VEHICLE_TYPES.includes(specificType);
      const isMappedInDB = VEHICLE_TYPES.includes(mappedType);

      if (isStandard || isMappedInDB) {
        processedPlates.add(plat);
        return;
      }

      unmappedList.push({ plat, fullTag: rawTag, tag: specificType });
      processedPlates.add(plat);
    });

    return unmappedList;
  } catch (error) {
    toastError(error.message, error);
    return [];
  }
}

export function useVehicleTagCheck() {
  const [showModal, setShowModal] = useState(false);
  const [unmappedData, setUnmappedData] = useState([]);
  const [onSuccessCallback, setOnSuccessCallback] = useState(null);
  const { t } = useLanguage();

  const triggerCheck = useCallback(
    async (onSuccess) => {
      try {
        const issues = await checkUnmappedVehicles();
        if (issues && issues.length > 0) {
          setUnmappedData(issues);
          setOnSuccessCallback(() => onSuccess);
          setShowModal(true);
        } else {
          onSuccess();
        }
      } catch (e) {
        toastError(t('common.toast.error', { err: e.message }), e);
        onSuccess();
      }
    },
    [t]
  );

  const handleMappingCompleted = useCallback(() => {
    setShowModal(false);
    setUnmappedData([]);
    if (onSuccessCallback) {
      onSuccessCallback();
      setOnSuccessCallback(null);
    }
  }, [onSuccessCallback]);

  return {
    showModal,
    unmappedData,
    triggerCheck,
    handleMappingCompleted,
  };
}
