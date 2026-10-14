// File: src/lib/deliveryStatus.js

export const DELIVERY_STATUS_KEYS = {
  SUCCESS: 'SUCCESS',
  PARTIAL: 'PARTIAL',
  PENDING: 'PENDING',
  CANCEL: 'CANCEL',
  PENDING_GR: 'PENDING_GR',
  DONE: 'DONE',
  ONGOING: 'ONGOING',
  UNASSIGNED: 'UNASSIGNED',
};

/**
 * Normalizes any raw delivery status string/array into a canonical status key:
 * 'SUCCESS' | 'PARTIAL' | 'PENDING' | 'CANCEL' | 'PENDING_GR' | 'DONE' | 'ONGOING' | 'UNASSIGNED' | null
 */
export function normalizeDeliveryStatus(rawStatus) {
  if (!rawStatus) return null;

  let val = rawStatus;
  if (Array.isArray(val)) {
    val = val[0] || '';
  }
  if (typeof val !== 'string') {
    val = String(val);
  }

  // Handle comma-separated statuses e.g. "TERIMA SEBAGIAN, BARANG KURANG"
  if (val.includes(',')) {
    val = val.split(',')[0].trim();
  }

  const clean = val.replace(/_/g, ' ').trim().toUpperCase();
  if (!clean || clean === '-') return null;

  if (clean === 'SUKSES' || clean === 'SUCCESS') {
    return DELIVERY_STATUS_KEYS.SUCCESS;
  }
  if (clean === 'TERIMA SEBAGIAN' || clean === 'PARTIAL' || clean.startsWith('TERIMA SEBAGIAN')) {
    return DELIVERY_STATUS_KEYS.PARTIAL;
  }
  if (clean === 'BATAL' || clean === 'CANCEL') {
    return DELIVERY_STATUS_KEYS.CANCEL;
  }
  if (clean === 'PENDING GR' || clean.startsWith('PENDING GR')) {
    return DELIVERY_STATUS_KEYS.PENDING_GR;
  }
  if (clean === 'PENDING' || clean.startsWith('PENDING')) {
    return DELIVERY_STATUS_KEYS.PENDING;
  }
  if (clean === 'DONE' || clean === 'SELESAI') {
    return DELIVERY_STATUS_KEYS.DONE;
  }
  if (clean === 'ONGOING' || clean === 'BERJALAN') {
    return DELIVERY_STATUS_KEYS.ONGOING;
  }
  if (clean === 'UNASSIGNED' || clean === 'BELUM DITUGASKAN') {
    return DELIVERY_STATUS_KEYS.UNASSIGNED;
  }

  return clean;
}

/**
 * Checks whether raw status matches a target status key.
 */
export function isDeliveryStatus(rawStatus, targetKey) {
  return normalizeDeliveryStatus(rawStatus) === targetKey;
}

export function isSuccessStatus(rawStatus) {
  return normalizeDeliveryStatus(rawStatus) === DELIVERY_STATUS_KEYS.SUCCESS;
}

export function isPartialStatus(rawStatus) {
  return normalizeDeliveryStatus(rawStatus) === DELIVERY_STATUS_KEYS.PARTIAL;
}

export function isPendingStatus(rawStatus) {
  return normalizeDeliveryStatus(rawStatus) === DELIVERY_STATUS_KEYS.PENDING;
}

export function isCancelStatus(rawStatus) {
  return normalizeDeliveryStatus(rawStatus) === DELIVERY_STATUS_KEYS.CANCEL;
}

export function isPendingGrStatus(rawStatus) {
  return normalizeDeliveryStatus(rawStatus) === DELIVERY_STATUS_KEYS.PENDING_GR;
}

export function isFailedDeliveryStatus(rawStatus) {
  const norm = normalizeDeliveryStatus(rawStatus);
  return (
    norm === DELIVERY_STATUS_KEYS.PENDING ||
    norm === DELIVERY_STATUS_KEYS.CANCEL ||
    norm === DELIVERY_STATUS_KEYS.PARTIAL
  );
}

export function isPendingSheetDeliveryStatus(rawStatus, hasPendingGR = true) {
  const norm = normalizeDeliveryStatus(rawStatus);
  if (
    norm === DELIVERY_STATUS_KEYS.PENDING ||
    norm === DELIVERY_STATUS_KEYS.CANCEL ||
    norm === DELIVERY_STATUS_KEYS.PARTIAL
  ) {
    return true;
  }
  if (hasPendingGR && norm === DELIVERY_STATUS_KEYS.PENDING_GR) {
    return true;
  }
  return false;
}

/**
 * Formats a raw delivery status into the translated language string.
 */
export function formatDeliveryStatus(rawStatus, t) {
  if (!rawStatus || rawStatus === '-') return '-';

  const key = normalizeDeliveryStatus(rawStatus);
  if (!key) return rawStatus;

  const translationKeyMap = {
    [DELIVERY_STATUS_KEYS.SUCCESS]: 'common.status.success',
    [DELIVERY_STATUS_KEYS.PARTIAL]: 'common.status.partial',
    [DELIVERY_STATUS_KEYS.PENDING]: 'common.status.pending',
    [DELIVERY_STATUS_KEYS.CANCEL]: 'common.status.cancel',
    [DELIVERY_STATUS_KEYS.PENDING_GR]: 'common.status.pending_gr',
    [DELIVERY_STATUS_KEYS.DONE]: 'common.status.done',
    [DELIVERY_STATUS_KEYS.ONGOING]: 'common.status.ongoing',
    [DELIVERY_STATUS_KEYS.UNASSIGNED]: 'common.status.unassigned',
  };

  const transKey = translationKeyMap[key];
  if (transKey && typeof t === 'function') {
    const translated = t(transKey);
    if (translated && translated !== transKey) return translated;
  }

  return rawStatus;
}

export const DELIVERY_STATUS_COLORS = {
  [DELIVERY_STATUS_KEYS.SUCCESS]: 'bg-[#16a34a] text-white',
  [DELIVERY_STATUS_KEYS.PARTIAL]: 'bg-[#ea580c] text-white',
  [DELIVERY_STATUS_KEYS.PENDING]: 'bg-[#ca8a04] text-white',
  [DELIVERY_STATUS_KEYS.CANCEL]: 'bg-[#dc2626] text-white',
  [DELIVERY_STATUS_KEYS.PENDING_GR]: 'bg-[#b45309] text-white',
  [DELIVERY_STATUS_KEYS.DONE]: 'bg-[#16a34a] text-white',
  [DELIVERY_STATUS_KEYS.ONGOING]: 'bg-[#7C3AED] text-white',
  DEFAULT: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300',
};

export function getDeliveryStatusClass(rawStatus) {
  const key = normalizeDeliveryStatus(rawStatus);
  return (key && DELIVERY_STATUS_COLORS[key]) || DELIVERY_STATUS_COLORS.DEFAULT;
}

/**
 * Returns options for dropdowns with localized labels and canonical values.
 */
export function getDeliveryStatusOptions(t) {
  return [
    { label: t('common.all'), value: 'ALL' },
    { label: t('common.status.success'), value: DELIVERY_STATUS_KEYS.SUCCESS },
    { label: t('common.status.partial'), value: DELIVERY_STATUS_KEYS.PARTIAL },
    { label: t('common.status.pending'), value: DELIVERY_STATUS_KEYS.PENDING },
    { label: t('common.status.cancel'), value: DELIVERY_STATUS_KEYS.CANCEL },
    { label: t('common.status.pending_gr'), value: DELIVERY_STATUS_KEYS.PENDING_GR },
  ];
}
