'use client';

import Modal from '@/components/Modal';
import CustomTable from '@/components/table/TableData';
import { getBasePlate } from '@/lib/utils';
import { useMemo, useState } from 'react';

export default function DistanceSummaryModal({
  isOpen,
  onClose,
  data,
  title,
  subtitle,
  translate,
  localeCode,
}) {
  const [sortConfig, setSortConfig] = useState({ key: 'driverName', direction: 'asc' });

  const tableEntries = useMemo(() => {
    if (!data) return [];
    return data.map((item, index) => ({
      ...item,
      no: index + 1,
    }));
  }, [data]);

  if (!isOpen || !data) return null;

  const getRowClassName = (row) => {
    return row.isMissing
      ? 'text-red-500 font-bold bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 transition-colors'
      : 'text-slate-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors';
  };

  const columns = [
    {
      key: 'no',
      width: 'w-[10%]',
      sortable: false,
      label: '#',
      align: 'center',
      render: (row) => <div className="text-center w-full">{row.no}</div>,
    },
    {
      key: 'plate',
      width: 'w-[25%]',
      sortable: false,
      align: 'center',
      label: translate('common.license_number'),
      render: (row) => <div className="text-center w-full">{getBasePlate(row.plate) || '-'}</div>,
    },
    {
      key: 'driverName',
      width: 'w-[25%]',
      sortable: true,
      align: 'center',
      label: translate('common.driver'),
      render: (row) => <div className="text-center w-full">{row.driverName || '-'}</div>,
    },
    {
      key: 'visit',
      width: 'w-[20%]',
      sortable: true,
      align: 'center',
      label: translate('summary.tabs.dist_summary.modal.total_visit'),
      render: (row) => (
        <div className="text-center w-full">{row.isMissing ? '-' : row.visit || '0'}</div>
      ),
    },
    {
      key: 'distance',
      width: 'w-[20%]',
      sortable: true,
      align: 'center',
      label: translate('common.distance'),
      render: (row) => (
        <div className="text-center w-full">
          {row.isMissing
            ? '-'
            : row.distance
              ? row.distance.toLocaleString(localeCode, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })
              : '0'}
        </div>
      ),
    },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} subtitle={subtitle} maxWidth="max-w-3xl">
      <div className="p-0">
        <div className="overflow-hidden border border-gray-200 dark:border-slate-700 rounded-lg flex flex-col max-h-[60vh]">
          <CustomTable
            columns={columns}
            data={tableEntries}
            externalSortConfig={sortConfig}
            onExternalSort={setSortConfig}
            rowClassName={getRowClassName}
          />
        </div>
      </div>
    </Modal>
  );
}
