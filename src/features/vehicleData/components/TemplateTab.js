// File: src/features/vehicleData/components/TemplateTab.js
'use client';

import HighlightText from '@/components/HighlightText';
import Td from '@/components/table/Td';
import Th from '@/components/table/Th';
import Tooltip from '@/components/Tooltip';
import { isEmpty } from '@/lib/utils';
import { formatVolume } from '../help';

export default function TemplateTab({ paginatedData, searchQuery, t }) {
  return (
    <div className="overflow-auto flex-1">
      <table className="w-full border-collapse min-w-[1200px]">
        <thead className="sticky top-0 z-10">
          <tr>
            <Th>{t('vehicle.tabs.template.name')}</Th>
            <Th>{t('vehicle.tabs.template.assignee')}</Th>
            <Th>{t('vehicle.tabs.template.start_time')}</Th>
            <Th>{t('vehicle.tabs.template.end_time')}</Th>
            <Th>{t('vehicle.tabs.template.break_start_time')}</Th>
            <Th>{t('vehicle.tabs.template.break_end_time')}</Th>
            <Th>{t('vehicle.tabs.template.multiday')}</Th>
            <Th>{t('vehicle.tabs.template.speed')}</Th>
            <Th>{t('vehicle.tabs.template.cost_factor')}</Th>
            <Th>{t('vehicle.tabs.template.vehicle_tags')}</Th>
            <Th>{t('vehicle.tabs.template.odd_even')}</Th>
            <Th>{t('vehicle.tabs.template.weight_min')}</Th>
            <Th>{t('vehicle.tabs.template.weight_max')}</Th>
            <Th>{t('vehicle.tabs.template.volume_min')}</Th>
            <Th>{t('vehicle.tabs.template.volume_max')}</Th>
          </tr>
        </thead>
        <tbody>
          {paginatedData.map((v) => (
            <tr key={v.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/10">
              <Td>
                <HighlightText text={v.plat} highlight={searchQuery} />
              </Td>
              <Td>
                <HighlightText text={v.email || null} highlight={searchQuery} />
              </Td>
              <Td>{v.startTime || null}</Td>
              <Td>{v.endTime || null}</Td>
              <Td>{v.startBreakTime || null}</Td>
              <Td>{v.endBreakTime || null}</Td>
              <Td>{v.multiday || 0}</Td>
              <Td>{v.speed}</Td>
              <Td>{v.costFactor}</Td>
              <Td>
                {(() => {
                  const tags = v.parsedTags || [];
                  if (isEmpty(tags)) return null;
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
              <Td>{v.maxWeight || null}</Td>
              <Td>{v.minVolume || 0}</Td>
              <Td>{formatVolume(v.maxVolume)}</Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
