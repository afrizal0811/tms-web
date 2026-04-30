import BaseModal from '@/components/BaseModal';
import ConfirmModal from '@/components/modal/ConfirmModal';
import { deleteTruckUsage, upsertTruckUsage } from '@/lib/api';
import { toastError, toastSuccess } from '@/lib/toastHelper';
import { formatLongDate } from '@/lib/utils';
import { useEffect, useState } from 'react';

export default function TruckUsageModal({
  isOpen,
  onClose,
  data,
  hubId,
  onSuccess,
  driverData,
  vehicleTypes,
  translate,
  language,
}) {
  const [count, setCount] = useState('');
  const [desc, setDesc] = useState('');

  const [initialCount, setInitialCount] = useState('');
  const [initialDesc, setInitialDesc] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  useEffect(() => {
    if (data && !data.isTms) {
      const initC = data.manualCount > 0 ? String(data.manualCount) : '';
      const initD = data.description || '';

      setCount(initC);
      setInitialCount(initC);
      setDesc(initD);
      setInitialDesc(initD);
    }
  }, [data]);

  if (!data) return null;

  if (data.isTms) {
    let sortedDetails = [];
    if (data.tmsDetails && data.tmsDetails.length > 0) {
      sortedDetails = data.tmsDetails.map((vh) => {
        const emailToMatch = (vh.driver || '').toLowerCase();
        const matchedDriver = (driverData || []).find(
          (d) => (d.email || '').toLowerCase() === emailToMatch
        );
        return {
          ...vh,
          driverName: matchedDriver && matchedDriver.name ? matchedDriver.name : vh.driver,
        };
      });

      if (data.type === 'Gabungan') {
        const typeOrder = vehicleTypes || [];
        sortedDetails.sort((a, b) => {
          const indexA = typeOrder.indexOf(a.type);
          const indexB = typeOrder.indexOf(b.type);
          const orderA = indexA === -1 ? 999 : indexA;
          const orderB = indexB === -1 ? 999 : indexB;

          if (orderA !== orderB) return orderA - orderB;
          return (a.driverName || '').localeCompare(b.driverName || '');
        });
      } else {
        sortedDetails.sort((a, b) => (a.driverName || '').localeCompare(b.driverName || ''));
      }
    }

    let modalTitle = `TMS - ${data.storage} (${data.type})`;
    if (data.type === 'Gabungan') {
      if (data.storage === 'DryTotal') modalTitle = 'TMS - Total (Dry)';
      else if (data.storage === 'FrozenTotal') modalTitle = 'TMS - Total (Frozen)';
      else if (data.storage === 'OTV') modalTitle = 'TMS - Total (OTV)';
    }

    return (
      <BaseModal
        isOpen={isOpen}
        onClose={onClose}
        maxWidth="max-w-md"
        title={
          <div className="flex flex-col gap-0.5">
            <span>{modalTitle}</span>
            <span className="text-sm font-normal opacity-70">
              {formatLongDate(data.date, language)}
            </span>
          </div>
        }
      >
        <div className="flex flex-col gap-3 pt-2 pb-2">
          <div className="bg-sky-50 text-sky-700 text-sm px-3 py-2.5 rounded-md border border-sky-100 flex justify-between items-center">
            <span>Total</span>
            <span className="font-bold text-lg">{data.tmsCount}</span>
          </div>

          <div className="mt-1">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              {translate('summary.tabs.truck_usage.modal.vehicle_list')}
            </h4>
            {sortedDetails.length > 0 ? (
              <div className="flex flex-col gap-2 max-h-[50vh] overflow-y-auto pr-1">
                {sortedDetails.map((vh, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col p-3 border border-gray-200 rounded-lg bg-slate-50 hover:bg-white transition-colors shadow-sm"
                  >
                    <div className="flex justify-between items-start mb-1">
                      <div className="font-bold text-slate-800 text-base">{vh.plate}</div>
                      {vh.type && (
                        <div className="text-[10px] font-bold px-2 py-0.5 bg-slate-200 text-slate-600 rounded">
                          {vh.type}
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 mt-1 border-t border-gray-100 pt-1">
                      <span className="font-medium text-slate-700">{vh.driverName}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-slate-400 text-sm py-6 italic border border-dashed border-gray-300 rounded-lg bg-gray-50">
                {translate('common.no_data')}
              </div>
            )}
          </div>
        </div>
      </BaseModal>
    );
  }

  const totalInput = (parseInt(count) || 0) + (data?.tmsCount || 0);
  const masterCapacity = data?.masterTotal || 0;
  const isOverLimit = data?.type !== 'Interbranch' && totalInput > masterCapacity;

  const isChanged = count !== initialCount || desc !== initialDesc;
  const isSaveDisabled = isLoading || count === '' || !desc.trim() || !isChanged;

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const resData = await upsertTruckUsage({
        hubId,
        date: data.date,
        storageType: data.storage,
        vehicleType: data.type,
        count,
        description: desc,
      });

      toastSuccess(translate('common.toast.success'));
      onSuccess(resData.data ? resData.data : resData);
      onClose();
    } catch (e) {
      toastError(t('common.toast.error', { err: e.message }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!data?.id) return;
    setIsConfirmOpen(false);
    setIsLoading(true);
    try {
      await deleteTruckUsage({
        hubId,
        date: data.date,
        storageType: data.storage,
        vehicleType: data.type,
      });

      toastSuccess(translate('common.toast.success'));
      onSuccess({ id: data.id, isDelete: true });
      onClose();
    } catch (e) {
      toastError(t('common.toast.error', { err: e.message }));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <ConfirmModal
        isOpen={isConfirmOpen}
        onCancel={() => setIsConfirmOpen(false)}
        onConfirm={handleDelete}
        title={translate('summary.tabs.truck_usage.modal.confirm_title')}
        message={translate('summary.tabs.truck_usage.modal.confirm_message')}
      />

      <BaseModal
        isOpen={isOpen && !isConfirmOpen}
        onClose={onClose}
        maxWidth="max-w-md"
        title={
          <div className="flex flex-col gap-0.5">
            <span>
              Non TMS - {data.storage} ({data.type})
            </span>
            <span className="text-sm font-normal opacity-70">
              {formatLongDate(data.date, language)}
            </span>
          </div>
        }
        footer={
          <div className="flex justify-between items-center w-full">
            <div>
              {data.id && (
                <button
                  disabled={isLoading}
                  onClick={() => setIsConfirmOpen(true)}
                  className="px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 font-medium text-sm transition-colors cursor-pointer"
                >
                  {translate('common.button.btn_delete')}
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <button
                disabled={isLoading}
                onClick={onClose}
                className="px-4 py-2 bg-slate-200 text-slate-700 rounded-md hover:bg-slate-300 font-medium text-sm cursor-pointer transition-colors"
              >
                {translate('summary.tabs.truck_usage.modal.btn_cancel')}
              </button>
              <button
                disabled={isSaveDisabled}
                onClick={handleSave}
                className="px-4 py-2 bg-sky-600 text-white rounded-md hover:bg-sky-700 font-medium text-sm min-w-[90px] disabled:bg-slate-300 disabled:cursor-not-allowed cursor-pointer transition-colors"
              >
                {isLoading
                  ? translate('summary.tabs.truck_usage.modal.loading_text')
                  : translate('common.button.btn_save')}
              </button>
            </div>
          </div>
        }
      >
        <div className="flex flex-col gap-4 pt-2 pb-2 relative">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {translate('summary.tabs.truck_usage.modal.manual_total')}{' '}
              <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="0"
              value={count}
              onChange={(e) => setCount(e.target.value)}
              placeholder={translate('summary.tabs.truck_usage.modal.manual_total_placeholder')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>

          {isOverLimit && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-md text-xs font-medium">
              ⚠️ {translate('summary.tabs.truck_usage.modal.over_limit')}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {translate('summary.tabs.truck_usage.modal.comment')}{' '}
              <span className="text-red-500">*</span>
            </label>
            <textarea
              rows="3"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder={translate('summary.tabs.truck_usage.modal.comment_placeholder')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-sky-500 resize-none"
            ></textarea>
          </div>
        </div>
      </BaseModal>
    </>
  );
}
