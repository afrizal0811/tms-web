// File: src/lib/hooks/useDeliveryStatus.js
'use client';

import { useLanguage } from '@/context/LanguageContext';
import { useCallback, useMemo } from 'react';
import {
  DELIVERY_STATUS_COLORS,
  DELIVERY_STATUS_KEYS,
  formatDeliveryStatus,
  getDeliveryStatusClass,
  getDeliveryStatusOptions,
  isCancelStatus,
  isDeliveryStatus,
  isFailedDeliveryStatus,
  isPartialStatus,
  isPendingGrStatus,
  isPendingSheetDeliveryStatus,
  isPendingStatus,
  isSuccessStatus,
  normalizeDeliveryStatus,
} from '../deliveryStatus';

export function useDeliveryStatus() {
  const { t, lang, isIndonesian, localeCode } = useLanguage();

  const formatStatus = useCallback((status) => formatDeliveryStatus(status, t), [t]);

  const normalizeStatus = useCallback((status) => normalizeDeliveryStatus(status), []);

  const isStatus = useCallback((status, targetKey) => isDeliveryStatus(status, targetKey), []);

  const getStatusClass = useCallback((status) => getDeliveryStatusClass(status), []);

  const statusOptions = useMemo(() => getDeliveryStatusOptions(t), [t]);

  const statusMap = useMemo(
    () => ({
      [DELIVERY_STATUS_KEYS.SUCCESS]: t('common.status.success'),
      SUKSES: t('common.status.success'),
      SUCCESS: t('common.status.success'),
      [DELIVERY_STATUS_KEYS.PARTIAL]: t('common.status.partial'),
      'TERIMA SEBAGIAN': t('common.status.partial'),
      PARTIAL: t('common.status.partial'),
      [DELIVERY_STATUS_KEYS.PENDING]: t('common.status.pending'),
      PENDING: t('common.status.pending'),
      [DELIVERY_STATUS_KEYS.CANCEL]: t('common.status.cancel'),
      BATAL: t('common.status.cancel'),
      CANCEL: t('common.status.cancel'),
      [DELIVERY_STATUS_KEYS.PENDING_GR]: t('common.status.pending_gr'),
      'PENDING GR': t('common.status.pending_gr'),
      PENDING_GR: t('common.status.pending_gr'),
      [DELIVERY_STATUS_KEYS.DONE]: t('common.status.done'),
      DONE: t('common.status.done'),
      [DELIVERY_STATUS_KEYS.ONGOING]: t('common.status.ongoing'),
      ONGOING: t('common.status.ongoing'),
      [DELIVERY_STATUS_KEYS.UNASSIGNED]: t('common.status.unassigned'),
      UNASSIGNED: t('common.status.unassigned'),
    }),
    [t]
  );

  const getStatusLabel = useCallback(
    (value) => {
      const match = statusOptions.find((opt) => opt.value === value);
      if (match) return match.label;
      return formatStatus(value);
    },
    [statusOptions, formatStatus]
  );

  return {
    t,
    lang,
    isIndonesian,
    localeCode,
    formatStatus,
    normalizeStatus,
    isStatus,
    getStatusClass,
    statusOptions,
    statusMap,
    getStatusLabel,
    isSuccess: isSuccessStatus,
    isPartial: isPartialStatus,
    isPending: isPendingStatus,
    isCancel: isCancelStatus,
    isPendingGr: isPendingGrStatus,
    isFailed: isFailedDeliveryStatus,
    isPendingSheet: isPendingSheetDeliveryStatus,
    DELIVERY_STATUS_KEYS,
    DELIVERY_STATUS_COLORS,
  };
}
