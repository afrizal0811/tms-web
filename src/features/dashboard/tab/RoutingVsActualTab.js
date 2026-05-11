'use client';

import Button from '@/components/Button';
import HighlightText from '@/components/HighlightText';
import SearchBar from '@/components/SearchBar';
import Tooltip from '@/components/Tooltip';
import { useLanguage } from '@/context/LanguageContext';
import { getLocalStorage } from '@/lib/localStorageHandler';
import { toastError, toastWarning } from '@/lib/toastHelper';
import { isEmpty } from '@/lib/utils';
import { useMemo, useState } from 'react';
import { downloadRoutingVsActual, processRoutingVsActualData } from '../help';
import RoutingMapModal from '../modals/RoutingMapModal';

export default function RoutingVsActualTab({ loading, tasks, results, drivers, selectedDate }) {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);

  const processedData = useMemo(() => {
    if (loading) return [];

    // Cukup panggil fungsi dari help.js!
    return processRoutingVsActualData({
      tasks,
      results,
      drivers,
      searchQuery,
    });
  }, [loading, tasks, results, drivers, searchQuery]);

  const handleDownload = async () => {
    if (isEmpty(processedData)) return;

    setIsDownloading(true);
    try {
      const { storedLocationAcronym, storedLocationName } = getLocalStorage();
      const hubLabel = storedLocationAcronym || storedLocationName || '';

      await new Promise((r) => setTimeout(r, 100));
      downloadRoutingVsActual(processedData, t, selectedDate, hubLabel);
    } catch (e) {
      toastError(t('dashboard.error_download', { err: e.message }));
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

  const hoursStatusConfig = {
    yes: { text: t('dashboard.tab.routingreal.yes'), color: 'text-green-600 dark:text-green-300' },
    early: {
      text: t('dashboard.tab.routingreal.early'),
      color: 'text-amber-500 dark:text-amber-300',
    },
    no: { text: t('dashboard.tab.routingreal.no'), color: 'text-red-600 dark:text-red-300' },
  };

  const tableColumns = [
    { header: t('common.flow'), render: (row) => row.flow },
    {
      header: t('common.license_number'),
      render: (row) => <HighlightText text={row.plat} highlight={searchQuery} />,
    },
    {
      header: t('common.driver'),
      className: 'font-medium',
      render: (row) => <HighlightText text={row.driver} highlight={searchQuery} />,
    },
    {
      header: t('common.customer_name'),
      align: 'left',
      render: (row) => <HighlightText text={row.customerName} highlight={searchQuery} />,
    },
    { header: t('dashboard.tab.routingreal.status'), render: (row) => row.statusLabel },
    {
      header: t('common.open_time'),
      render: (row) => row.openTime,
    },
    {
      header: t('common.close_time'),
      render: (row) => row.closeTime,
    },
    { header: t('common.eta'), render: (row) => row.eta },
    {
      header: t('common.actual_arrival'),
      render: (row) => row.actualArrival,
    },
    { header: t('common.etd'), render: (row) => row.etd },
    {
      header: t('common.actual_departure'),
      render: (row) => row.actualDeparture,
    },
    {
      header: t('common.visit_plan'),
      render: (row) => row.visitTime,
    },
    {
      header: t('common.visit_actual'),
      render: (row) => row.actualVisitTime,
    },
    {
      header: t('common.ro_seq'),
      className: 'font-semibold',
      render: (row) => (isEmpty(row.roSequence) ? '-' : row.roSequence),
    },
    {
      header: t('common.actual_seq'),
      className: 'font-semibold',
      render: (row) => row.realSequence ?? '-',
    },
    {
      header: t('dashboard.tab.routingreal.is_match'),
      tooltip: t('dashboard.tab.routingreal.tooltip.exp_is_same'),
      render: (row) => {
        if (isEmpty(row.realSequence)) {
          return <span className="font-bold text-slate-100">-</span>;
        }
        const isMatch = row.roSequence == row.realSequence;

        return (
          <span
            className={`font-bold ${
              isMatch ? 'text-green-600 dark:text-green-300' : 'text-red-600 dark:text-red-300'
            }`}
          >
            {t(`dashboard.tab.routingreal.${isMatch ? 'match' : 'mismatch'}`)}
          </span>
        );
      },
    },
    {
      header: t('dashboard.tab.routingreal.is_within_hours'),
      tooltip: t('dashboard.tab.routingreal.tooltip.exp_within_hours'),
      tooltipWidth: 'w-40',
      render: (row) => {
        const statusUI = hoursStatusConfig[row.isWithinHoursStatus] || {
          text: '-',
          color: 'text-slate-100',
        };
        return <span className={`font-bold ${statusUI.color}`}>{statusUI.text}</span>;
      },
    },
  ];

  return (
    <div className="flex-1 flex flex-col h-full space-y-4">
      <div className="flex flex-col md:flex-row w-full justify-end items-center gap-3 mb-2">
        <div className="w-full md:w-64 order-1">
          <SearchBar
            disabled={loading || isDownloading}
            onChange={(val) => setSearchQuery(val)}
            placeholder={t('dashboard.tab.routingreal.search_placeholder')}
            value={searchQuery}
          />
        </div>
        <div className="w-full md:w-auto order-2">
          <Button
            disabled={loading || isDownloading || isEmpty(processedData)}
            onClick={handleOpenMap}
            text={isDownloading ? t('common.downlading') : t('dashboard.tab.routingreal.show_map')}
          />
        </div>
        <div className="w-full md:w-auto order-3">
          <Button
            disabled={loading || isDownloading || isEmpty(processedData)}
            onClick={handleDownload}
            text={isDownloading ? t('common.downlading') : t('common.download')}
          />
        </div>
      </div>
      <div className="overflow-auto h-full border rounded-lg shadow-sm bg-white dark:border-slate-700 dark:bg-slate-800">
        <table className="min-w-full text-xs text-left ">
          <thead className="bg-gray-100 font-bold text-gray-700 sticky top-0 z-10 shadow-sm dark:bg-slate-900 dark:text-slate-700!">
            <tr className="text-gray-600 dark:text-slate-300">
              {tableColumns.map((col, index) => {
                const baseClass = `px-4 py-3 border-b border-gray-300 dark:border-slate-700 text-center`;
                return (
                  <th key={index} className={`${baseClass} ${col.tooltip ? 'cursor-help' : ''}`}>
                    {col.tooltip ? (
                      <Tooltip tooltipContent={col.tooltip} width={col.tooltipWidth}>
                        <span>{col.header}</span>
                      </Tooltip>
                    ) : (
                      col.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>

          {/* ===== BODY ===== */}
          <tbody className="divide-y divide-gray-100 dark:bg-slate-800 dark:divide-gray-500/30!">
            {processedData.map((row, rowIndex) => {
              const hubStart = row.type === 'HUB_START';
              const hubEnd = row.type === 'HUB_END';
              if (row.type === 'SPACER') {
                return (
                  <tr key={rowIndex} className="bg-gray-50 dark:bg-slate-800">
                    <td colSpan={17} className="h-4 sm:h-6"></td>
                  </tr>
                );
              }
              if (hubStart || hubEnd) {
                return (
                  <tr
                    key={rowIndex}
                    className="text-red-600 dark:text-red-300 font-bold border-b border-gray-100 bg-white  dark:bg-slate-800"
                  >
                    {Array.from({ length: 17 }).map((_, colIndex) => {
                      if (colIndex === 3)
                        return (
                          <td key={colIndex} className="px-4 py-2">
                            {!searchQuery ? 'HUB' : ''}
                          </td>
                        );
                      if (colIndex === 9 && hubStart)
                        return (
                          <td key={colIndex} className="px-4 py-2 text-center">
                            {!searchQuery ? row.time : ''}
                          </td>
                        );
                      if (colIndex === 7 && hubEnd)
                        return (
                          <td key={colIndex} className="px-4 py-2 text-center">
                            {!searchQuery ? row.time : ''}
                          </td>
                        );
                      return <td key={colIndex} className="px-4 py-2" />;
                    })}
                  </tr>
                );
              }

              const rowClass = row.isManualAssign
                ? 'bg-red-100/70 hover:bg-red-100 dark:bg-red-900 dark:hover:bg-[#88191b] divide-y divide-red-200/30 dark:divide-red-900/30!'
                : 'hover:bg-gray-50 dark:hover:bg-slate-700/10';

              const cellContent = tableColumns.map((col, colIndex) => (
                <td
                  key={colIndex}
                  className={`px-4 py-2 ${col.align === 'left' ? 'text-left' : 'text-center'} ${col.className || ''}`}
                >
                  {col.render(row)}
                </td>
              ));

              // 4. Return baris
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
    </div>
  );
}
