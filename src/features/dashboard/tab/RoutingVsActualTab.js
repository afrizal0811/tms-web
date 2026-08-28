// File: src/features/dashboard/tab/RoutingVsActualTab.js
'use client';

import Button from '@/components/Button';
import HighlightText from '@/components/HighlightText';
import TaskModal from '@/components/modal/TaskModal';
import SearchBar from '@/components/SearchBar';
import Tooltip from '@/components/Tooltip';
import { useLanguage } from '@/context/LanguageContext';
import { getLocalStorage } from '@/lib/localStorageHandler';
import {
  downloadRoutingActualExcel,
  getRoutingActualColumns,
  processRoutingVsActualData,
} from '@/lib/routingActual';
import { toastError, toastWarning } from '@/lib/toast';
import { formatDateUniversal, isEmpty } from '@/lib/utils';
import { useMemo, useState } from 'react';
import RoutingMapModal from '../modals/RoutingMapModal';

export default function RoutingVsActualTab({ loading, tasks, results, drivers, selectedDate }) {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  const date = formatDateUniversal(selectedDate);

  const handleRowClick = (taskId) => {
    if (!taskId || taskId === '-') return;
    setSelectedTaskId(taskId);
    setIsTaskModalOpen(true);
  };

  const processedData = useMemo(() => {
    if (loading) return [];
    return processRoutingVsActualData({
      tasks,
      results,
      drivers,
      searchQuery,
      date,
    });
  }, [loading, tasks, results, drivers, searchQuery, date]);

  const handleDownload = async () => {
    if (isEmpty(processedData)) return;

    setIsDownloading(true);
    try {
      const { storedLocationAcronym, storedLocationName } = getLocalStorage();
      const hubLabel = storedLocationAcronym || storedLocationName || '';
      await new Promise((r) => setTimeout(r, 100));
      downloadRoutingActualExcel(processedData, t, selectedDate, hubLabel);
    } catch (e) {
      toastError(t('common.toast.error', { err: e.message }));
    } finally {
      setIsDownloading(false);
    }
  };

  const handleOpenMap = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      toastWarning(t('dashboard.toast.view_map_warning'));
    }
    setIsMapModalOpen(true);
  };

  const columns = getRoutingActualColumns(t);
  const searchPlaceholder = `${t('common.license_number')}, ${t('common.driver')}, ${t('common.customer_name')}`;

  return (
    <div className="flex-1 flex flex-col h-full space-y-4">
      <div className="flex flex-col md:flex-row w-full justify-end items-center gap-3 mb-2">
        <div className="w-full md:w-64 order-1">
          <SearchBar
            disabled={loading || isDownloading}
            onChange={(val) => setSearchQuery(val)}
            placeholder={`${t('common.search')} ${searchPlaceholder.toLocaleLowerCase()}`}
            value={searchQuery}
          />
        </div>
        <div className="w-full md:w-auto order-2">
          <Button
            disabled={loading || isDownloading || isEmpty(processedData)}
            onClick={handleOpenMap}
            text={t('dashboard.tab.routing_actual.show_map')}
          />
        </div>
        <div className="w-full md:w-auto order-3">
          <Button
            disabled={loading || isDownloading || isEmpty(processedData)}
            onClick={handleDownload}
            text={t('common.download')}
          />
        </div>
      </div>

      <div className="overflow-auto h-full border rounded-lg shadow-sm bg-white dark:border-slate-700 dark:bg-slate-800">
        <table className="min-w-full text-xs text-left ">
          <thead className="bg-gray-100 font-bold text-gray-700 sticky top-0 z-10 shadow-sm dark:bg-slate-900 dark:text-slate-700!">
            <tr className="text-gray-600 dark:text-slate-300">
              {columns.map((col, index) => (
                <th
                  key={index}
                  className={`px-4 py-3 border-b border-gray-300 dark:border-slate-700 text-center ${col.tooltip ? 'cursor-help' : ''} ${col.className || ''}`}
                >
                  <Tooltip tooltipContent={col.tooltip || ''} width={col.tooltipWidth}>
                    <span>{col.header}</span>
                  </Tooltip>
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100 dark:bg-slate-800 dark:divide-gray-500/30!">
            {processedData.map((row, rowIndex) => {
              if (row.type === 'SPACER') {
                return (
                  <tr key={rowIndex} className="bg-[gray-50] dark:bg-slate-700/40">
                    <td colSpan={columns.length} className="h-4 sm:h-6"></td>
                  </tr>
                );
              }

              const hubStart = row.type === 'HUB_START';
              const hubEnd = row.type === 'HUB_END';
              if (hubStart || hubEnd) {
                return (
                  <tr
                    key={rowIndex}
                    className="text-red-600 dark:text-red-300 font-bold border-b border-gray-100 bg-white dark:bg-slate-800"
                  >
                    {columns.map((col, colIndex) => {
                      let content = '';
                      if (col.id === 'customerName') content = !searchQuery ? 'HUB' : '';
                      if (col.id === 'etd' && hubStart) content = !searchQuery ? row.time : '';
                      if (col.id === 'eta' && hubEnd) content = !searchQuery ? row.time : '';
                      return (
                        <td
                          key={colIndex}
                          className={`px-4 py-2 ${col.align === 'center' ? 'text-center' : 'text-left'}`}
                        >
                          {content}
                        </td>
                      );
                    })}
                  </tr>
                );
              }

              const rowClass = row.isManualAssign
                ? 'bg-red-100/70 hover:bg-red-100 dark:bg-red-900/60 dark:hover:bg-red-900/70 divide-y divide-red-200/30 dark:divide-red-900/70!'
                : 'hover:bg-gray-50 dark:hover:bg-slate-700/10';

              const cellContent = columns.map((col, colIndex) => {
                const colClass = row.isManualAssign
                  ? (col.className || '').replace(/\S*bg-\S+/g, '').trim()
                  : col.className || '';
                const rawVal = col.getValue(row);
                let finalUI = rawVal;

                if (col.getUI) {
                  finalUI = col.getUI(rawVal, row, t);
                } else if (col.highlight) {
                  finalUI = <HighlightText text={String(rawVal)} highlight={searchQuery} />;
                }

                return (
                  <td
                    key={colIndex}
                    className={`px-4 py-2 ${col.align === 'center' ? 'text-center' : 'text-left'} ${colClass} cursor-pointer`}
                    onClick={() => handleRowClick && handleRowClick(row._id)}
                  >
                    {finalUI}
                  </td>
                );
              });

              if (row.isManualAssign) {
                return (
                  <Tooltip key={rowIndex} tooltipContent={t('common.status.manual_assign')}>
                    <tr className={`${rowClass} border-b border-gray-100 cursor-help`}>
                      {cellContent}
                    </tr>
                  </Tooltip>
                );
              }

              return (
                <tr key={rowIndex} className={`${rowClass} border-b border-gray-100`}>
                  {cellContent}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <RoutingMapModal
        data={processedData}
        isOpen={isMapModalOpen}
        onClose={() => setIsMapModalOpen(false)}
      />
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        taskId={selectedTaskId}
        driverData={drivers}
      />
    </div>
  );
}
