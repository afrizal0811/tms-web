'use client';

import InformationButton from '@/components/button/InformationButton';
import Button from '@/components/button/Button';
import Dropdown from '@/components/dropdown/Dropdown';
import ConfirmModal from '@/components/modal/ConfirmModal';
import Modal from '@/components/modal/Modal';
import { deletePendingDetail, postPendingDetail } from '@/lib/api/mileapp';
import { DELIVERY_STATUS_KEYS } from '@/lib/deliveryStatus';
import { useDeliveryStatus } from '@/lib/hooks/useDeliveryStatus';
import { useSuperadmin } from '@/lib/hooks/useSuperadmin';
import { getLocalStorage } from '@/lib/localStorageHandler';
import { toastError, toastSuccess } from '@/lib/toast';
import { capitalizeText, formatDateUniversal } from '@/lib/utils';
import { useEffect, useMemo, useState } from 'react';

function getReasonValue(r) {
  return `${r.reasons || ''}|${r.pic || ''}|${r.category || r.internalExternal || ''}`;
}

function emitPendingUpdate(detail) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('tms-pending-details-updated', { detail }));
  try {
    localStorage.setItem('tms_pending_details_last_update', Date.now().toString());
  } catch {}
}

function getUserName() {
  const { storedUser } = getLocalStorage();
  return storedUser?.name || 'User';
}

function isConversionItem(item, normalizeStatus) {
  return Boolean(
    item?.isSuccessConversion ||
      normalizeStatus(item?.originalStatus || item?.status) === DELIVERY_STATUS_KEYS.SUCCESS
  );
}

