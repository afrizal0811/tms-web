'use client';

import InformationButton from '@/components/button/InformationButton';
import Modal from '@/components/modal/Modal';
import SearchBar from '@/components/SearchBar';
import TableData from '@/components/table/TableData';
import { getResults } from '@/lib/api/mileapp';
import { toastError } from '@/lib/toast';
import { formatDateUniversal, isEmpty } from '@/lib/utils';
import { useCallback, useEffect, useMemo, useState } from 'react';

export default function RoutingDetailModal({ isOpen, onClose, hubId, dateRange, translate }) {
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
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

  const renderAuditTooltip = useCallback(
    (row) => {
      const su = row.sync_user || row.syncUser;
      const ru = row.route_user || row.routeUser;
      const createdUser = ru?.created_by || row.createdBy || '-';
      const rawCreatedDate = ru?.created_at || row.createdAt;
      const createdDate = rawCreatedDate
        ? formatDateUniversal(rawCreatedDate, 'DD/MM/YY HH:mm:ss')
        : '-';
      const updatedUser = su?.updated_by || row.updatedBy || '-';
      const rawUpdatedDate = su?.updated_at || row.updatedAt;
      const updatedDate = rawUpdatedDate
        ? formatDateUniversal(rawUpdatedDate, 'DD/MM/YY HH:mm:ss')
        : '-';
      if (
        isEmpty(createdUser) ||
        isEmpty(createdDate) ||
        isEmpty(updatedUser) ||
        isEmpty(updatedDate)
      ) {
        return translate('common.no_data');
      }

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
          <div className="flex items-center justify-center">
            <span className="text-xs text-slate-500 dark:text-slate-400">{i + 1}</span>
          </div>
        ),
      },
      {
        label: translate('common.routing_name'),
        key: 'name',
        sortable: true,
        width: 'w-[40%]',
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
        width: 'w-[25%]',
        render: (row) => (
          <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
            {row.deliveryDate || '-'}
          </span>
        ),
      },
      {
        label: translate('common.total_task'),
        key: 'taskCount',
        align: 'center',
        sortable: true,
        width: 'w-[20%]',
        render: (row) => (
          <div className="flex items-center justify-center">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {row.taskCount ?? 0}
            </span>
          </div>
        ),
      },
      {
        label: translate('common.action'),
        key: 'actions',
        align: 'center',
        width: 'w-16',
        render: (row) => (
          <div className="flex items-center justify-center">
            <InformationButton
              infoText={renderAuditTooltip(row)}
              size="3.5"
              className="p-1.5 rounded bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 justify-center"
            />
          </div>
        ),
      },
    ],
    [translate, renderAuditTooltip]
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={translate('setting.tab.sync_data.modal.title')}
      subtitle={translate('setting.tab.sync_data.modal.subtitle')}
      maxWidth="max-w-3xl"
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
