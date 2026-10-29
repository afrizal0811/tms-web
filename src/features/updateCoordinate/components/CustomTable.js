'use client';

import TableData from '@/components/table/TableData';
import { useCallback, useState } from 'react';
import CustomerHistoryModal from '../modal/CustomerHistoryModal';

export default function CustomTable({ data, historyMap, selectedDate, t, localeCode }) {
  const [selectedRow, setSelectedRow] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleRowClick = (row) => {
    setSelectedRow(row);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedRow(null);
  };

  const [sortConfig, setSortConfig] = useState({ key: 'distanceDiff', direction: 'asc' });

  const customSort = useCallback((items, currentSortConfig) => {
    if (!currentSortConfig || !currentSortConfig.key) return items;
    const { key, direction } = currentSortConfig;
    const modifier = direction === 'asc' ? 1 : -1;

    return [...items].sort((a, b) => {
      if (key === 'distanceDiff') {
        const distA = a.distanceDiff ?? 0;
        const distB = b.distanceDiff ?? 0;
        return (distA - distB) * modifier;
      }

      const aVal = a[key] ?? '';
      const bVal = b[key] ?? '';
      const cmp =
        typeof aVal === 'string' && typeof bVal === 'string'
          ? aVal.localeCompare(bVal)
          : aVal < bVal
            ? -1
            : aVal > bVal
              ? 1
              : 0;

      return cmp * modifier;
    });
  }, []);

  const currentHistory = selectedRow ? historyMap.get(selectedRow.customerData) || [] : [];

  const getRowClassName = (row) => {
    return row.isIncomplete
      ? 'bg-red-100 hover:bg-red-200 cursor-pointer dark:bg-red-900/40 dark:hover:bg-red-900/60 transition-colors'
      : 'hover:bg-gray-50 cursor-pointer dark:hover:bg-slate-700/10 transition-colors';
  };

  const columns = [
    {
      key: 'no',
      width: 'w-[4%]',
      sortable: false,
      label: 'No',
      align: 'center',
      render: (row, index) => <div className="text-center w-full">{index + 1}</div>,
    },
    {
      key: 'deliveryDate',
      width: 'w-[7%]',
      sortable: true,
      align: 'center',
      label: t('common.delivery_date'),
      render: (row) => <div className="text-center w-full">{row.deliveryDateDisplay}</div>,
    },
    {
      key: 'soNumber',
      width: 'w-[13%]',
      sortable: true,
      label: t('common.invoice_number'),
      render: (row) => <div className="text-left w-full">{row.soNumber}</div>,
    },
    {
      key: 'customerName',
      width: 'w-[15%]',
      sortable: true,
      label: t('common.customer_name'),
      render: (row) => <div className="text-left w-full">{row.customerName}</div>,
    },
    {
      key: 'customerId',
      width: 'w-[9%]',
      sortable: true,
      align: 'center',
      label: t('common.customer_id'),
      render: (row) => (
        <div className="text-center w-full">{row.isIncomplete ? '-' : row.customerId || '-'}</div>
      ),
    },
    {
      key: 'locationId',
      width: 'w-[9%]',
      sortable: true,
      align: 'center',
      label: t('common.location_id'),
      render: (row) => (
        <div className="text-center w-full">{row.isIncomplete ? '-' : row.locationId || '-'}</div>
      ),
    },
    {
      key: 'newLonglat',
      width: 'w-[14%]',
      sortable: false,
      align: 'center',
      label: t('common.coord_new'),
      render: (row) => <div className="font-mono text-center w-full">{row.newLonglat}</div>,
    },
    {
      key: 'distanceDiff',
      width: 'w-[8%]',
      sortable: true,
      align: 'center',
      label: t('common.dist_diff'),
      render: (row) => (
        <div className="text-center w-full">{row.distanceDiff?.toLocaleString(localeCode)}</div>
      ),
    },
    {
      key: 'driverName',
      width: 'w-[13%]',
      sortable: true,
      label: t('common.driver'),
      render: (row) => <div className="text-left w-full">{row.driverName}</div>,
    },
    {
      key: 'updateTime',
      width: 'w-[8%]',
      sortable: true,
      align: 'center',
      label: t('longlat.table.update_time'),
      render: (row) => <div className="text-center w-full">{row.updateTime}</div>,
    },
  ];

  return (
    <>
      <div className="flex flex-col h-full space-y-4">
        <div className="overflow-hidden h-full rounded-lg bg-white dark:bg-slate-800">
          <TableData
            columns={columns}
            data={data}
            onRowClick={handleRowClick}
            customSort={customSort}
            externalSortConfig={sortConfig}
            onExternalSort={setSortConfig}
            rowClassName={getRowClassName}
          />
        </div>
      </div>
      {isModalOpen && (
        <CustomerHistoryModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          data={currentHistory}
          customerData={selectedRow?.customerData}
          selectedDate={selectedDate}
        />
      )}
    </>
  );
}
