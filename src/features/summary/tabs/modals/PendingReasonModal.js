'use client';

import InformationButton from '@/components/button/InformationButton';
import Button from '@/components/button/Button';
import Dropdown from '@/components/dropdown/Dropdown';
import ConfirmModal from '@/components/modal/ConfirmModal';
import Modal from '@/components/modal/Modal';
import { deletePendingDetail, postPendingDetail } from '@/lib/api/mileapp';
import { useDeliveryStatus } from '@/lib/hooks/useDeliveryStatus';
import { useSuperadmin } from '@/lib/hooks/useSuperadmin';
import { getLocalStorage } from '@/lib/localStorageHandler';
import { toastError, toastSuccess } from '@/lib/toast';
import { capitalizeText, formatDateUniversal } from '@/lib/utils';
import { useEffect, useMemo, useState } from 'react';

export default function PendingReasonModal({
  isOpen,
  onClose,
  data,
  reasons,
  onSuccess,
  translate,
}) {
  const { formatStatus } = useDeliveryStatus();
  const { isSuperadmin } = useSuperadmin();
  const [intExt, setIntExt] = useState('');
  const [detail, setDetail] = useState('');
  const [groupReason, setGroupReason] = useState('');
  const [pic, setPic] = useState('');
  const [isLoading, setIsLoading] = useState({
    save: false,
    delete: false,
  });
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  useEffect(() => {
    if (data && data.pendingDetail) {
      setIntExt(data.pendingDetail.internalExternal || '');
      setDetail(data.pendingDetail.detailReason || '');
      setGroupReason(data.pendingDetail.groupReason || '');
      setPic(data.pendingDetail.pic || '');
    } else {
      setIntExt('');
      setDetail('');
      setGroupReason('');
      setPic('');
    }
  }, [data]);

  const { sortedReasons, reasonCounts } = useMemo(() => {
    if (!reasons || reasons.length === 0) return { sortedReasons: [], reasonCounts: {} };

    const counts = reasons.reduce((acc, curr) => {
      if (curr.reasons) {
        acc[curr.reasons] = (acc[curr.reasons] || 0) + 1;
      }
      return acc;
    }, {});

    const sorted = [...reasons].sort((a, b) => (a.reasons || '').localeCompare(b.reasons || ''));

    return { sortedReasons: sorted, reasonCounts: counts };
  }, [reasons]);

  const reasonOptions = useMemo(() => {
    return sortedReasons.map((r) => {
      const isDuplicate = (reasonCounts[r.reasons] || 0) > 1;
      const cat = r.category || r.internalExternal || '';
      const displayLabel = isDuplicate ? `${r.reasons} (${r.pic})` : r.reasons;
      return {
        label: displayLabel,
        value: `${r.reasons}|${r.pic}|${cat}`,
      };
    });
  }, [sortedReasons, reasonCounts]);

  const currentDropdownValue = useMemo(() => {
    if (!groupReason) return '';
    const match = sortedReasons.find(
      (r) =>
        r.reasons === groupReason &&
        (pic ? r.pic === pic : true) &&
        (intExt ? (r.category || r.internalExternal) === intExt : true)
    );
    if (match) {
      return `${match.reasons}|${match.pic}|${match.category || match.internalExternal || ''}`;
    }
    return `${groupReason}|${pic}|${intExt || ''}`;
  }, [groupReason, pic, intExt, sortedReasons]);

  if (!data) return null;

  const handleGroupReasonChange = (val) => {
    if (val) {
      const match = sortedReasons.find(
        (r) => `${r.reasons}|${r.pic}|${r.category || r.internalExternal || ''}` === val
      );
      if (match) {
        setGroupReason(match.reasons);
        setPic(match.pic);
        setIntExt(match.category || match.internalExternal || '');
      } else {
        const [gReason, gPic, gCat] = val.split('|');
        setGroupReason(gReason || '');
        setPic(gPic || '');
        setIntExt(gCat || '');
      }
    } else {
      setGroupReason('');
      setPic('');
      setIntExt('');
    }
  };

  const getDropdownLabel = (val) => {
    if (!val) {
      return `${translate('common.select')} ${translate('summary.tabs.pending_reasons.group_reason')}`;
    }
    const match = sortedReasons.find(
      (r) => `${r.reasons}|${r.pic}|${r.category || r.internalExternal || ''}` === val
    );
    if (match) {
      const isDuplicate = (reasonCounts[match.reasons] || 0) > 1;
      return isDuplicate ? `${match.reasons} (${match.pic})` : match.reasons;
    }
    return groupReason || val;
  };

  const handleSave = async () => {
    if (isEmptyData) return;
    setIsLoading((prev) => ({ ...prev, save: true }));
    try {
      const dateParts = data.dateStr.split('-');
      const dbDate = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;
      const { storedUser } = getLocalStorage();
      const userName = storedUser.name;

      const payload = {
        taskId: data._id,
        date: dbDate,
        new_status: data?.pendingDetail?.new_status ?? null,
        internalExternal: intExt,
        detailReason: detail.trim(),
        groupReason: groupReason,
        pic: pic,
        userName,
        created_by: data?.pendingDetail?.created_by || userName,
        updated_by: userName,
      };

      const res = await postPendingDetail(payload);
      toastSuccess(translate('common.toast.success'));
      const savedData = res.data || res;
      onSuccess(savedData);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('tms-pending-details-updated', { detail: savedData }));
        try {
          localStorage.setItem('tms_pending_details_last_update', Date.now().toString());
        } catch {}
      }
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
      if (data?.pendingDetail?.new_status) {
        const dateParts = data.dateStr.split('-');
        const dbDate = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;
        const { storedUser } = getLocalStorage();
        const userName = storedUser?.name || 'User';

        const payload = {
          taskId: data._id,
          date: dbDate,
          new_status: data.pendingDetail.new_status,
          internalExternal: null,
          detailReason: null,
          groupReason: null,
          pic: null,
          userName,
          created_by: data?.pendingDetail?.created_by || userName,
          updated_by: userName,
        };

        const res = await postPendingDetail(payload);
        toastSuccess(translate('common.toast.success'));
        const savedData = res.data || res;
        onSuccess(savedData);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('tms-pending-details-updated', { detail: savedData })
          );
          try {
            localStorage.setItem('tms_pending_details_last_update', Date.now().toString());
          } catch {}
        }
        onClose();
        return;
      }

      await deletePendingDetail(data._id);
      toastSuccess(translate('common.toast.success'));

      const delData = { taskId: data._id, deleted: true };
      onSuccess(delData);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('tms-pending-details-updated', { detail: delData }));
        try {
          localStorage.setItem('tms_pending_details_last_update', Date.now().toString());
        } catch {}
      }
      onClose();
    } catch (e) {
      toastError(translate('common.toast.error', { err: e.message }), e);
    } finally {
      setIsLoading((prev) => ({ ...prev, delete: false }));
    }
  };

  const initialIntExt = data?.pendingDetail?.internalExternal || '';
  const initialDetail = data?.pendingDetail?.detailReason || '';
  const initialGroupReason = data?.pendingDetail?.groupReason || '';
  const initialPic = data?.pendingDetail?.pic || '';

  const isChanged =
    intExt !== initialIntExt ||
    detail !== initialDetail ||
    groupReason !== initialGroupReason ||
    pic !== initialPic;

  const isEmptyData = !groupReason || !pic || !detail?.trim();
  const isSaveDisabled = isLoading.save || isEmptyData || !isChanged;

  const hasExistingData =
    data?.pendingDetail &&
    (data.pendingDetail.internalExternal ||
      data.pendingDetail.groupReason ||
      data.pendingDetail.pic ||
      data.pendingDetail.detailReason);

  const statusText =
    data?.pendingDetail?.new_status || (data.statusDelivery ? data.statusDelivery : data.status);
  const msgParts = translate('common.modal.delete_message', { text: '|||' }).split('|||');
  const reason = data?.alasan || data?.reason || '';
  const pd = data?.pendingDetail;
  const hasAuditData = Boolean(
    pd && (pd.created_by || pd.updated_by || pd.createdAt || pd.updatedAt)
  );

  const auditInfoContent =
    hasAuditData && pd ? (
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
    ) : (
      ''
    );

  const modalTitle = (
    <div className="flex items-center gap-2">
      <span>{translate('summary.tabs.pending_reasons.modal_title')}</span>
      {hasAuditData && <InformationButton infoText={auditInfoContent} size="4" />}
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
        subtitle={`${capitalizeText(formatStatus(statusText))} | ${data.customer}`}
        footer={
          <div className="flex justify-end w-full">
            <div className="flex items-center gap-2 w-fit">
              {hasExistingData && isSuperadmin && (
                <Button
                  disabled={isLoading.delete}
                  isLoading={isLoading.delete}
                  onClick={() => setIsConfirmOpen(true)}
                  size="md"
                  text={translate('common.button.btn_delete')}
                  className=" bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 rounded-md border border-red-300 dark:border-red-500/30 hover:bg-red-200 dark:hover:bg-red-900/60"
                />
              )}
              <Button
                disabled={isLoading.save || isSaveDisabled}
                isLoading={isLoading.save}
                onClick={handleSave}
                size="md"
                text={translate('common.button.btn_save')}
              />
            </div>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              {translate('summary.tabs.pending_reasons.reason')}
            </label>
            <input
              type="text"
              readOnly
              value={reason}
              placeholder={translate('summary.tabs.pending_reasons.reason')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 bg-gray-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 rounded-md outline-none cursor-not-allowed text-sm"
            />
          </div>
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
                value={intExt}
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
                value={pic}
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
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              placeholder={translate('summary.tabs.pending_reasons.detail_placeholder')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-1 focus:ring-sky-500 resize-none bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
            />
          </div>
        </div>
      </Modal>
    </>
  );
}
