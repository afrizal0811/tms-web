'use client';

import HighlightText from '@/components/HighlightText';
import Td from '@/components/table/Td';
import Th from '@/components/table/Th';
import Tooltip from '@/components/Tooltip';
import { isEmpty } from '@/lib/utils';
import { Fragment } from 'react';
import { formatVolume } from '../help';

const getRowStyleAndTooltip = (v, t) => {
  if (v.isIncomplete) {
    return {
      rowClass:
        'bg-red-50 dark:bg-red-500/10 hover:bg-red-100/80 dark:hover:bg-red-500/15 cursor-help',
      tooltipMsg: t('vehicle.tabs.incomplete_data'),
    };
  }
  if (v.isDuplicateDriver) {
    return {
      rowClass:
        'bg-yellow-50 dark:bg-yellow-500/10 hover:bg-yellow-100/80 dark:hover:bg-yellow-500/15 cursor-help',
      tooltipMsg: t('vehicle.tabs.duplicate_driver'),
    };
  }
  return {
    rowClass: 'hover:bg-gray-50 dark:hover:bg-slate-700/10',
    tooltipMsg: '',
  };
};

export default function TemplateTab({ paginatedData, searchQuery, t }) {
  return (
    <div className="overflow-auto flex-1">
      <table className="w-full border-collapse min-w-[1200px]">
        <thead className="sticky top-0 z-10">
          <tr>
            <Th>#</Th>
            <Th>{t('vehicle.tabs.template.name')}</Th>
            <Th>{t('vehicle.tabs.template.assignee')}</Th>
            <Th>{t('common.start_time')}</Th>
            <Th>{t('common.finish_time')}</Th>
            <Th>{t('vehicle.tabs.template.break_start_time')}</Th>
            <Th>{t('vehicle.tabs.template.break_end_time')}</Th>
            <Th>{t('vehicle.tabs.template.multiday')}</Th>
            <Th>{t('vehicle.tabs.template.speed')}</Th>
            <Th>{t('vehicle.tabs.template.cost_factor')}</Th>
            <Th>{t('vehicle.tabs.template.vehicle_tags')}</Th>
            <Th>{t('vehicle.tabs.template.odd_even')}</Th>
            <Th>{t('vehicle.tabs.template.weight_min')}</Th>
            <Th>{t('common.weight_max')}</Th>
            <Th>{t('vehicle.tabs.template.volume_min')}</Th>
            <Th>{t('common.volume_max')}</Th>
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
                <Td alignClass={`${v.email ? 'text-left' : 'text-center'}`}>
                  <HighlightText text={v.email || '-'} highlight={searchQuery} />
                </Td>
                <Td>{v.workingTime?.startTime || null}</Td>
                <Td>{v.workingTime?.endTime || null}</Td>
                <Td>{v.breakTime?.startBreakTime || null}</Td>
                <Td>{v.breakTime?.endBreakTime || null}</Td>
                <Td>{v.workingTime?.multiday || 0}</Td>
                <Td>{v.speed}</Td>
                <Td>{v.costFactor}</Td>
                <Td>
                  {(() => {
                    const tags = v.parsedTags || [];
                    if (isEmpty(tags)) return '-';
                    const firstTag = tags[0];
                    const remainingTags = tags.slice(1);
                    const remainingCount = remainingTags.length;

                    if (remainingCount === 0) return firstTag;
                    return (
                      <Tooltip tooltipContent={remainingTags.join('\n')}>
                        <span>
                          {firstTag}; (+{remainingCount} {t('vehicle.tabs.template.more')})
                        </span>
                      </Tooltip>
                    );
                  })()}
                </Td>
                <Td>{v.oddEven}</Td>
                <Td>{v.minWeight || 0}</Td>
                <Td>{v.maxWeight || 0}</Td>
                <Td>{v.minVolume || 0}</Td>
                <Td>{formatVolume(v.maxVolume)}</Td>
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
