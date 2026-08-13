'use client';

import { isEmpty } from '@/lib/utils';
import { useState } from 'react';
import CustomerHistoryModal from '../modal/CustomerHistoryModal';

export default function TableData({ data, historyMap, selectedDate, t, localeCode }) {
  const [selectedRow, setSelectedRow] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleRowClick = (row) => {
    setSelectedRow(row);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedRow(null);
  };

  const currentHistory = selectedRow ? historyMap.get(selectedRow.customerData) || [] : [];

  return (
    <>
      <div className="flex flex-col h-full space-y-4">
        {isEmpty(data) ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400 border rounded-lg bg-gray-50">
            <p>{t('common.no_data')}</p>
          </div>
        ) : (
          <div className="overflow-auto h-full rounded-lg bg-white dark:bg-slate-800">
            <table className="min-w-full text-xs text-left">
              <thead className="bg-gray-100 font-bold text-gray-700 sticky top-0 z-10 shadow-sm dark:bg-slate-900">
                <tr className="dark:text-slate-300 text-center">
                  <th className="px-4 py-3 w-[5%]">No</th>
                  <th className="px-4 py-3 w-[20%]">{t('common.invoice_number')}</th>
                  <th className="px-4 py-3 w-[20%]">{t('common.customer_name')}</th>
                  <th className="px-4 py-3 w-[10%]">{t('common.customer_id')}</th>
                  <th className="px-4 py-3 w-[10%]">{t('common.location_id')}</th>
                  <th className="px-4 py-3 w-[20%]">{t('longlat.table.new_longlat')}</th>
                  <th className="px-4 py-3 w-[5%]">{t('common.dist_diff')}</th>
                  <th className="px-4 py-3 w-[15%]">{t('common.driver')}</th>
                  <th className="px-4 py-3 w-[10%]">{t('longlat.table.update_time')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.map((row, index) => {
                  const displayCustId = row.isIncomplete ? '-' : row.customerId || '-';
                  const displayLocId = row.isIncomplete ? '-' : row.locationId || '-';

                  const rowClass = row.isIncomplete
                    ? 'bg-red-100 hover:bg-red-200 cursor-pointer'
                    : 'hover:bg-gray-50 cursor-pointer dark:hover:bg-slate-700/10';

                  return (
                    <tr
                      className={`${rowClass} border-b border-gray-100 transition-colors dark:border-slate-800/70 text-center`}
                      onClick={() => handleRowClick(row)}
                      key={`${row.customerData}-${index}`}
                    >
                      <td className="px-4 py-2 text-gray-600 dark:text-slate-300">{index + 1}</td>
                      <td className="px-4 py-2 text-gray-600 truncate text-left max-w-[200px] dark:text-slate-300">
                        {row.soNumber}
                      </td>
                      <td className="px-4 py-2 truncate text-left max-w-[200px] dark:text-slate-300">
                        {row.customerName}
                      </td>
                      <td className="px-4 py-2 text-slate-700 dark:text-slate-300">
                        {displayCustId}
                      </td>
                      <td className="px-4 py-2 text-slate-700 dark:text-slate-300">
                        {displayLocId}
                      </td>
                      <td className="px-4 py-2 font-mono text-slate-700 dark:text-slate-300">
                        {row.newLonglat}
                      </td>
                      <td className="px-4 py-2 dark:text-slate-300">
                        {row.distanceDiff?.toLocaleString(localeCode)}
                      </td>
                      <td className="px-4 py-2 text-left text-slate-700 dark:text-slate-300">
                        {row.driverName}
                      </td>
                      <td className="px-4 py-2 text-slate-700 dark:text-slate-300">
                        {row.updateTime}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {isModalOpen && (
        <CustomerHistoryModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          data={currentHistory}
          customerData={selectedRow?.customerData}
          selectedDate={selectedDate}
        />
      )}
    </>
  );
}
