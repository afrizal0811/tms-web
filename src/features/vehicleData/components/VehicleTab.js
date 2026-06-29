'use client';

import HighlightText from '@/components/HighlightText';
import Td from '@/components/table/Td';
import Th from '@/components/table/Th';
import Tooltip from '@/components/Tooltip';
import { Fragment } from 'react';

const getRowStyleAndTooltip = (v, t) => {
  if (v.isIncomplete) {
    return {
      rowClass: 'bg-red-50 dark:bg-red-500/10 hover:bg-red-100/80 dark:hover:bg-red-500/15',
      tooltipMsg: t('vehicle.tabs.incomplete_data'),
    };
  }
  if (v.isDuplicateDriver) {
    return {
      rowClass:
        'bg-yellow-50 dark:bg-yellow-500/10 hover:bg-yellow-100/80 dark:hover:bg-yellow-500/15',
      tooltipMsg: t('vehicle.tabs.duplicate_driver'),
    };
  }
  return {
    rowClass: 'hover:bg-gray-50 dark:hover:bg-slate-700/10',
    tooltipMsg: '',
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
            <Th>{t('vehicle.tabs.type')}</Th>
            <Th>{t('vehicle.tabs.name')}</Th>
            <Th>{t('vehicle.tabs.email')}</Th>
          </tr>
        </thead>
        <tbody>
          {paginatedData.map((v, index) => {
            const { rowClass, tooltipMsg } = getRowStyleAndTooltip(v, t);

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

            return (
              <Fragment key={`${v.id}-${v.plat}`}>
                {tooltipMsg ? <Tooltip tooltipContent={tooltipMsg}>{rowData}</Tooltip> : rowData}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
