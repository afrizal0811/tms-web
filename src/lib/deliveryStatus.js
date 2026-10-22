// File: src/lib/deliveryStatus.js
import { formatDateUniversal } from './utils';

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

/**
 * Applies overridden delivery status from db pendingDetails to tasks.
 */
export function applyPendingDetailsToTasks(tasks, pendingDetails) {
  if (!tasks || !Array.isArray(tasks) || !pendingDetails || !Array.isArray(pendingDetails)) {
    return tasks || [];
  }
  const pdMap = new Map();
  pendingDetails.forEach((pd) => {
    if (pd.taskId) pdMap.set(String(pd.taskId), pd);
  });

  return tasks.map((task) => {
    const taskId = String(task._id || task.id || task.taskId);
    const pd = pdMap.get(taskId);
    if (pd && pd.new_status) {
      const rawOrig = task.originalStatus || task.statusDelivery || task.status;
      const orig = Array.isArray(rawOrig) ? rawOrig[0] : rawOrig;
      const isModified = Boolean(
        pd.new_status && normalizeDeliveryStatus(pd.new_status) !== normalizeDeliveryStatus(orig)
      );
      const executionStatus =
        task.status === 'DONE' || task.status === 'ONGOING' || task.status === 'UNASSIGNED'
          ? task.status
          : 'DONE';
      return {
        ...task,
        status: executionStatus,
        statusDelivery: pd.new_status,
        originalStatus: orig,
        pendingDetail: pd,
        isModified,
      };
    }
    if (pd) {
      return {
        ...task,
        pendingDetail: pd,
      };
    }
    return task;
  });
}

/**
 * Formats the tooltip text for a modified delivery status,
 * including previous status and audit trail:
 * - created time
 * - created by
 * - updated time
 * - updated by
 */
export function deliveryTooltip({ originalStatus, pendingDetail, formatStatus, t }) {
  const origLabel = originalStatus
    ? typeof formatStatus === 'function'
      ? formatStatus(originalStatus)
      : originalStatus
    : '-';

  const statusLine =
    typeof t === 'function'
      ? t('summary.tabs.pending_reasons.status_modified', { from: origLabel })
      : `Status diubah dari ${origLabel}`;

  const createdTimeRaw =
    pendingDetail?.createdAt || pendingDetail?.created_time || pendingDetail?.createdTime;
  const createdTimeStr = createdTimeRaw
    ? formatDateUniversal(createdTimeRaw, 'DD/MM/YY HH:mm')
    : '-';

  const createdByStr = pendingDetail?.created_by || pendingDetail?.createdBy || '-';

  const updatedTimeRaw =
    pendingDetail?.updatedAt ||
    pendingDetail?.updated_time ||
    pendingDetail?.updatedTime ||
    pendingDetail?.updated_at;
  const updatedTimeStr = updatedTimeRaw
    ? formatDateUniversal(updatedTimeRaw, 'DD/MM/YY HH:mm')
    : '-';

  const updatedByStr = pendingDetail?.updated_by || pendingDetail?.updatedBy || '-';
  const created = `${createdByStr} (${createdTimeStr})`;
  const updated = `${updatedByStr} (${updatedTimeStr})`;

  return (
    <div className="flex flex-col gap-1 text-left min-w-[190px]">
      <div className="font-semibold text-white border-b border-slate-600/60 pb-1 mb-0.5">
        {statusLine}
      </div>
      <div>
        <span className="text-slate-400 font-semibold">{t('common.created_by')}: </span>
        <span className="font-medium text-white">{created}</span>
      </div>
      <div>
        <span className="text-slate-400 font-semibold">{t('common.updated_by')}: </span>
        <span className="font-medium text-white">{updated}</span>
      </div>
    </div>
  );
}

/**
 * Applies pending details to task summary metrics, updating RT, CO, PR counts and task lists in real time.
 */
export function applyPendingDetailsToTaskSummaryMetrics(
  metrics,
  tasks,
  pendingDetails,
  hasPendingGR = false,
  driverData = []
) {
  if (!metrics || Object.keys(metrics).length === 0) return metrics || {};
  if (!tasks || !Array.isArray(tasks) || tasks.length === 0) return metrics;

  const driverMapStorage = {};
  if (Array.isArray(driverData)) {
    driverData.forEach((d) => {
      if (d.email) driverMapStorage[d.email.toLowerCase().trim()] = (d.storage || '').toUpperCase();
    });
  }

  const updated = {};
  Object.keys(metrics).forEach((dateKey) => {
    const orig = metrics[dateKey];
    updated[dateKey] = {
      ...orig,
      dry: {
        ...orig?.dry,
        rt: 0,
        co: 0,
        pr: 0,
        rt_tasks: [],
        co_tasks: [],
        pr_tasks: [],
      },
      frozen: {
        ...orig?.frozen,
        rt: 0,
        co: 0,
        pr: 0,
        rt_tasks: [],
        co_tasks: [],
        pr_tasks: [],
      },
      unknown: {
        ...orig?.unknown,
        rt: 0,
        co: 0,
        pr: 0,
        rt_tasks: [],
        co_tasks: [],
        pr_tasks: [],
      },
    };
  });

  const effectiveTasks = applyPendingDetailsToTasks(tasks, pendingDetails);

  effectiveTasks.forEach((task) => {
    const dateKey =
      formatDateUniversal(task.startTime, 'YYYY-MM-DD') ||
      formatDateUniversal(task.doneTime, 'YYYY-MM-DD') ||
      formatDateUniversal(task.createdTime, 'YYYY-MM-DD');
    if (!dateKey || !updated[dateKey]) return;

    const rawEmail = (Array.isArray(task.assignee) ? task.assignee[0] : task.assignee || '')
      .toLowerCase()
      .trim();
    const storageFromDriver = driverMapStorage[rawEmail] || '';
    const typeRaw = (task.typeStorage || storageFromDriver || '').toUpperCase();
    const type = typeRaw.includes('FROZEN') ? 'frozen' : 'dry';

    const sDeliv = task.statusDelivery;
    const statusArr = Array.isArray(sDeliv) ? sDeliv : [sDeliv];
    const normStatuses = statusArr.map((s) => normalizeDeliveryStatus(s));

    if (normStatuses.includes(DELIVERY_STATUS_KEYS.PENDING)) {
      updated[dateKey][type].rt += 1;
      updated[dateKey][type].rt_tasks.push(task);
    } else if (!hasPendingGR && normStatuses.includes(DELIVERY_STATUS_KEYS.PENDING_GR)) {
      updated[dateKey][type].rt += 1;
      updated[dateKey][type].rt_tasks.push({ ...task, isWrongGR: true });
    }

    if (normStatuses.includes(DELIVERY_STATUS_KEYS.CANCEL)) {
      updated[dateKey][type].co += 1;
      updated[dateKey][type].co_tasks.push(task);
    }
    if (normStatuses.includes(DELIVERY_STATUS_KEYS.PARTIAL)) {
      updated[dateKey][type].pr += 1;
      updated[dateKey][type].pr_tasks.push(task);
    }
  });

  return updated;
}
