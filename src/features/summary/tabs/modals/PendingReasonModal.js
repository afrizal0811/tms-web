// File: src/features/summary/tabs/modals/PendingReasonModal.js
'use client';

import BaseModal from '@/components/BaseModal';
import ConfirmModal from '@/components/modal/ConfirmModal';
import { deletePendingDetail, postPendingDetail } from '@/lib/api'; // Pastikan deletePendingDetail diimport
import { toastError, toastSuccess } from '@/lib/toast';
import { useEffect, useMemo, useState } from 'react';

export default function PendingReasonModal({
  isOpen,
  onClose,
  data,
  reasons,
  onSuccess,
  translate,
}) {
  const [intExt, setIntExt] = useState('');
  const [detail, setDetail] = useState('');
  const [groupReason, setGroupReason] = useState('');
  const [pic, setPic] = useState('');
  const [isLoading, setIsLoading] = useState(false);
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

  // Logika untuk mengurutkan (ascending) dan mencari Group Reason yang duplikat
  const { sortedReasons, reasonCounts } = useMemo(() => {
    if (!reasons || reasons.length === 0) return { sortedReasons: [], reasonCounts: {} };

    const counts = reasons.reduce((acc, curr) => {
      acc[curr.reasons] = (acc[curr.reasons] || 0) + 1;
      return acc;
    }, {});

    const sorted = [...reasons].sort((a, b) => a.reasons.localeCompare(b.reasons));

    return { sortedReasons: sorted, reasonCounts: counts };
  }, [reasons]);

  if (!data) return null;

  const handleGroupReasonChange = (e) => {
    const val = e.target.value;
    if (val) {
      const [gReason, gPic] = val.split('|');
      setGroupReason(gReason);
      setPic(gPic);
    } else {
      setGroupReason('');
      setPic('');
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const dateParts = data.dateStr.split('-');
      const dbDate = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`; // YYYY-MM-DD

      const payload = {
        taskId: data._id,
        date: dbDate,
        internalExternal: intExt,
        detailReason: detail,
        groupReason: groupReason,
        pic: pic,
      };

      const res = await postPendingDetail(payload);
      toastSuccess(translate('common.toast.success'));
      onSuccess(res.data || res);
      onClose();
    } catch (e) {
      toastError(translate('common.toast.error', { err: e.message }));
    } finally {
      setIsLoading(false);
    }
  };

  // PERUBAHAN: Fungsi Delete sekarang menghapus dari Database secara permanen
  const handleDelete = async () => {
    setIsConfirmOpen(false);
    setIsLoading(true);
    try {
      await deletePendingDetail(data._id); // Hapus dengan memanggil API Delete
      toastSuccess(translate('common.toast.success'));

      // Kirim indikator 'deleted: true' ke parent
      onSuccess({ taskId: data._id, deleted: true });
      onClose();
    } catch (e) {
      toastError(translate('common.toast.error', { err: e.message }));
    } finally {
      setIsLoading(false);
    }
  };

  const isEmptyData = !intExt || !detail.trim() || !groupReason || !pic;
  const isSaveDisabled = isLoading || isEmptyData;

  const hasExistingData =
    data?.pendingDetail &&
    (data.pendingDetail.internalExternal ||
      data.pendingDetail.detailReason ||
      data.pendingDetail.groupReason ||
      data.pendingDetail.pic);

  const statusText = data.statusDelivery ? data.statusDelivery[0] : data.status;
  const title = translate('summary.tabs.pending_reasons.modal_title');
  return (
    <>
      <ConfirmModal
        isOpen={isConfirmOpen}
        onCancel={() => setIsConfirmOpen(false)}
        onConfirm={handleDelete}
        title={translate('common.modal.confirm_title', { text: title })}
        message={translate('common.modal.confirm_message', {
          text: title.toLowerCase(),
        })}
      />
      <BaseModal
        isOpen={isOpen}
        onClose={onClose}
        maxWidth="max-w-lg"
        title={
          <div className="flex flex-col gap-0.5">
            <span>{title}</span>
            <span className="text-sm font-normal opacity-70">
              {statusText} | {data.customer}
            </span>
          </div>
        }
        footer={
          <div className="flex justify-between items-center w-full">
            <div>
              {hasExistingData ? (
                <button
                  disabled={isLoading}
                  onClick={() => setIsConfirmOpen(true)}
                  className="px-4 py-2 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 rounded-md hover:bg-red-200 dark:hover:bg-red-900/60 font-medium text-sm transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {translate('common.button.btn_delete')}
                </button>
              ) : (
                <div></div>
              )}
            </div>
            <div className="flex gap-2">
              <button
                disabled={isLoading}
                onClick={onClose}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-md hover:bg-slate-300 dark:hover:bg-slate-600 font-medium text-sm transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
              >
                {translate('common.button.btn_cancel')}
              </button>
              <button
                disabled={isSaveDisabled}
                onClick={handleSave}
                className="px-4 py-2 bg-sky-600 text-white rounded-md hover:bg-sky-700 font-medium text-sm min-w-[90px] disabled:bg-slate-300 dark:disabled:bg-slate-700 dark:disabled:text-slate-500 transition-colors cursor-pointer disabled:cursor-not-allowed"
              >
                {isLoading ? translate('common.saving') : translate('common.button.btn_save')}
              </button>
            </div>
          </div>
        }
      >
        <div className="flex flex-col gap-4 py-2">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              {translate('summary.tabs.pending_reasons.category')}
            </label>
            <select
              value={intExt}
              onChange={(e) => setIntExt(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 rounded-md focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer"
            >
              <option value="" disabled>
                {translate('common.select')} {translate('summary.tabs.pending_reasons.category')}
              </option>
              <option value="Internal">Internal</option>
              <option value="External">External</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              {translate('summary.tabs.pending_reasons.group_reason')}
            </label>
            <select
              value={groupReason && pic ? `${groupReason}|${pic}` : ''}
              onChange={handleGroupReasonChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 rounded-md focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer"
            >
              <option value="" disabled>
                {translate('common.select')}{' '}
                {translate('summary.tabs.pending_reasons.group_reason')}
              </option>
              {sortedReasons.map((r, i) => {
                const isDuplicate = reasonCounts[r.reasons] > 1;
                const displayLabel = isDuplicate ? `${r.reasons} (${r.pic})` : r.reasons;
                return (
                  <option key={i} value={`${r.reasons}|${r.pic}`}>
                    {displayLabel}
                  </option>
                );
              })}
            </select>
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
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 bg-gray-100 dark:bg-slate-700 text-slate-500 rounded-md outline-none cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              {translate('summary.tabs.pending_reasons.detail_reason')}
            </label>
            <textarea
              rows="3"
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              placeholder={translate('summary.tabs.pending_reasons.detail_placeholder')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 rounded-md focus:outline-none focus:ring-1 focus:ring-sky-500 resize-none"
            ></textarea>
          </div>
        </div>
      </BaseModal>
    </>
  );
}
