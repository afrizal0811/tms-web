'use client';

import Modal from '@/components/Modal';
import { getBasePlate } from '@/lib/utils';

export default function DistanceSummaryModal({
  isOpen,
  onClose,
  data,
  title,
  subtitle,
  translate,
  localeCode,
}) {
  if (!isOpen || !data) return null;

  const columns = [
    {
      key: 'plate',
      label: translate('common.license_number'),
      render: (item) => getBasePlate(item.plate) || '-',
    },
    {
      key: 'driverName',
      label: translate('common.driver'),
      render: (item) => item.driverName || '-',
    },
    {
      key: 'visit',
      label: translate('summary.tabs.dist_summary.modal.total_visit'),
      render: (item) => (item.isMissing ? '-' : item.visit || '0'),
    },
    {
      key: 'distance',
      label: translate('common.distance'),
      render: (item) =>
        item.isMissing
          ? '-'
          : item.distance
            ? item.distance.toLocaleString(localeCode, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })
            : '0',
    },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} subtitle={subtitle} maxWidth="max-w-3xl">
      <div className="p-0">
        <div className="overflow-x-auto border border-gray-200 dark:border-slate-700 rounded-lg">
          <table className="min-w-full text-sm text-left">
            <thead className="bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-200 font-bold border-b border-gray-200 dark:border-slate-700">
              <tr>
                <th className="px-4 py-3 text-center">#</th>
                {columns.map((col) => (
                  <th key={col.key} className="px-4 py-3 text-center">
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100 dark:divide-slate-700 bg-white dark:bg-slate-900">
              {data.map((item, idx) => (
                <tr
                  key={idx}
                  className="hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <td
                    className={`px-4 py-2 text-center ${item.isMissing ? 'text-red-500 font-bold' : 'text-slate-700 dark:text-slate-300'}`}
                  >
                    {idx + 1}
                  </td>

                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-4 py-2 text-center ${item.isMissing ? 'text-red-500 font-bold' : 'text-slate-700 dark:text-slate-300'}`}
                    >
                      {col.render(item)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Modal>
  );
}
