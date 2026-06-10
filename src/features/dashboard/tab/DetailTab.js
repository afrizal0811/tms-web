'use client';

import Spinner from '@/components/Spinner';
import Td from '@/components/table/Td';
import Th from '@/components/table/Th';
import Tooltip from '@/components/Tooltip';
import { useLanguage } from '@/context/LanguageContext';
import { toastError, toastSuccess, toastWarning } from '@/lib/toast';
import { forwardRef } from 'react';

const StatCard = forwardRef(function StatCard(
  { title, value, isLoading, className = '', valueClassName = '', tooltipContent },
  ref
) {
  const cardElement = (
    <div
      ref={ref}
      className={`bg-white dark:bg-slate-800 p-6 rounded-lg border border-gray-200 dark:border-slate-700 shadow-md dark:shadow-slate-700/40 hover:bg-gray-50 dark:hover:bg-slate-700/10 cursor-help ${className}`}
    >
      <h3 className="text-sm font-medium text-gray-500 dark:text-slate-400">{title}</h3>
      {isLoading ? (
        <div className="mt-2 h-8 w-12 bg-gray-200 animate-pulse rounded" />
      ) : (
        <p
          className={`mt-1 text-3xl font-semibold text-gray-900 dark:text-slate-200 ${valueClassName}`}
        >
          {value}
        </p>
      )}
    </div>
  );

  if (tooltipContent) {
    return <Tooltip tooltipContent={tooltipContent}>{cardElement}</Tooltip>;
  }
  return cardElement;
});
StatCard.displayName = 'StatCard';

const TableData = ({ title, data, headers, renderRow, loading }) => {
  const { t, isIndonesian } = useLanguage();

  const handleCopy = (task) => {
    const copyText = isIndonesian
      ? `${t('dashboard.copy')} ${t('common.so_number')}`
      : `${t('common.so_number')} ${t('dashboard.copy')}`;

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

  return (
    <div className="bg-white border border-gray-100 rounded-lg overflow-hidden flex flex-col h-64 dark:border-slate-700 dark:bg-slate-800/75 shadow-md dark:shadow-slate-700/40">
      <h3 className="text-sm font-bold text-gray-700 bg-gray-100 p-3 border-b dark:bg-slate-900 dark:text-slate-200 dark:border-slate-700">
        {title}
      </h3>

      {loading ? (
        <div className="flex justify-center items-center grow">
          <Spinner />
        </div>
      ) : data?.length > 0 ? (
        <div className="overflow-y-auto grow ">
          <table className="min-w-full">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                {headers.map((headerItem, index) => (
                  <Th
                    key={index}
                    className="p-3 text-left text-xs font-semibold text-gray-600 uppercase"
                  >
                    {headerItem}
                  </Th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100 dark:divide-gray-700!">
              {data.map((tItem, i) => (
                <Tooltip key={i} tooltipContent={tItem.truncateSoNumber}>
                  <tr
                    className="hover:bg-gray-100 dark:hover:bg-slate-700/10! cursor-copy "
                    onClick={() => handleCopy(tItem)}
                  >
                    {renderRow(tItem)}
                  </tr>
                </Tooltip>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-4 text-center text-xs text-gray-400 grow flex items-center justify-center dark:border-slate-700">
          {t('common.no_data')}
        </div>
      )}
    </div>
  );
};

export default function DetailTab({ loading, summaryData }) {
  const { t } = useLanguage();

  const totalDry = summaryData?.totalDry ?? 0;
  const totalFrozen = summaryData?.totalFrozen ?? 0;
  const assignedDry = summaryData?.assignedDry ?? 0;
  const assignedFrozen = summaryData?.assignedFrozen ?? 0;

  return (
    <div className="space-y-10 animate-in fade-in duration-300 h-full flex flex-col flex-1 overflow-auto pb-2 dark:bg-slate-800">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
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

        <div className="lg:col-span-2 lg:order-1 grid grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-min">
          <StatCard
            title={t('dashboard.tab.detail.unassigned')}
            value={summaryData?.unassigned}
            isLoading={loading}
            tooltipContent={t('dashboard.tab.detail.tooltip.unassigned')}
          />
          <StatCard
            title={t('common.status.ongoing')}
            value={summaryData?.ongoing}
            isLoading={loading}
            tooltipContent={t('common.status.ongoing')}
          />
          <StatCard
            title={t('common.status.done')}
            value={summaryData?.done}
            isLoading={loading}
            tooltipContent={t('common.status.done')}
          />
          <StatCard
            title={t('common.status.manual_assign')}
            value={summaryData?.manualAssignList?.length}
            isLoading={loading}
            tooltipContent={t('common.status.manual_assign')}
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

        {/* List Data - Menggunakan TableData yang sudah diperbaiki */}
        <div className="lg:col-span-2 lg:order-3 flex flex-col gap-6">
          <TableData
            title={t('dashboard.tab.detail.unassigned_list')}
            data={summaryData?.unassignedList}
            loading={loading}
            headers={[t('common.flow'), t('common.customer_name'), t('common.so_number')]}
            renderRow={(item) => (
              <>
                <Td className="p-3 text-xs">{item.flow}</Td>
                <Td className="p-3 text-xs">{item.customer}</Td>
                <Td className="p-3 text-xs">{item.truncateSoNumber}</Td>
              </>
            )}
          />

          <TableData
            title={t('dashboard.tab.detail.manual_list')}
            data={summaryData?.manualAssignList}
            loading={loading}
            headers={[t('common.flow'), t('common.customer_name'), t('common.driver')]}
            renderRow={(item) => (
              <>
                <Td className="p-3 text-xs">{item.flow}</Td>
                <Td className="p-3 text-xs">{item.customer}</Td>
                <Td className="p-3 text-xs">{item.driver}</Td>
              </>
            )}
          />

          <TableData
            title={t('dashboard.tab.detail.diff_day_list')}
            data={summaryData?.crossDayTasks}
            loading={loading}
            headers={[
              t('common.customer_name'),
              t('dashboard.tab.detail.done_date'),
              t('common.driver'),
            ]}
            renderRow={(item) => (
              <>
                <Td className="p-3 text-xs">{item.customer}</Td>
                <Td className="p-3 text-xs text-red-500">{item.doneDateDisplay}</Td>
                <Td className="p-3 text-xs">{item.driver}</Td>
              </>
            )}
          />
        </div>
      </div>
    </div>
  );
}
