// File: src/features/vehicleData/components/VehicleTab.js
'use client';

import HighlightText from '@/components/HighlightText';
import Td from '@/components/table/Td';
import Th from '@/components/table/Th';

export default function VehicleTab({ paginatedData, searchQuery, t }) {
  return (
    <div className="overflow-auto flex-1">
      <table className="w-full border-collapse min-w-4xl">
        <thead className="sticky top-0 z-10">
          <tr>
            <Th>{t('common.license_number')}</Th>
            <Th>{t('vehicle.tabs.type')}</Th>
            <Th>{t('vehicle.tabs.name')}</Th>
            <Th>{t('vehicle.tabs.email')}</Th>
          </tr>
        </thead>
        <tbody>
          {paginatedData.map((v) => (
            <tr key={`${v.id}-${v.plat}`} className="hover:bg-gray-50 dark:hover:bg-slate-700/10">
              <Td>
                <HighlightText text={v.plat} highlight={searchQuery} />
              </Td>
              <Td>
                <HighlightText text={v.type || null} highlight={searchQuery} />
              </Td>
              <Td>
                <HighlightText text={v.name || null} highlight={searchQuery} />
              </Td>
              <Td>
                <HighlightText text={v.email} highlight={searchQuery} />
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
