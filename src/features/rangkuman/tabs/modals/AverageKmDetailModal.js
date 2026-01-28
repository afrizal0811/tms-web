// File: src/features/rangkuman/tabs/modals/AverageKmDetailModal.js
'use client';

import BaseModal from '@/components/BaseModal';

export default function AverageKmDetailModal({ isOpen, onClose, data, title, translate }) {
  if (!isOpen || !data) return null;

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title={title} maxWidth="max-w-3xl">
      <div className="p-0">
        <div className="overflow-x-auto border border-gray-200 rounded-lg">
          <table className="min-w-full text-sm text-left">
            <thead className="bg-gray-100 text-gray-700 font-bold border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-center w-12">#</th>
                <th className="px-4 py-3 text-center">{translate('common.number_plates')}</th>
                <th className="px-4 py-3 text-center">{translate('common.driver')}</th>
                <th className="px-4 py-3 text-center">
                  {translate('summary.tabs.average_km.modal.total_visit')}
                </th>
                <th className="px-4 py-3 text-center">
                  {translate('summary.tabs.average_km.modal.distance')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.map((item, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-center text-gray-500 font-medium">{idx + 1}</td>
                  <td className="px-4 py-2 text-left font-semibold text-slate-700">
                    {item.plate || '-'}
                  </td>
                  <td className="px-4 py-2 text-left text-slate-600">{item.driverName || '-'}</td>
                  <td className="px-4 py-2 text-center text-slate-600">{item.visit || '-'}</td>
                  <td className="px-4 py-2 text-center font-bold text-slate-700">
                    {item.distance
                      ? item.distance.toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })
                      : '0'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Tombol Tutup dihapus sesuai permintaan */}
      </div>
    </BaseModal>
  );
}