export default function PendingReasonModal({
  isOpen,
  onClose,
  data,
  reasons,
  onSuccess,
  translate,
  hasPendingGR = false,
  onBack,
}) {
  const { formatStatus, isPendingGr, normalizeStatus } = useDeliveryStatus();
  const { isSuperadmin } = useSuperadmin();

  const items = useMemo(() => {
    if (!data) return [];
    return Array.isArray(data) ? data : [data];
  }, [data]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [forms, setForms] = useState({});
  const [isLoading, setIsLoading] = useState({
    save: false,
    delete: false,
  });
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  useEffect(() => {
    if (!items.length) {
      setForms({});
      setCurrentIndex(0);
      return;
    }
    setCurrentIndex(0);
    const initialForms = {};
    for (const item of items) {
      const isConversion = isConversionItem(item, normalizeStatus);
      const pd = item.pendingDetail || {};
      initialForms[item._id] = {
        statusDelivery: pd.new_status || (isConversion ? '' : item.status || ''),
        intExt: pd.internalExternal || '',
        detail: pd.detailReason || '',
        groupReason: pd.groupReason || '',
        pic: pd.pic || '',
        initialIntExt: pd.internalExternal || '',
        initialDetail: pd.detailReason || '',
        initialGroupReason: pd.groupReason || '',
        initialPic: pd.pic || '',
        initialStatusDelivery: pd.new_status || '',
      };
    }
    setForms(initialForms);
  }, [items, normalizeStatus]);

  const currentItem = items[currentIndex] || items[0] || null;
  const currentForm = (currentItem && forms[currentItem._id]) || {};

  const isSuccessConversion = isConversionItem(currentItem, normalizeStatus);

  const updateCurrentForm = (fieldObj) => {
    if (!currentItem) return;
    setForms((prev) => ({
      ...prev,
      [currentItem._id]: {
        ...prev[currentItem._id],
        ...fieldObj,
      },
    }));
  };

  const { sortedReasons, reasonCounts, reasonOptions } = useMemo(() => {
    if (!reasons || reasons.length === 0) {
      return { sortedReasons: [], reasonCounts: {}, reasonOptions: [] };
    }

    const counts = {};
    for (const curr of reasons) {
      if (curr.reasons) {
        counts[curr.reasons] = (counts[curr.reasons] || 0) + 1;
      }
    }

    const sorted = [...reasons].sort((a, b) => (a.reasons || '').localeCompare(b.reasons || ''));

    const options = sorted.map((r) => {
      const isDuplicate = (counts[r.reasons] || 0) > 1;
      return {
        label: isDuplicate ? `${r.reasons} (${r.pic})` : r.reasons,
        value: getReasonValue(r),
      };
    });

    return { sortedReasons: sorted, reasonCounts: counts, reasonOptions: options };
  }, [reasons]);

  const currentDropdownValue = useMemo(() => {
    if (!currentForm.groupReason) return '';
    const match = sortedReasons.find(
      (r) =>
        r.reasons === currentForm.groupReason &&
        (!currentForm.pic || r.pic === currentForm.pic) &&
        (!currentForm.intExt || (r.category || r.internalExternal) === currentForm.intExt)
    );
    if (match) {
      return getReasonValue(match);
    }
    return `${currentForm.groupReason}|${currentForm.pic || ''}|${currentForm.intExt || ''}`;
  }, [currentForm.groupReason, currentForm.pic, currentForm.intExt, sortedReasons]);

  const statusDeliveryOptions = useMemo(() => {
    const list = [
      {
        value: DELIVERY_STATUS_KEYS.PARTIAL,
        label: formatStatus(DELIVERY_STATUS_KEYS.PARTIAL),
      },
      {
        value: DELIVERY_STATUS_KEYS.PENDING,
        label: formatStatus(DELIVERY_STATUS_KEYS.PENDING),
      },
      {
        value: DELIVERY_STATUS_KEYS.CANCEL,
        label: formatStatus(DELIVERY_STATUS_KEYS.CANCEL),
      },
    ];

    if (
      hasPendingGR ||
      isPendingGr(currentItem?.status) ||
      isPendingGr(currentItem?.originalStatus)
    ) {
      list.push({
        value: DELIVERY_STATUS_KEYS.PENDING_GR,
        label: formatStatus(DELIVERY_STATUS_KEYS.PENDING_GR),
      });
    }

    return list;
  }, [formatStatus, hasPendingGR, isPendingGr, currentItem?.status, currentItem?.originalStatus]);

  const handleGroupReasonChange = (val) => {
    if (!val) {
      updateCurrentForm({
        groupReason: '',
        pic: '',
        intExt: '',
      });
      return;
    }

    const match = sortedReasons.find((r) => getReasonValue(r) === val);
    if (match) {
      updateCurrentForm({
        groupReason: match.reasons,
        pic: match.pic || '',
        intExt: match.category || match.internalExternal || '',
      });
      return;
    }

    const [gReason = '', gPic = '', gCat = ''] = val.split('|');
    updateCurrentForm({
      groupReason: gReason,
      pic: gPic,
      intExt: gCat,
    });
  };

  const getDropdownLabel = (val) => {
    if (!val) {
      return `${translate('common.select')} ${translate('summary.tabs.pending_reasons.group_reason')}`;
    }
    const match = sortedReasons.find((r) => getReasonValue(r) === val);
    if (match) {
      const isDuplicate = (reasonCounts[match.reasons] || 0) > 1;
      return isDuplicate ? `${match.reasons} (${match.pic})` : match.reasons;
    }
    return currentForm.groupReason || val;
  };

  const isSaveDisabled = useMemo(() => {
    if (isLoading.save || items.length === 0) return true;

    const allFilled = items.every((item) => {
      const f = forms[item._id];
      if (!f) return false;
      if (isConversionItem(item, normalizeStatus) && !f.statusDelivery) return false;
      return Boolean(f.groupReason && f.pic && f.detail?.trim());
    });

    if (!allFilled) return true;

    if (items.length === 1 && !currentItem?.isSuccessConversion) {
      const f = forms[currentItem?._id];
      if (!f) return true;
      const isUnchanged =
        f.intExt === f.initialIntExt &&
        f.detail === f.initialDetail &&
        f.groupReason === f.initialGroupReason &&
        f.pic === f.initialPic &&
        f.statusDelivery === f.initialStatusDelivery;
      return isUnchanged;
    }

    return false;
  }, [isLoading.save, items, forms, currentItem, normalizeStatus]);

  const handleSave = async () => {
    if (isSaveDisabled) return;
    setIsLoading((prev) => ({ ...prev, save: true }));
    try {
      const userName = getUserName();

      for (const item of items) {
        const f = forms[item._id];
        const isConversion = isConversionItem(item, normalizeStatus);
        const newStatusVal = isConversion
          ? f.statusDelivery
          : (item?.pendingDetail?.new_status ?? null);

        const payload = {
          taskId: item._id || item.id || item.taskId,
          date: formatDateUniversal(item.dateStr),
          new_status: newStatusVal,
          internalExternal: f.intExt,
          detailReason: f.detail.trim(),
          groupReason: f.groupReason,
          pic: f.pic,
          userName,
          created_by: item?.pendingDetail?.created_by || userName,
          updated_by: userName,
        };

        const res = await postPendingDetail(payload);
        const savedData = res.data || res;
        onSuccess(savedData);
        emitPendingUpdate(savedData);
      }

      toastSuccess(translate('common.toast.success'));
      onClose();
    } catch (e) {
      toastError(translate('common.toast.error', { err: e.message }), e);
    } finally {
      setIsLoading((prev) => ({ ...prev, save: false }));
    }
  };

  const handleDelete = async () => {
    setIsConfirmOpen(false);
    setIsLoading((prev) => ({ ...prev, delete: true }));
    try {
      const targetTaskId = currentItem._id || currentItem.id || currentItem.taskId;
      let resultData;
      if (currentItem?.pendingDetail?.new_status) {
        const userName = getUserName();
        const [d, m, y] = (currentItem.dateStr || '').split('-');
        const dbDate =
          y && y.length === 4 ? `${y}-${m}-${d}` : formatDateUniversal(currentItem.dateStr);

        const payload = {
          taskId: targetTaskId,
          date: dbDate,
          new_status: currentItem.pendingDetail.new_status,
          internalExternal: null,
          detailReason: null,
          groupReason: null,
          pic: null,
          userName,
          created_by: currentItem?.pendingDetail?.created_by || userName,
          updated_by: userName,
        };

        const res = await postPendingDetail(payload);
        resultData = res.data || res;
      } else {
        await deletePendingDetail(targetTaskId);
        resultData = { taskId: targetTaskId, deleted: true };
      }

      toastSuccess(translate('common.toast.success'));
      onSuccess(resultData);
      emitPendingUpdate(resultData);
      onClose();
    } catch (e) {
      toastError(translate('common.toast.error', { err: e.message }), e);
    } finally {
      setIsLoading((prev) => ({ ...prev, delete: false }));
    }
  };

  if (!data || items.length === 0 || !currentItem) return null;

  const hasExistingData = Boolean(
    currentItem?.pendingDetail &&
      (currentItem.pendingDetail.internalExternal ||
        currentItem.pendingDetail.groupReason ||
        currentItem.pendingDetail.pic ||
        currentItem.pendingDetail.detailReason)
  );

  const statusText =
    currentForm.statusDelivery ||
    currentItem?.pendingDetail?.new_status ||
    currentItem.statusDelivery ||
    currentItem.status;

  const customerText = currentItem.customer || currentItem.customerName || '-';
  const subtitleText = `${capitalizeText(formatStatus(statusText))} | ${customerText}`;

  const msgParts = translate('common.modal.delete_message', { text: '|||' }).split('|||');
  const pd = currentItem?.pendingDetail;
  const hasAuditData = Boolean(
    pd && (pd.created_by || pd.updated_by || pd.createdAt || pd.updatedAt)
  );

  const auditInfoContent = hasAuditData ? (
    <div className="flex flex-col gap-1 text-left min-w-[190px]">
      <div>
        <span className="text-slate-400 font-semibold">{translate('common.created_by')}: </span>
        <span className="font-medium text-white">{`${pd.created_by} (${formatDateUniversal(pd.createdAt, 'DD/MM/YY HH:mm:ss')})`}</span>
      </div>
      <div>
        <span className="text-slate-400 font-semibold">{translate('common.updated_by')}: </span>
        <span className="font-medium text-white">{`${pd.updated_by} (${formatDateUniversal(pd.updatedAt, 'DD/MM/YY HH:mm:ss')})`}</span>
      </div>
    </div>
  ) : null;

  const modalTitle = (
    <div className="flex items-center gap-2">
      <span>{translate('summary.tabs.pending_reasons.modal_title')}</span>
      {hasAuditData && <InformationButton infoText={auditInfoContent} size="4" />}
    </div>
  );

  const footer = (
    <div className="flex items-center justify-between w-full">
      <div className="flex items-center gap-2">
        {onBack && (
          <Button
            onClick={onBack}
            size="md"
            text={translate('common.button.btn_back') || 'Kembali'}
            className="bg-gray-600! hover:bg-gray-700! border-gray-700! text-slate-100"
          />
        )}
        {hasExistingData && isSuperadmin && items.length === 1 && !isSuccessConversion && (
          <Button
            disabled={isLoading.delete}
            isLoading={isLoading.delete}
            onClick={() => setIsConfirmOpen(true)}
            size="md"
            text={translate('common.button.btn_delete')}
            className="bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 rounded-md border border-red-300 dark:border-red-500/30 hover:bg-red-200 dark:hover:bg-red-900/60"
          />
        )}
      </div>

      {items.length > 1 && (
        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={currentIndex === 0}
            onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
            className="p-1 rounded-md border border-gray-300 dark:border-slate-600 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
            aria-label="Previous Task"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 select-none">
            {currentIndex + 1} / {items.length}
          </span>
          <button
            type="button"
            disabled={currentIndex === items.length - 1}
            onClick={() => setCurrentIndex((prev) => Math.min(items.length - 1, prev + 1))}
            className="p-1 rounded-md border border-gray-300 dark:border-slate-600 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
            aria-label="Next Task"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </div>
      )}

      <div className="flex items-center gap-2">
        <Button
          disabled={isLoading.save || isSaveDisabled}
          isLoading={isLoading.save}
          onClick={handleSave}
          size="md"
          text={translate('common.button.btn_save')}
        />
      </div>
    </div>
  );

  return (
    <>
      <ConfirmModal
        isOpen={isConfirmOpen}
        onCancel={() => {
          setIsConfirmOpen(false);
          setIsLoading({ save: false, delete: false });
        }}
        onConfirm={handleDelete}
        title={translate('common.modal.delete_title', {
          text: translate('summary.tabs.pending_reasons.modal_title'),
        })}
        message={
          <span>
            {msgParts[0]}
            <strong>pending data</strong>
            {msgParts[1]}
          </span>
        }
      />
      <Modal
        isOpen={isOpen && !isConfirmOpen}
        onClose={onClose}
        maxWidth="max-w-2xl"
        maxHeight="min-h-[500px] max-h-[100vh]"
        title={modalTitle}
        subtitle={subtitleText}
        footer={footer}
      >
        <div className="flex flex-col gap-4">
          {isSuccessConversion && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                {translate('common.status.delivery_status')}
                <span className="text-red-600 dark:text-red-400">*</span>
              </label>
              <Dropdown
                value={currentForm.statusDelivery || ''}
                onChange={(val) => updateCurrentForm({ statusDelivery: val })}
                options={statusDeliveryOptions}
                getLabel={(val) => {
                  const match = statusDeliveryOptions.find((o) => o.value === val);
                  return (
                    match?.label ||
                    `${translate('common.select')} ${translate('common.status.delivery_status')}`
                  );
                }}
                className="w-full"
              />
            </div>
          )}

          {!isSuccessConversion && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                {translate('summary.tabs.pending_reasons.reason')}
              </label>
              <input
                type="text"
                readOnly
                value={currentItem.alasan || currentItem.reason || ''}
                placeholder={translate('summary.tabs.pending_reasons.reason')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 bg-gray-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 rounded-md outline-none cursor-not-allowed text-sm"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              {translate('summary.tabs.pending_reasons.group_reason')}
              <span className="text-red-600 dark:text-red-400">*</span>
            </label>
            <Dropdown
              value={currentDropdownValue}
              onChange={handleGroupReasonChange}
              options={reasonOptions}
              getLabel={getDropdownLabel}
              isAutocomplete={true}
              className="w-full"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                {translate('summary.tabs.pending_reasons.category')}
              </label>
              <input
                type="text"
                readOnly
                value={currentForm.intExt || ''}
                placeholder={translate('summary.tabs.pending_reasons.category')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 bg-gray-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 rounded-md outline-none cursor-not-allowed text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                PIC
              </label>
              <input
                type="text"
                readOnly
                value={currentForm.pic || ''}
                placeholder="PIC"
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 bg-gray-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 rounded-md outline-none cursor-not-allowed text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              {translate('summary.tabs.pending_reasons.detail')}
              <span className="text-red-600 dark:text-red-400">*</span>
            </label>
            <textarea
              rows="3"
              value={currentForm.detail || ''}
              onChange={(e) => updateCurrentForm({ detail: e.target.value })}
              placeholder={translate('summary.tabs.pending_reasons.detail_placeholder')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-1 focus:ring-sky-500 resize-none bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
            />
          </div>
        </div>
      </Modal>
    </>
  );
}
