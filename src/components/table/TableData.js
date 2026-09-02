'use client';

import { useLanguage } from '@/context/LanguageContext';
import { useMemo, useState } from 'react';
import Spinner from '../Spinner';
import Tooltip from '../Tooltip';
import Td from './Td';
import Th from './Th';

const compareValues = (aVal, bVal) =>
  typeof aVal === 'string' && typeof bVal === 'string'
    ? aVal.localeCompare(bVal)
    : aVal < bVal
      ? -1
      : aVal > bVal
        ? 1
        : 0;

export default function TableData({
  columns = [],
  data = [],
  onRowClick,
  isLoading = false,
  paginate = false,
  customSort,
  externalSortConfig,
  onExternalSort,
  rowClassName,
  rowTooltip,
}) {
  const [internalSortConfig, setInternalSortConfig] = useState(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [prevData, setPrevData] = useState(data);

  const { t } = useLanguage();
  const sortConfig = externalSortConfig !== undefined ? externalSortConfig : internalSortConfig;

  if (data !== prevData) {
    setPrevData(data);
    setPage(1);
  }

  const handleSort = (key) => {
    let newConfig;
    if (sortConfig?.key === key) {
      if (sortConfig.direction === 'asc') {
        newConfig = { key, direction: 'desc' };
      } else {
        newConfig = null;
      }
    } else {
      newConfig = { key, direction: 'asc' };
    }

    if (onExternalSort) {
      onExternalSort(newConfig || { key: 'no', direction: 'asc' });
    } else {
      setInternalSortConfig(newConfig);
    }
  };

  const sortedData = useMemo(() => {
    let sortableItems = [...data];
    if (sortConfig !== null) {
      if (customSort) {
        sortableItems = customSort(sortableItems, sortConfig);
      } else {
        sortableItems.sort((a, b) => {
          const cmp = compareValues(a[sortConfig.key] ?? '', b[sortConfig.key] ?? '');
          return sortConfig.direction === 'asc' ? cmp : -cmp;
        });
      }
    }
    return sortableItems;
  }, [data, sortConfig, customSort]);

  const paginatedData = useMemo(() => {
    if (!paginate || limit === 'all') return sortedData;
    const start = (page - 1) * Number(limit);
    return sortedData.slice(start, start + Number(limit));
  }, [sortedData, page, limit, paginate]);

  const totalPages =
    !paginate || limit === 'all' ? 1 : Math.ceil(sortedData.length / Number(limit));

  return (
    <div className="flex flex-col flex-1 h-full min-h-0 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700">
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex justify-center items-center h-full min-h-[300px]">
            <Spinner />
          </div>
        ) : sortedData.length === 0 ? (
          <div className="p-4 text-center text-xs text-gray-500 flex justify-center items-center h-full min-h-[300px]">
            {t('common.no_data')}
          </div>
        ) : (
          <table className="w-full table-auto" style={{ minWidth: '100%' }}>
            <thead className="bg-gray-100 dark:bg-slate-800 sticky top-0 z-10">
              <tr>
                {columns.map((col, index) => (
                  <Th
                    key={index}
                    widthClass={col.width}
                    className={
                      col.sortable
                        ? 'cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-700 select-none'
                        : ''
                    }
                  >
                    <div
                      className={`flex items-center gap-1 text-center ${col.align === 'center' ? 'justify-center' : ''}`}
                      onClick={() => col.sortable && handleSort(col.key)}
                    >
                      {col.label}
                      {col.sortable && (
                        <span className="text-[10px] text-gray-400">
                          {sortConfig?.key === col.key
                            ? sortConfig.direction === 'asc'
                              ? '▲'
                              : '▼'
                            : '↕'}
                        </span>
                      )}
                    </div>
                  </Th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
              {paginatedData.map((row, rowIndex) => {
                const tooltipMsg = rowTooltip ? rowTooltip(row) : null;
                const trContent = (
                  <tr
                    key={row._id || rowIndex}
                    onClick={() => onRowClick && onRowClick(row)}
                    className={`${onRowClick ? 'cursor-pointer' : ''} ${
                      rowClassName?.(row) || 'hover:bg-gray-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    {columns.map((col, colIndex) => (
                      <Td key={colIndex} className="text-[13px]!">
                        {col.render ? col.render(row) : row[col.key]}
                      </Td>
                    ))}
                  </tr>
                );

                return tooltipMsg ? (
                  <Tooltip key={`tooltip-${row._id || rowIndex}`} tooltipContent={tooltipMsg}>
                    {trContent}
                  </Tooltip>
                ) : (
                  trContent
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      {paginate && (
        <div className="p-4 flex justify-between items-center bg-gray-50 dark:bg-slate-900 border-t border-gray-200 dark:border-slate-700 shrink-0">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <select
              value={limit}
              onChange={(e) => {
                setLimit(e.target.value);
                setPage(1);
              }}
              className="border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 rounded p-1 outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
              <option value="all">All</option>
            </select>
            <span className="ml-4">Total data: {sortedData.length}</span>
          </div>
          {limit !== 'all' && totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded text-sm disabled:opacity-50"
              >
                &lt;
              </button>
              <span className="text-sm text-gray-600 dark:text-gray-300 px-2">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded text-sm disabled:opacity-50"
              >
                &gt;
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
