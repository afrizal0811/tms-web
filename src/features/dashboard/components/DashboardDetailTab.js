// File: src/features/dashboard/components/DashboardDetailTab.js
'use client';

import React, { forwardRef } from 'react';
import Spinner from '@/components/Spinner';
import Tooltip from '@/components/Tooltip';
import { toastError, toastSuccess, toastWarning } from '@/lib/toastHelper';

const StatCard = forwardRef(function StatCard(
  { title, value, isLoading, className = '', valueClassName = '', tooltipContent },
  ref
) {
  const cardElement = (
    <div ref={ref} className={`bg-white shadow-md rounded-lg p-6 ${className}`}>
      <h3 className="text-sm font-medium text-gray-500">{title}</h3>
      {isLoading ? (
        <div className="mt-2 h-8 w-12 bg-gray-200 animate-pulse rounded" />
      ) : (
        <p className={`mt-1 text-3xl font-semibold text-gray-900 ${valueClassName}`}>{value}</p>
      )}
    </div>
  );

  if (tooltipContent) {
    return <Tooltip tooltipContent={tooltipContent}>{cardElement}</Tooltip>;
  }
  return cardElement;
});
StatCard.displayName = 'StatCard';

// ========== MAIN DETAIL TAB ==========

export default function DashboardDetailTab({ loading, summaryData }) {
  const handleCopy = (task) => {
    if (!task.copyValue) {
      toastWarning('Tidak ada nomor SO untuk disalin');
      return;
    }
    navigator.clipboard.writeText(task.copyValue).then(
      () => {
        toastSuccess(`Salin: ${task.tooltip}`);
      },
      (err) => {
        toastError('Gagal menyalin ke clipboard');
      }
    );
  };

  const totalDry = summaryData?.totalDry ?? 0;
  const totalFrozen = summaryData?.totalFrozen ?? 0;
  const assignedDry = summaryData?.assignedDry ?? 0;
  const assignedFrozen = summaryData?.assignedFrozen ?? 0;

  return (
    <div className="space-y-10 animate-in fade-in duration-300">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Total & Assigned */}
        <div className="lg:col-span-1 lg:order-2 flex flex-col gap-6">
          <StatCard
            title="Total Task"
            value={summaryData?.totalTasks}
            isLoading={loading}
            className="flex flex-col items-center justify-center text-center h-full min-h-[150px]"
            valueClassName="text-5xl"
            tooltipContent={
              <div className="space-y-1 text-xs">
                <div>Total semua task (Selesai, Berjalan, &amp; Belum Assign).</div>
                <div>Total Dry : {totalDry}</div>
                <div>Total Frozen : {totalFrozen}</div>
              </div>
            }
          />
          <StatCard
            title="Task Ter-assign"
            value={summaryData?.assignedTasks}
            isLoading={loading}
            className="flex flex-col items-center justify-center text-center h-full min-h-[150px]"
            valueClassName="text-5xl"
            tooltipContent={
              <div className="space-y-1 text-xs">
                <div>Total task yang sudah di-assign ke driver.</div>
                <div>Total Dry : {assignedDry}</div>
                <div>Total Frozen : {assignedFrozen}</div>
              </div>
            }
          />
        </div>

        {/* Grid kecil */}
        <div className="lg:col-span-2 lg:order-1 grid grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-min">
          <StatCard
            title="Belum Assign"
            value={summaryData?.unassigned}
            isLoading={loading}
            tooltipContent="Jumlah task 'UNASSIGNED'."
          />
          <StatCard
            title="Berjalan"
            value={summaryData?.ongoing}
            isLoading={loading}
            tooltipContent="Jumlah task 'ONGOING'."
          />
          <StatCard
            title="Selesai"
            value={summaryData?.done}
            isLoading={loading}
            tooltipContent="Jumlah task 'DONE'."
          />
          <StatCard
            title="Manual Assign"
            value={summaryData?.manualAssignList?.length}
            isLoading={loading}
            tooltipContent="Task tanpa proses routing."
          />
          <StatCard
            title="Beda Hari"
            value={summaryData?.crossDayTasks?.length}
            isLoading={loading}
            tooltipContent="Task selesai di hari berbeda."
          />
          <StatCard
            title="Delivery"
            value={summaryData?.flowDelivery}
            isLoading={loading}
            tooltipContent="Flow 'Delivery'."
          />
          <StatCard
            title="Re-Delivery"
            value={summaryData?.flowReDelivery}
            isLoading={loading}
            tooltipContent="Flow 'Re Delivery'."
          />
          <StatCard
            title="Pending GR"
            value={summaryData?.flowPendingGR}
            isLoading={loading}
            tooltipContent="Flow 'Pending GR'."
          />
        </div>

        {/* List Data */}
        <div className="lg:col-span-2 lg:order-3 flex flex-col gap-6">
          {/* Unassigned */}
          <div className="bg-white shadow border border-gray-100 rounded-lg overflow-hidden flex flex-col h-64">
            <h3 className="text-sm font-bold text-gray-700 bg-gray-50 p-3 border-b">
              Daftar Belum Assign
            </h3>
            {loading ? (
              <div className="flex justify-center items-center grow">
                <Spinner />
              </div>
            ) : summaryData?.unassignedList?.length > 0 ? (
              <div className="overflow-y-auto grow">
                <table className="min-w-full">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="p-3 text-left text-xs font-semibold text-gray-600 uppercase">
                        Flow
                      </th>
                      <th className="p-3 text-left text-xs font-semibold text-gray-600 uppercase">
                        Customer Name
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {summaryData.unassignedList.map((t, i) => (
                      <tr
                        key={i}
                        className="hover:bg-gray-50 cursor-copy"
                        onClick={() => handleCopy(t)}
                      >
                        <td className="p-3 text-xs">{t.flow}</td>
                        <td className="p-3 text-xs">{t.customer}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-4 text-center text-xs text-gray-400 grow flex items-center justify-center">
                Kosong
              </div>
            )}
          </div>

          {/* Manual Assign */}
          <div className="bg-white shadow border border-gray-100 rounded-lg overflow-hidden flex flex-col h-64">
            <h3 className="text-sm font-bold text-gray-700 bg-gray-50 p-3 border-b">
              Daftar Manual Assign
            </h3>
            {loading ? (
              <div className="flex justify-center items-center grow">
                <Spinner />
              </div>
            ) : summaryData?.manualAssignList?.length > 0 ? (
              <div className="overflow-y-auto grow">
                <table className="min-w-full">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="p-3 text-left text-xs font-semibold text-gray-600 uppercase">
                        Flow
                      </th>
                      <th className="p-3 text-left text-xs font-semibold text-gray-600 uppercase">
                        Customer Name
                      </th>
                      <th className="p-3 text-left text-xs font-semibold text-gray-600 uppercase">
                        Driver
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100">
                    {summaryData.manualAssignList.map((t, i) => (
                      <tr
                        key={i}
                        className="hover:bg-gray-50 cursor-copy"
                        onClick={() => handleCopy(t)}
                      >
                        <td className="p-3 text-xs">{t.flow}</td>
                        <td className="p-3 text-xs">{t.customer}</td>
                        <td className="p-3 text-xs font-semibold">{t.driver}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-4 text-center text-xs text-gray-400 grow flex items-center justify-center">
                Kosong
              </div>
            )}
          </div>

          {/* Cross Day */}
          <div className="bg-white shadow border border-gray-100 rounded-lg overflow-hidden flex flex-col h-64">
            <h3 className="text-sm font-bold text-gray-700 bg-gray-50 p-3 border-b">
              Daftar Beda Hari
            </h3>
            {loading ? (
              <div className="flex justify-center items-center grow">
                <Spinner />
              </div>
            ) : summaryData?.crossDayTasks?.length > 0 ? (
              <div className="overflow-y-auto grow">
                <table className="min-w-full">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="p-3 text-left text-xs font-semibold text-gray-600 uppercase">
                        Customer Name
                      </th>
                      <th className="p-3 text-left text-xs font-semibold text-gray-600 uppercase">
                        Tgl. Selesai
                      </th>
                      <th className="p-3 text-left text-xs font-semibold text-gray-600 uppercase">
                        Driver
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {summaryData.crossDayTasks.map((t, i) => (
                      <tr
                        key={i}
                        className="hover:bg-gray-50 cursor-copy"
                        onClick={() => handleCopy(t)}
                      >
                        <td className="p-3 text-xs">{t.customer}</td>
                        <td className="p-3 text-xs text-red-500">{t.doneDateDisplay}</td>
                        <td className="p-3 text-xs">{t.driver}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-4 text-center text-xs text-gray-400 grow flex items-center justify-center">
                Kosong
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
