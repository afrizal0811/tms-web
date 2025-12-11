'use client';

import HighlightText from '@/components/HighlightText';
import Td from '@/components/table/Td';
import Th from '@/components/table/Th';
import Tooltip from '@/components/Tooltip';
import { normalizeEmail } from '@/lib/utils';
import { formatVolume } from '../help';

export default function TemplateTab({ paginatedData, driverMap, searchQuery }) {
  return (
    <div className="overflow-auto flex-1">
      <table className="w-full border-collapse min-w-[1200px]">
        <thead className="sticky top-0 z-10">
          <tr>
            <Th>Name*</Th>
            <Th>Assignee</Th>
            <Th>Start Time</Th>
            <Th>End Time</Th>
            <Th>Break Start</Th>
            <Th>Break End</Th>
            <Th>Multiday</Th>
            <Th>Speed Km/h</Th>
            <Th>Cost Factor</Th>
            <Th>Vehicle Tags</Th>
            <Th>Odd Even</Th>
            <Th>Weight Min</Th>
            <Th>Weight Max</Th>
            <Th>Volume Min</Th>
            <Th>Volume Max</Th>
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
                  if (tags.length === 0) return null;
                  const firstTag = tags[0];
                  const remainingTags = tags.slice(1);
                  const remainingCount = remainingTags.length;
                  if (remainingCount === 0) return firstTag;
                  return (
                    <Tooltip tooltipContent={remainingTags.join('\n')}>
                      <span>
                        {firstTag}; (+{remainingCount} lainnya)
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
