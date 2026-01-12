'use client';

import HighlightText from '@/components/HighlightText';
import Td from '@/components/table/Td';
import Th from '@/components/table/Th';
import Tooltip from '@/components/Tooltip';
import { isEmpty, normalizeEmail } from '@/lib/utils';
import { formatVolume } from '../help';

export default function TemplateTab({ paginatedData, driverMap, searchQuery, t }) {
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
            <tr key={v._id} className="hover:bg-gray-50">
              <Td>
                <HighlightText text={v.name} highlight={searchQuery} />
              </Td>
              <Td>
                <HighlightText
                  text={driverMap.get(normalizeEmail(v.assignee)) || null}
                  highlight={searchQuery}
                />
              </Td>
              <Td>{v.workingTime?.startTime || null}</Td>
              <Td>{v.workingTime?.endTime || null}</Td>
              <Td>{v.breaktime?.startTime || null}</Td>
              <Td>{v.breaktime?.endTime || null}</Td>
              <Td>{v.workingTime?.multiday || 0}</Td>
              <Td>{v.speed}</Td>
              <Td>{null}</Td>
              <Td>
                {(() => {
                  const tags = v.tags || [];
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
              <Td>0</Td>
              <Td>{v.capacity?.weight?.max || null}</Td>
              <Td>0</Td>
              <Td>{formatVolume(v.capacity?.volume?.max)}</Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
