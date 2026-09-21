'use client';

import Button from '@/components/button/Button';
import Dropdown from '@/components/dropdown/Dropdown';
import ConfirmModal from '@/components/modal/ConfirmModal';
import Modal from '@/components/modal/Modal';
import { deletePendingDetail, postPendingDetail } from '@/lib/api/mileapp';
import { toastError, toastSuccess } from '@/lib/toast';
import { capitalizeText } from '@/lib/utils';
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
      acc[curr.reasons] = (acc[curr.reasons] || 0) + 1;
      return acc;
    }, {});

    const sorted = [...reasons].sort((a, b) => a.reasons.localeCompare(b.reasons));

    return { sortedReasons: sorted, reasonCounts: counts };
  }, [reasons]);

  const availableReasons = useMemo(() => {
    if (!intExt) return [];
    return sortedReasons.filter(
      (r) => r.category === intExt || r.internalExternal === intExt || r.type === intExt
    );
  }, [sortedReasons, intExt]);

  if (!data) return null;

  const handleGroupReasonChange = (val) => {
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
    setIsLoading((prev) => ({ ...prev, save: true }));
    try {
      const dateParts = data.dateStr.split('-');
      const dbDate = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;

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
      toastError(translate('common.toast.error', { err: e.message }), e);
    } finally {
      setIsLoading((prev) => ({ ...prev, save: false }));
    }
  };

  const handleDelete = async () => {
    setIsConfirmOpen(false);
    setIsLoading((prev) => ({ ...prev, delete: true }));
    try {
      await deletePendingDetail(data._id);
      toastSuccess(translate('common.toast.success'));

      onSuccess({ taskId: data._id, deleted: true });
      onClose();
    } catch (e) {
      toastError(translate('common.toast.error', { err: e.message }), e);
    } finally {
      setIsLoading((prev) => ({ ...prev, delete: false }));
    }
  };

  const isEmptyData = !intExt || !groupReason || !pic;
  const isSaveDisabled = isLoading.save || isEmptyData;

  const hasExistingData =
    data?.pendingDetail &&
    (data.pendingDetail.internalExternal ||
      data.pendingDetail.groupReason ||
      data.pendingDetail.pic);

  const statusText = data.statusDelivery ? data.statusDelivery[0] : data.status;
  const msgParts = translate('common.modal.delete_message', { text: '|||' }).split('|||');

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
        maxWidth="max-w-lg"
        title={translate('summary.tabs.pending_reasons.modal_title')}
        subtitle={`${capitalizeText(statusText)} | ${data.customer}`}
        footer={
          <div className="flex justify-end w-full">
            <div className="flex items-center gap-2 w-fit">
              {hasExistingData && (
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
        <div className="flex flex-col gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              {translate('summary.tabs.pending_reasons.category')}
            </label>
            <Dropdown
              value={intExt}
              onChange={(val) => {
                setIntExt(val);
                setGroupReason('');
                setPic('');
              }}
              options={[
                { label: 'Internal', value: 'Internal' },
                { label: 'External', value: 'External' },
              ]}
              getLabel={(val) =>
                val ||
                `${translate('common.select')} ${translate('summary.tabs.pending_reasons.category')}`
              }
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              {translate('summary.tabs.pending_reasons.group_reason')}
            </label>
            <Dropdown
              value={groupReason && pic ? `${groupReason}|${pic}` : ''}
              onChange={handleGroupReasonChange}
              disabled={!intExt}
              options={availableReasons.map((r) => {
                const isDuplicate = reasonCounts[r.reasons] > 1;
                const displayLabel = isDuplicate ? `${r.reasons} (${r.pic})` : r.reasons;
                return { label: displayLabel, value: `${r.reasons}|${r.pic}` };
              })}
              getLabel={(val) => {
                if (!val)
                  return `${translate('common.select')} ${translate('summary.tabs.pending_reasons.group_reason')}`;
                const match = sortedReasons.find((r) => `${r.reasons}|${r.pic}` === val);
                if (!match) return val;
                const isDuplicate = reasonCounts[match.reasons] > 1;
                return isDuplicate ? `${match.reasons} (${match.pic})` : match.reasons;
              }}
              isAutocomplete={true}
              className="w-full"
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
              className={`w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-1 focus:ring-sky-500 resize-none bg-white dark:bg-slate-800`}
            />
          </div>
        </div>
      </Modal>
    </>
  );
}
