'use client';

import CustomDatePicker from '@/components/CustomDatePicker';
import InformationButton from '@/components/button/InformationButton';
import Modal from '@/components/modal/Modal';
import SearchBar from '@/components/SearchBar';
import TableData from '@/components/table/TableData';
import { getResults, updateRoutingResult } from '@/lib/api/mileapp';
import { toastError, toastSuccess } from '@/lib/toast';
import { formatDateUniversal, isEmpty } from '@/lib/utils';
import { useCallback, useEffect, useMemo, useState } from 'react';

export default function RoutingDetailModal({
  isOpen,
  onClose,
  hubId,
  dateRange,
  translate,
  onSaved,
}) {
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editDeliveryDate, setEditDeliveryDate] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const dateFromStr = dateRange?.[0] ? formatDateUniversal(dateRange[0], 'YYYY-MM-DD') : '';
  const dateToStr = dateRange?.[1] ? formatDateUniversal(dateRange[1], 'YYYY-MM-DD') : dateFromStr;

  const fetchData = useCallback(async () => {
    if (!isOpen || !dateFromStr) return;
    setIsLoading(true);
    try {
      const data = await getResults({
        dateFrom: dateFromStr,
        dateTo: dateToStr,
        hubId,
      });
      setResults(Array.isArray(data) ? data : []);
    } catch (err) {
      toastError(err.message, err);
    } finally {
      setIsLoading(false);
    }
  }, [isOpen, dateFromStr, dateToStr, hubId]);

  useEffect(() => {
    if (isOpen) {
      setEditingId(null);
      setEditDeliveryDate('');
      setSearchQuery('');
      fetchData();
    }
  }, [isOpen, fetchData]);

  const filteredResults = useMemo(() => {
    const sorted = [...results].sort((a, b) => {
      const dateA = a.deliveryDate || '';
      const dateB = b.deliveryDate || '';
      const dateCompare = dateA.localeCompare(dateB);
      if (dateCompare !== 0) return dateCompare;
      return (a.name || '').localeCompare(b.name || '');
    });

    if (!searchQuery.trim()) return sorted;
    const q = searchQuery.toLowerCase().trim();
    return sorted.filter(
      (r) =>
        (r.name || '').toLowerCase().includes(q) ||
        (r.deliveryDate || '').toLowerCase().includes(q) ||
        (r.createdBy || '').toLowerCase().includes(q) ||
        (r.updatedBy || '').toLowerCase().includes(q)
    );
  }, [results, searchQuery]);

  const handleSave = useCallback(
    async (item) => {
      if (!editDeliveryDate) return;
      setIsSaving(true);
      try {
        const res = await updateRoutingResult(item.id, {
          deliveryDate: editDeliveryDate,
        });
        const updatedData = res?.data || {};

        setResults((prev) =>
          prev.map((r) =>
            r.id === item.id
              ? {
                  ...r,
                  deliveryDate: updatedData.deliveryDate || editDeliveryDate,
                  updatedBy: updatedData.updatedBy || r.updatedBy,
                  updatedAt: updatedData.updatedAt || new Date().toISOString(),
                }
              : r
          )
        );

        setEditingId(null);
        toastSuccess(translate('common.toast.success') || 'Berhasil memperbarui data routing');
        if (onSaved) onSaved();
      } catch (err) {
        toastError(err.message, err);
      } finally {
        setIsSaving(false);
      }
    },
    [editDeliveryDate, onSaved, translate]
  );

  const renderAuditTooltip = useCallback(
    (row) => {
      const createdUser = row.createdBy || '-';
      const createdDate = row.createdBy
        ? row.createdAt
          ? formatDateUniversal(row.createdAt, 'DD/MM/YY HH:mm:ss')
          : '-'
        : '-';
      const updatedUser = row.updatedBy || '-';
      const updatedDate = row.updatedBy
        ? row.updatedAt
          ? formatDateUniversal(row.updatedAt, 'DD/MM/YY HH:mm:ss')
          : '-'
        : '-';
      if (isEmpty(createdUser) || isEmpty(createdDate) || isEmpty(updatedUser) || isEmpty(updatedDate)) return translate('common.no_data');
      
      return (
        <div className="flex flex-col gap-1 text-left min-w-[190px]">
          <div>
            <span className="text-slate-400 font-semibold">{translate('common.created_by')}: </span>
            <span className="font-medium text-white">{`${createdUser} (${createdDate})`}</span>
          </div>
          <div>
            <span className="text-slate-400 font-semibold">{translate('common.updated_by')}: </span>
            <span className="font-medium text-white">{`${updatedUser} (${updatedDate})`}</span>
          </div>
        </div>
      );
    },
    [translate]
  );

  const columns = useMemo(
    () => [
      {
        label: '#',
        key: 'no',
        align: 'center',
        width: 'w-12',
        render: (_, i) => (
          <span className="text-xs text-slate-500 dark:text-slate-400">{i + 1}</span>
        ),
      },
      {
        label: translate('common.routing_name'),
        key: 'name',
        sortable: true,
        width: 'w-[45%]',
        render: (row) => (
          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 break-words">
            {row.name || '-'}
          </span>
        ),
      },
      {
        label: translate('common.delivery_date'),
        key: 'deliveryDate',
        sortable: true,
        width: 'w-[35%]',
        render: (row) => {
          const isEditing = editingId === row.id;
          if (isEditing) {
            const selectedDate = editDeliveryDate ? new Date(`${editDeliveryDate}T00:00:00`) : null;
            return (
              <CustomDatePicker
                selectsRange={false}
                selected={selectedDate}
                onChange={(date) => {
                  if (date) {
                    setEditDeliveryDate(formatDateUniversal(date, 'YYYY-MM-DD'));
                  } else {
                    setEditDeliveryDate('');
                  }
                }}
                disableSunday={false}
                dateFormat="yyyy-MM-dd"
                className="!h-8 !py-1 !px-2 !text-xs !w-full"
                wrapperClassName="w-full"
                popperProps={{ strategy: 'fixed' }}
              />
            );
          }
          return (
            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
              {row.deliveryDate || '-'}
            </span>
          );
        },
      },
      {
        label: translate('common.action'),
        key: 'actions',
        align: 'center',
        width: 'w-24',
        render: (row) => {
          const isEditing = editingId === row.id;
          return (
            <div className="flex items-center justify-center gap-1.5">
              {isEditing ? (
                <>
                  <button
                    type="button"
                    onClick={() => handleSave(row)}
                    disabled={isSaving || !editDeliveryDate}
                    className="p-1.5 rounded bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 cursor-pointer disabled:opacity-50"
                    title={translate('common.button.btn_save')}
                  >
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    disabled={isSaving}
                    className="p-1.5 rounded bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 cursor-pointer"
                    title={translate('common.cancel')}
                  >
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(row.id);
                    setEditDeliveryDate(row.deliveryDate || '');
                  }}
                  className="p-1.5 rounded bg-sky-100 text-sky-700 hover:bg-sky-200 dark:bg-sky-950/40 dark:text-sky-300 cursor-pointer"
                  title={translate('common.button.btn_edit')}
                >
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                    />
                  </svg>
                </button>
              )}
              <InformationButton
                infoText={renderAuditTooltip(row)}
                size="3.5"
                className="p-1.5 rounded bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 justify-center"
              />
            </div>
          );
        },
      },
    ],
    [editingId, editDeliveryDate, isSaving, translate, handleSave, renderAuditTooltip]
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={translate('setting.tab.sync_data.modal.title')}
      subtitle={translate('setting.tab.sync_data.modal.subtitle')}
      maxWidth="max-w-2xl"
    >
      <div className="flex flex-col gap-4">
        <div className="w-full sm:w-[260px]">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder={translate('common.search')}
            width="w-full"
            size="sm"
          />
        </div>

        <div className="border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden max-h-[60vh] flex flex-col">
          <TableData
            columns={columns}
            data={filteredResults}
            isLoading={isLoading}
            paginate={false}
          />
        </div>
      </div>
    </Modal>
  );
}
