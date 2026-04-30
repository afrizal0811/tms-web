'use client';

import BaseModal from '@/components/BaseModal';

export default function AverageKmDetailModal({
  isOpen,
  onClose,
  data,
  title,
  translate,
  language,
}) {
  if (!isOpen || !data) return null;

  const columns = [
    {
      key: 'plate',
      label: translate('common.license_number'),
      render: (item) => item.plate || '-',
    },
    {
      key: 'driverName',
      label: translate('common.driver'),
      render: (item) => item.driverName || '-',
    },
    {
      key: 'visit',
      label: translate('summary.tabs.average_km.modal.total_visit'),
      render: (item) => item.visit || '-',
    },
    {
      key: 'distance',
      label: translate('summary.tabs.average_km.modal.distance'),
      render: (item) =>
        item.distance
          ? item.distance.toLocaleString(language, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })
          : '0',
    },
  ];

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title={title} maxWidth="max-w-3xl">
      <div className="p-0">
        <div className="overflow-x-auto border border-gray-200 rounded-lg">
          <table className="min-w-full text-sm text-left">
            <thead className="bg-gray-100 text-gray-700 font-bold border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-center">#</th>
                {columns.map((col) => (
                  <th key={col.key} className="px-4 py-3 text-center">
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {data.map((item, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-center text-slate-700">{idx + 1}</td>

                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-2 text-center text-slate-700">
                      {col.render(item)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </BaseModal>
  );
}
