'use client';

import HighlightText from '@/components/HighlightText';
import CustomTable from '@/components/table/CustomTable';
import { useMemo, useState } from 'react';

const getRowClassName = (v) => {
  if (v.isIncomplete) {
    return 'bg-red-50 dark:bg-red-500/10 hover:bg-red-100/80 dark:hover:bg-red-500/15 transition-colors cursor-help';
  }
  if (v.isDuplicateDriver) {
    return 'bg-yellow-50 dark:bg-yellow-500/10 hover:bg-yellow-100/80 dark:hover:bg-yellow-500/15 transition-colors cursor-help';
  }
  return 'hover:bg-gray-50 dark:hover:bg-slate-700/10 transition-colors';
};

export default function VehicleTab({ paginatedData, searchQuery, t }) {
  const [sortConfig, setSortConfig] = useState({ key: 'type', direction: 'asc' });

  const getRowTooltip = (row) => {
    const tooltips = [];
    if (row.isIncomplete) tooltips.push(t('vehicle.tabs.incomplete_data'));
    if (row.isDuplicateDriver) tooltips.push(t('vehicle.tabs.duplicate_driver'));
    const tooltip = tooltips.join(', ');
    return tooltip.charAt(0).toUpperCase() + tooltip.slice(1).toLowerCase();
  };

  const dataWithNo = useMemo(() => {
    return paginatedData.map((item, index) => ({
      ...item,
      no: index + 1,
    }));
  }, [paginatedData]);

  const columns = [
    {
      key: 'no',
      width: 'w-[5%]',
      sortable: true,
      align: 'center',
      label: 'No',
      render: (row) => <div className="text-center w-full">{row.no}</div>,
    },
    {
      key: 'plat',
      width: 'w-[20%]',
      sortable: true,
      label: t('common.license_number'),
      render: (row) => (
        <div className="text-left w-full">
          <HighlightText text={row.plat} highlight={searchQuery} />
        </div>
      ),
    },
    {
      key: 'type',
      width: 'w-[20%]',
      sortable: true,
      label: t('common.type'),
      render: (row) => (
        <div className="text-left w-full">
          <HighlightText text={row.type || '-'} highlight={searchQuery} />
        </div>
      ),
    },
    {
      key: 'name',
      width: 'w-[25%]',
      sortable: true,
      label: t('vehicle.tabs.name'),
      render: (row) => (
        <div className="text-left w-full">
          <HighlightText text={row.name || '-'} highlight={searchQuery} />
        </div>
      ),
    },
    {
      key: 'email',
      width: 'w-[30%]',
      sortable: true,
      label: t('vehicle.tabs.email'),
      render: (row) => (
        <div className="text-left w-full">
          <HighlightText text={row.email || '-'} highlight={searchQuery} />
        </div>
      ),
    },
  ];

  return (
    <div className="overflow-hidden flex-1 h-full rounded-b-lg">
      <CustomTable
        columns={columns}
        data={dataWithNo}
        externalSortConfig={sortConfig}
        onExternalSort={setSortConfig}
        rowClassName={getRowClassName}
        rowTooltip={getRowTooltip}
      />
    </div>
  );
}
