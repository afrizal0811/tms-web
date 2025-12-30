// File: src/features/updateLonglat/components/UpdateLonglatTable.js
'use client';

import { useState } from 'react';
import CustomerHistoryModal from '../modal/CustomerHistoryModal';
import { useLanguage } from '@/context/LanguageContext';
import Tooltip from '@/components/Tooltip';

export default function UpdateLonglatTable({ data, historyMap, historyRange }) {
  const { t } = useLanguage();
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

  const currentHistory = selectedRow ? historyMap.get(selectedRow.customerName) || [] : [];

  return (
    <>
      <div className="flex flex-col h-full space-y-4">
        {data.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400 border rounded-lg bg-gray-50">
            <p>{t('longlat.table.no_data')}</p>
          </div>
        ) : (
          <div className="overflow-auto h-full rounded-lg    bg-white">
            <table className="min-w-full text-xs text-left">
              <thead className="bg-gray-100 font-bold text-gray-700 sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="px-4 py-3 w-[5%] text-center">No</th>
                  <th className="px-4 py-3 w-[30%]">{t('longlat.table.cust_name')}</th>
                  <th className="px-4 py-3 w-[15%]">{t('longlat.table.cust_id')}</th>
                  <th className="px-4 py-3 w-[15%]">{t('longlat.table.loc_id')}</th>
                  <th className="px-4 py-3 w-[20%] text-center">
                    {t('longlat.table.new_longlat')}
                  </th>
                  <th className="px-4 py-3 w-[15%] text-center">{t('longlat.table.diff_dist')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.map((row, index) => {
                  const displayCustId = row.isIncomplete ? '-' : row.customerId || '-';
                  const displayLocId = row.isIncomplete ? '-' : row.locationId || '-';

                  const rowClass = row.isIncomplete
                    ? 'bg-red-100 hover:bg-red-200 cursor-pointer'
                    : 'hover:bg-gray-50 cursor-pointer';

                  return (
                    <Tooltip tooltipContent={t('longlat.tooltip.table_detail')} key={index}>
                      <tr
                        className={`${rowClass} border-b border-gray-100 transition-colors`}
                        onClick={() => handleRowClick(row)}
                      >
                        <td className="px-4 py-2 text-center text-gray-600">{index + 1}</td>
                        <td
                          className="px-4 py-2 font-medium truncate max-w-[200px]"
                          title={row.customerName}
                        >
                          {row.customerName}
                        </td>
                        <td className="px-4 py-2 font-mono text-slate-700">{displayCustId}</td>
                        <td className="px-4 py-2 font-mono text-slate-700">{displayLocId}</td>
                        <td className="px-4 py-2 text-center font-mono text-slate-600 text-[11px]">
                          {row.newLonglat}
                        </td>
                        <td className="px-4 py-2 text-center font-semibold">
                          {row.bedaJarak?.toLocaleString('id-ID')} m
                        </td>
                      </tr>
                    </Tooltip>
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
          customerName={selectedRow?.customerName}
          dateRange={historyRange}
        />
      )}
    </>
  );
}
