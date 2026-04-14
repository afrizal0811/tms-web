// File: src/features/dashboard/components/DetailTab.js
'use client';

import Spinner from '@/components/Spinner';
import Tooltip from '@/components/Tooltip';
import { useLanguage } from '@/context/LanguageContext';
import { toastError, toastSuccess, toastWarning } from '@/lib/toastHelper';
import { forwardRef } from 'react';

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

export default function DetailTab({ loading, summaryData }) {
  const { t, lang } = useLanguage();

  const handleCopy = (task) => {
    const isIndo = lang === 'id';
    const copyText = isIndo
      ? `${t('dashboard.copy')} ${t('dashboard.tab.detail.so_number')}`
      : `${t('dashboard.tab.detail.so_number')} ${t('dashboard.copy')}`;

    if (!task.soNumber) {
      toastWarning(t('dashboard.empty_so'));
      return;
    }
    navigator.clipboard.writeText(task.soNumber).then(
      () => {
        toastSuccess(copyText);
      },
      (err) => {
        toastError(t('dashboard.unable_copy'), err);
      }
    );
  };

  const totalDry = summaryData?.totalDry ?? 0;
  const totalFrozen = summaryData?.totalFrozen ?? 0;
  const assignedDry = summaryData?.assignedDry ?? 0;
  const assignedFrozen = summaryData?.assignedFrozen ?? 0;

  return (
    <div className="space-y-10 animate-in fade-in duration-300 h-full flex flex-col flex-1 overflow-auto pb-2">
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
                <div>{t('dashboard.tab.detail.tooltip.total_task')}</div>
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
                <div>{t('dashboard.tab.detail.tooltip.total_assigned')}</div>
                <div>Total Dry : {assignedDry}</div>
                <div>Total Frozen : {assignedFrozen}</div>
              </div>
            }
          />
        </div>

        {/* Grid kecil */}
        <div className="lg:col-span-2 lg:order-1 grid grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-min">
          <StatCard
            title={t('dashboard.tab.detail.unassigned')}
            value={summaryData?.unassigned}
            isLoading={loading}
            tooltipContent={t('dashboard.tab.detail.tooltip.unassigned')}
          />
          <StatCard
            title={t('dashboard.tab.detail.ongoing')}
            value={summaryData?.ongoing}
            isLoading={loading}
            tooltipContent={t('dashboard.tab.detail.tooltip.ongoing')}
          />
          <StatCard
            title={t('dashboard.tab.detail.done')}
            value={summaryData?.done}
            isLoading={loading}
            tooltipContent={t('dashboard.tab.detail.tooltip.done')}
          />
          <StatCard
            title={t('dashboard.tab.detail.manual')}
            value={summaryData?.manualAssignList?.length}
            isLoading={loading}
            tooltipContent={t('dashboard.tab.detail.tooltip.manual')}
          />
          <StatCard
            title={t('dashboard.tab.detail.diff_day')}
            value={summaryData?.crossDayTasks?.length}
            isLoading={loading}
            tooltipContent={t('dashboard.tab.detail.tooltip.diff_day')}
          />
          <StatCard
            title={t('dashboard.tab.detail.delivery')}
            value={summaryData?.flowDelivery}
            isLoading={loading}
            tooltipContent={t('dashboard.tab.detail.tooltip.delivery')}
          />
          <StatCard
            title={t('dashboard.tab.detail.redelivery')}
            value={summaryData?.flowReDelivery}
            isLoading={loading}
            tooltipContent={t('dashboard.tab.detail.tooltip.redelivery')}
          />
          <StatCard
            title={t('dashboard.tab.detail.pending_gr')}
            value={summaryData?.flowPendingGR}
            isLoading={loading}
            tooltipContent={t('dashboard.tab.detail.tooltip.pending_gr')}
          />
        </div>

        {/* List Data */}
        <div className="lg:col-span-2 lg:order-3 flex flex-col gap-6">
          {/* Unassigned */}
          <div className="bg-white shadow border border-gray-100 rounded-lg overflow-hidden flex flex-col h-64">
            <h3 className="text-sm font-bold text-gray-700 bg-gray-50 p-3 border-b">
              {t('dashboard.tab.detail.unassigned_list')}
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
                        {t('dashboard.tab.detail.flow')}
                      </th>
                      <th className="p-3 text-left text-xs font-semibold text-gray-600 uppercase">
                        {t('common.customer_name')}
                      </th>
                      <th className="p-3 text-left text-xs font-semibold text-gray-600 uppercase">
                        {t('dashboard.tab.detail.so_number')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {summaryData.unassignedList.map((t, i) => (
                      <Tooltip key={i} tooltipContent={t.truncateSoNumber}>
                        <tr
                          key={i}
                          className="hover:bg-gray-50 cursor-copy"
                          onClick={() => handleCopy(t)}
                        >
                          <td className="p-3 text-xs">{t.flow}</td>
                          <td className="p-3 text-xs">{t.customer}</td>
                          <td className="p-3 text-xs">{t.truncateSoNumber}</td>
                        </tr>
                      </Tooltip>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-4 text-center text-xs text-gray-400 grow flex items-center justify-center">
                {t('common.no_data')}
              </div>
            )}
          </div>

          {/* Manual Assign */}
          <div className="bg-white shadow border border-gray-100 rounded-lg overflow-hidden flex flex-col h-64">
            <h3 className="text-sm font-bold text-gray-700 bg-gray-50 p-3 border-b">
              {t('dashboard.tab.detail.manual_list')}
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
                        {t('dashboard.tab.detail.flow')}
                      </th>
                      <th className="p-3 text-left text-xs font-semibold text-gray-600 uppercase">
                        {t('common.customer_name')}
                      </th>
                      <th className="p-3 text-left text-xs font-semibold text-gray-600 uppercase">
                        {t('common.driver')}
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100">
                    {summaryData.manualAssignList.map((t, i) => (
                      <Tooltip key={i} tooltipContent={t.truncateSoNumber}>
                        <tr
                          key={i}
                          className="hover:bg-gray-50 cursor-copy"
                          onClick={() => handleCopy(t)}
                        >
                          <td className="p-3 text-xs">{t.flow}</td>
                          <td className="p-3 text-xs">{t.customer}</td>
                          <td className="p-3 text-xs font-semibold">{t.driver}</td>
                        </tr>
                      </Tooltip>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-4 text-center text-xs text-gray-400 grow flex items-center justify-center">
                {t('common.no_data')}
              </div>
            )}
          </div>

          {/* Cross Day */}
          <div className="bg-white shadow border border-gray-100 rounded-lg overflow-hidden flex flex-col h-64">
            <h3 className="text-sm font-bold text-gray-700 bg-gray-50 p-3 border-b">
              {t('dashboard.tab.detail.diff_day_list')}
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
                        {t('common.customer_name')}
                      </th>
                      <th className="p-3 text-left text-xs font-semibold text-gray-600 uppercase">
                        {t('dashboard.tab.detail.done_date')}
                      </th>
                      <th className="p-3 text-left text-xs font-semibold text-gray-600 uppercase">
                        {t('common.driver')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {summaryData.crossDayTasks.map((t, i) => (
                      <Tooltip key={i} tooltipContent={t.truncateSoNumber}>
                        <tr
                          key={i}
                          className="hover:bg-gray-50 cursor-copy"
                          onClick={() => handleCopy(t)}
                        >
                          <td className="p-3 text-xs">{t.customer}</td>
                          <td className="p-3 text-xs text-red-500">{t.doneDateDisplay}</td>
                          <td className="p-3 text-xs">{t.driver}</td>
                        </tr>
                      </Tooltip>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-4 text-center text-xs text-gray-400 grow flex items-center justify-center">
                {t('common.no_data')}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
