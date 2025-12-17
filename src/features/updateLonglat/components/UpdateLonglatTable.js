// File: src/features/updateLonglat/components/UpdateLonglatTable.js
'use client';

import { useState } from 'react';
import CustomerHistoryModal from '../modal/CustomerHistoryModal';

export default function UpdateLonglatTable({ data, historyMap, historyRange }) {
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
            <p>Tidak ada data update lokasi (klikLokasiClient) ditemukan.</p>
          </div>
        ) : (
          <div className="overflow-auto h-full border rounded-lg shadow-sm bg-white">
            <table className="min-w-full text-xs text-left">
              <thead className="bg-gray-100 font-bold text-gray-700 sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="px-4 py-3 border-b w-[5%] text-center">No</th>
                  <th className="px-4 py-3 border-b w-[30%]">Customer Name</th>
                  <th className="px-4 py-3 border-b w-[15%]">Customer ID</th>
                  <th className="px-4 py-3 border-b w-[15%]">Location ID</th>
                  <th className="px-4 py-3 border-b w-[20%] text-center">New Longlat</th>
                  <th className="px-4 py-3 border-b w-[15%] text-center">Beda Jarak (m)</th>
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
                    <tr
                      key={index}
                      className={`${rowClass} border-b border-gray-100 transition-colors`}
                      onClick={() => handleRowClick(row)}
                      title="Klik untuk melihat riwayat update lokasi"
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
