'use client';

import HighlightText from '@/components/HighlightText';
import Td from '@/components/table/Td';
import Th from '@/components/table/Th';
import { normalizeEmail } from '@/lib/utils';

export default function VehicleTab({ paginatedData, driverMap, searchQuery }) {
  return (
    <div className="overflow-auto flex-1">
      <table className="w-full border-collapse min-w-4xl">
        <thead className="sticky top-0 z-10">
          <tr>
            <Th>Plat</Th>
            <Th>Type</Th>
            <Th>Name</Th>
            <Th>Email</Th>
          </tr>
        </thead>
        <tbody>
          {paginatedData.map((v) => (
            <tr key={v._id} className="hover:bg-gray-50">
              <Td>
                <HighlightText text={v.name} highlight={searchQuery} />
              </Td>
              <Td>
                <HighlightText text={v.tags?.[0] || null} highlight={searchQuery} />
              </Td>
              <Td>
                <HighlightText
                  text={driverMap.get(normalizeEmail(v.assignee)) || null}
                  highlight={searchQuery}
                />
              </Td>
              <Td>
                <HighlightText text={v.assignee} highlight={searchQuery} />
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
