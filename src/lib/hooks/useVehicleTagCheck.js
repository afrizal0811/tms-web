// File: lib/hooks/useVehicleTagCheck.js
'use client';

import { useLanguage } from '@/context/LanguageContext';
import { checkUnmappedVehicles } from '@/lib/driverData';
import { useCallback, useState } from 'react';
import { toastError } from '../toast';

export function useVehicleTagCheck() {
  const [showModal, setShowModal] = useState(false);
  const [unmappedData, setUnmappedData] = useState([]);
  const [onSuccessCallback, setOnSuccessCallback] = useState(null);
  const { t } = useLanguage();

  const triggerCheck = useCallback(
    async (hubId, onSuccess) => {
      if (!hubId) return;

      try {
        const issues = await checkUnmappedVehicles(hubId);
        if (issues && issues.length > 0) {
          setUnmappedData(issues);
          setOnSuccessCallback(() => onSuccess);
          setShowModal(true);
        } else {
          onSuccess();
        }
      } catch (error) {
        toastError(t('common.toast.error', { err: error.message }));
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
