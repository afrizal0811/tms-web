'use client';

import HighlightText from '@/components/HighlightText';
import Td from '@/components/table/Td';
import Th from '@/components/table/Th';
import { Fragment } from 'react';

const getRowStyle = (v) => {
  if (v.isIncomplete) {
    return {
      rowClass: 'bg-red-50 dark:bg-red-500/10 hover:bg-red-100/80 dark:hover:bg-red-500/15',
    };
  }
  if (v.isDuplicateDriver) {
    return {
      rowClass:
        'bg-yellow-50 dark:bg-yellow-500/10 hover:bg-yellow-100/80 dark:hover:bg-yellow-500/15',
    };
  }
  return {
    rowClass: 'hover:bg-gray-50 dark:hover:bg-slate-700/10',
  };
};
export default function VehicleTab({ paginatedData, searchQuery, t }) {
  return (
    <div className="overflow-auto flex-1">
      <table className="w-full border-collapse min-w-4xl">
        <thead className="sticky top-0 z-10">
          <tr>
            <Th>#</Th>
            <Th>{t('common.license_number')}</Th>
            <Th>{t('common.type')}</Th>
            <Th>{t('vehicle.tabs.name')}</Th>
            <Th>{t('vehicle.tabs.email')}</Th>
          </tr>
        </thead>
        <tbody>
          {paginatedData.map((v, index) => {
            const { rowClass } = getRowStyle(v);
            const rowData = (
              <tr className={rowClass}>
                <Td>{index + 1}</Td>
                <Td>
                  <HighlightText text={v.plat} highlight={searchQuery} />
                </Td>
                <Td>
                  <HighlightText text={v.type || '-'} highlight={searchQuery} />
                </Td>
                <Td>
                  <HighlightText text={v.name || '-'} highlight={searchQuery} />
                </Td>
                <Td>
                  <HighlightText text={v.email || '-'} highlight={searchQuery} />
                </Td>
              </tr>
            );

            return <Fragment key={`${v.id}-${v.plat}`}>{rowData}</Fragment>;
          })}
        </tbody>
      </table>
    </div>
  );
}
