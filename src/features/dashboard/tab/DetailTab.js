'use client';

import Dropdown from '@/components/Dropdown';
import HighlightText from '@/components/HighlightText';
import SearchBar from '@/components/SearchBar';
import Spinner from '@/components/Spinner';
import Td from '@/components/table/Td';
import Th from '@/components/table/Th';
import Tooltip from '@/components/Tooltip';
import { useLanguage } from '@/context/LanguageContext';
import { forwardRef, useState } from 'react';

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

const TableData = ({ data, headers, renderRow, loading, headerFilters }) => {
  const { t } = useLanguage();

  return (
    <div className="bg-white border border-gray-100 rounded-lg overflow-hidden flex flex-col h-[768px] dark:border-slate-700 dark:bg-slate-800/75 shadow-md dark:shadow-slate-700/40">
      <div className="bg-gray-100 p-3 border-b dark:bg-slate-900 dark:border-slate-700 flex justify-between items-center ">
        {headerFilters}
      </div>

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
                    widthClass="w-[5%]"
                  >
                    {headerItem}
                  </Th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100 dark:divide-gray-700!">
              {data.map((tItem, i) => (
                <tr key={i} className="hover:bg-gray-100 dark:hover:bg-slate-700/10!">
                  {renderRow(tItem)}
                </tr>
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
  const [activeTable, setActiveTable] = useState('unassigned');
  const [searchQuery, setSearchQuery] = useState('');

  const totalDry = summaryData?.totalDry ?? 0;
  const totalFrozen = summaryData?.totalFrozen ?? 0;
  const assignedDry = summaryData?.assignedDry ?? 0;
  const assignedFrozen = summaryData?.assignedFrozen ?? 0;

  const tableOptions = [
    { label: t('dashboard.tab.detail.unassigned'), value: 'unassigned' },
    { label: t('common.status.manual_assign'), value: 'manual' },
    { label: t('dashboard.tab.detail.diff_day'), value: 'diff_day' },
    { label: t('common.status.success'), value: 'success' },
    { label: t('common.status.partial'), value: 'partial' },
    { label: t('common.status.pending'), value: 'pending' },
    { label: t('common.status.cancel'), value: 'cancel' },
    { label: t('common.status.pending_gr'), value: 'pending_gr' },
  ];

  const baseHeaders = [
    t('common.flow'),
    t('common.customer_name'),
    t('common.invoice_number'),
    t('common.driver'),
  ];

  const unassignedRenderRow = (item) => (
    <>
      <Td className="p-3 text-xs">{item.flow}</Td>
      <Td className="p-3 text-xs">
        <HighlightText text={item.customer} highlight={searchQuery} />
      </Td>
      <Td className="p-3 text-xs">
        <Tooltip tooltipContent={item.soNumber}>
          <span className="cursor-help block">
            <HighlightText text={item.truncateSoNumber} highlight={searchQuery} />
          </span>
        </Tooltip>
      </Td>
    </>
  );

  const baseRenderRow = (item) => (
    <>
      <Td className="p-3 text-xs">{item.flow}</Td>
      <Td className="p-3 text-xs">
        <HighlightText text={item.customer} highlight={searchQuery} />
      </Td>
      <Td className="p-3 text-xs">
        <Tooltip tooltipContent={item.soNumber}>
          <span className="cursor-help block">
            <HighlightText text={item.truncateSoNumber} highlight={searchQuery} />
          </span>
        </Tooltip>
      </Td>
      <Td className="p-3 text-xs">
        <HighlightText text={item.driver} highlight={searchQuery} />
      </Td>
    </>
  );

  const diffDayRenderRow = (item) => (
    <>
      <Td className="p-3 text-xs">{item.flow}</Td>
      <Td className="p-3 text-xs">
        <HighlightText text={item.customer} highlight={searchQuery} />
      </Td>
      <Td className="p-3 text-xs">
        <Tooltip tooltipContent={item.soNumber}>
          <span className="cursor-help block">
            <HighlightText text={item.truncateSoNumber} highlight={searchQuery} />
          </span>
        </Tooltip>
      </Td>
      <Td className="p-3 text-xs">
        <HighlightText text={item.driver} highlight={searchQuery} />
      </Td>
      <Td className="p-3 text-xs text-red-500">{item.doneDateDisplay}</Td>
    </>
  );

  const tableConfig = {
    unassigned: {
      data: summaryData?.unassignedList,
      headers: baseHeaders.slice(0, -1),
      renderRow: unassignedRenderRow,
    },
    manual: {
      data: summaryData?.manualAssignList,
      headers: baseHeaders,
      renderRow: baseRenderRow,
    },
    diff_day: {
      data: summaryData?.diffDayList,
      headers: [...baseHeaders, t('dashboard.tab.detail.done_date')],
      renderRow: diffDayRenderRow,
    },
    success: {
      data: summaryData?.successList,
      headers: baseHeaders,
      renderRow: baseRenderRow,
    },
    partial: {
      data: summaryData?.partialList,
      headers: baseHeaders,
      renderRow: baseRenderRow,
    },
    pending: {
      data: summaryData?.pendingList,
      headers: baseHeaders,
      renderRow: baseRenderRow,
    },
    cancel: {
      data: summaryData?.cancelList,
      headers: baseHeaders,
      renderRow: baseRenderRow,
    },
    pending_gr: {
      data: summaryData?.pendingGrList,
      headers: baseHeaders,
      renderRow: baseRenderRow,
    },
  };

  const {
    data: currentData,
    headers: currentHeaders,
    renderRow,
  } = tableConfig[activeTable] || tableConfig.unassigned;

  const filteredData = (currentData || []).filter((item) => {
    if (!searchQuery) return true;
    const lowerQ = searchQuery.toLowerCase();
    const matchCust = (item.customer || '').toLowerCase().includes(lowerQ);
    const matchSo = (item.soNumber || '').toLowerCase().includes(lowerQ);
    const matchDriver = (item.driver || '').toLowerCase().includes(lowerQ);
    return matchCust || matchSo || matchDriver;
  });

  const headerFilters = (
    <div className="flex flex-col sm:flex-row gap-3 w-full justify-between">
      <Dropdown
        options={tableOptions}
        value={activeTable}
        onChange={(val) => {
          setActiveTable(val);
          setSearchQuery('');
        }}
        getLabel={(val) => tableOptions.find((o) => o.value === val)?.label}
        className="w-full sm:w-[200px] shrink-0"
      />
      <SearchBar
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder={t('common.search')}
        width="w-full sm:flex-1 sm:max-w-[300px]"
      />
    </div>
  );
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

        <div className="lg:col-span-2 lg:order-1 flex flex-col gap-6">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-min">
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
              tooltipContent={t('dashboard.tab.detail.tooltip.ongoing')}
            />
            <StatCard
              title={t('common.status.done')}
              value={summaryData?.done}
              isLoading={loading}
              tooltipContent={t('dashboard.tab.detail.tooltip.done')}
            />
            <StatCard
              title={t('common.status.success')}
              value={summaryData?.success}
              isLoading={loading}
              tooltipContent={t('dashboard.tab.detail.tooltip.success')}
            />
            <StatCard
              title={t('common.status.partial')}
              value={summaryData?.partial}
              isLoading={loading}
              tooltipContent={t('dashboard.tab.detail.tooltip.partial')}
            />
            <StatCard
              title={t('common.status.pending')}
              value={summaryData?.pending}
              isLoading={loading}
              tooltipContent={t('dashboard.tab.detail.tooltip.pending')}
            />
            <StatCard
              title={t('common.status.cancel')}
              value={summaryData?.cancel}
              isLoading={loading}
              tooltipContent={t('dashboard.tab.detail.tooltip.cancel')}
            />
            <StatCard
              title={t('common.status.pending_gr')}
              value={summaryData?.pendingGr}
              isLoading={loading}
              tooltipContent={t('dashboard.tab.detail.tooltip.pending_gr')}
            />
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-min">
            <StatCard
              title={t('common.status.manual_assign')}
              value={summaryData?.manualAssignList?.length}
              isLoading={loading}
              tooltipContent={t('dashboard.tab.detail.tooltip.manual')}
            />
            <StatCard
              title={t('dashboard.tab.detail.diff_day')}
              value={summaryData?.diffDayList?.length}
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
          </div>
        </div>

        <div className="lg:col-span-2 lg:order-3 flex flex-col gap-6">
          <TableData
            data={filteredData}
            loading={loading}
            headers={currentHeaders}
            renderRow={renderRow}
            headerFilters={headerFilters}
          />
        </div>
      </div>
    </div>
  );
}
