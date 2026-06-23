'use client';

import Tooltip from '@/components/Tooltip';
import { toastError, toastSuccess } from '@/lib/toast';
import { formatDateWIB, formatLongDate, isDateSunday, parseCustomerString } from '@/lib/utils';
import { useMemo } from 'react';

const headerClass =
  'px-6 py-3 border-r border-b border-gray-300 dark:border-slate-700 font-bold w-1/3 text-center min-w-[200px]';
const dataClass =
  'px-6 py-4 font-medium text-slate-900 dark:text-slate-200 border-r border-b border-gray-200 dark:border-slate-700 text-center';

const isValidAssignedTimeWIB = (createdIso, assignedIso) => {
  if (!createdIso || !assignedIso) return false;

  const cTime = new Date(createdIso).getTime();
  const aTime = new Date(assignedIso).getTime();

  if (isNaN(cTime) || isNaN(aTime)) return false;
  if (aTime < cTime) return false;

  const cWIB = new Date(cTime + 7 * 60 * 60 * 1000);
  const aWIB = new Date(aTime + 7 * 60 * 60 * 1000);

  const maxWIB = new Date(
    Date.UTC(cWIB.getUTCFullYear(), cWIB.getUTCMonth(), cWIB.getUTCDate() + 1, 3, 0, 0)
  );

  return aWIB.getTime() <= maxWIB.getTime();
};

const isValidRoutingTimeWIB = (utcString) => {
  if (!utcString) return false;
  const d = new Date(utcString);
  if (isNaN(d.getTime())) return false;

  const wibDate = new Date(d.getTime() + 7 * 60 * 60 * 1000);
  const day = wibDate.getUTCDay();
  const hour = wibDate.getUTCHours();

  if (day >= 1 && day <= 5) {
    return hour >= 16;
  } else if (day === 6) {
    return hour >= 12;
  } else {
    return true;
  }
};

function formatInvoice(invoiceString) {
  if (!invoiceString) return '';

  const invoices = invoiceString
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);

  return invoices.length > 1 ? `${invoices[0]} (+${invoices.length - 1})` : invoices[0];
}

export default function TimeROTab({ tasks, startDateStr, endDateStr, translate, localeCode }) {
  const processedData = useMemo(() => {
    const dataMap = {};

    const start = new Date(startDateStr);
    start.setHours(0, 0, 0, 0);

    const end = new Date(endDateStr);
    end.setHours(0, 0, 0, 0);

    const lastDayKey = formatDateWIB(end, 'YYYY-MM-DD');
    const nextDay = new Date(end);
    nextDay.setDate(nextDay.getDate() + 1);
    const nextDayKey = formatDateWIB(nextDay, 'YYYY-MM-DD');

    const current = new Date(start);

    while (current <= end) {
      const dateKey = formatDateWIB(current, 'YYYY-MM-DD');
      const displayDate = formatLongDate(current, localeCode);

      dataMap[dateKey] = {
        dateKey: dateKey,
        dateDisplay: displayDate,
        startData: {
          time: null,
          name: null,
          soNumber: null,
        },
        endData: {
          time: null,
          name: null,
          soNumber: null,
        },
      };
      current.setDate(current.getDate() + 1);
    }

    if (tasks && Array.isArray(tasks)) {
      tasks.forEach((task) => {
        if (task.createdFrom !== 'API') return;
        if (task.flow !== 'Delivery') return;
        if (!task.createdTime) return;
        if (!isValidRoutingTimeWIB(task.createdTime)) return;

        let taskDateKey = formatDateWIB(new Date(task.createdTime), 'YYYY-MM-DD');

        if (taskDateKey === '2026-01-02' && dataMap['2025-12-31']) {
          taskDateKey = '2025-12-31';
        }

        const targetKey =
          taskDateKey === nextDayKey && dataMap[lastDayKey] ? lastDayKey : taskDateKey;

        if (dataMap[targetKey]) {
          const { name: taskName, invoiceNumber: rawSoNumber } =
            parseCustomerString(task.customerOrder) ||
            parseCustomerString(task.customerName) ||
            '-';
          const soNumber = formatInvoice(rawSoNumber);
          if (
            !dataMap[targetKey].startData.time ||
            new Date(task.createdTime) < new Date(dataMap[targetKey].startData.time)
          ) {
            dataMap[targetKey].startData.time = task.createdTime;
            dataMap[targetKey].startData.name = taskName;
            dataMap[targetKey].startData.soNumber = soNumber;
          }

          if (
            task.assignedTime &&
            task.routingResultId &&
            isValidAssignedTimeWIB(task.createdTime, task.assignedTime)
          ) {
            if (
              !dataMap[targetKey].endData.time ||
              new Date(task.assignedTime) > new Date(dataMap[targetKey].endData.time)
            ) {
              dataMap[targetKey].endData.time = task.assignedTime;
              dataMap[targetKey].endData.name = taskName;
              dataMap[targetKey].endData.soNumber = soNumber;
            }
          }
        }
      });
    }

    return Object.keys(dataMap)
      .sort()
      .map((key) => dataMap[key]);
  }, [tasks, startDateStr, endDateStr, localeCode]);

  const copySoNumber = async (soNumber) => {
    if (!soNumber) return;
    try {
      const copyText = String(soNumber).replace(/\s*\(\+\d+\)$/, '');
      await navigator.clipboard.writeText(copyText);
      toastSuccess(`${translate('common.copied')}: ${copyText}`);
    } catch (err) {
      toastError(`${translate('common.toast.error')}: ${err.message}`);
    }
  };

  const headerTitle = [
    {
      tooltip: 'summary.tabs.time_ro.tooltip.date_ro',
      name: 'summary.tabs.time_ro.date_ro',
    },
    {
      name: 'common.start_time',
      tooltip: 'summary.tabs.time_ro.tooltip.start_ro',
    },
    {
      name: 'common.finish_time',
      tooltip: 'summary.tabs.time_ro.tooltip.end_ro',
    },
  ];

  return (
    <div className="w-full h-full flex flex-col bg-white dark:bg-slate-800 rounded-b-xl shadow-sm p-0 overflow-auto">
      <div className="flex-1 overflow-auto">
        <table className="min-w-full text-sm text-left border-collapse">
          <thead className="text-xs text-slate-900 dark:text-slate-200 uppercase sticky top-0 z-10 bg-purple-200 dark:bg-[#34205c]">
            <tr>
              {headerTitle.map((header, index) => (
                <th key={index} className={headerClass}>
                  <Tooltip tooltipContent={translate(`${header.tooltip}`)}>
                    <span className="cursor-help border-b-2 border-dotted border-slate-900 dark:border-slate-200 pb-0.5">
                      {translate(`${header.name}`)}
                    </span>
                  </Tooltip>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-slate-800">
            {processedData.map((row, idx) => {
              const hasStart = !!row.startData.time;
              const hasEnd = !!row.endData.time;
              const isSunday = isDateSunday(row.dateKey);

              const [y, m, d] = row.dateKey.split('-').map(Number);
              const currentMidnight = new Date(y, m - 1, d);
              currentMidnight.setHours(0, 0, 0, 0);
              const isPast = currentMidnight < new Date().setHours(0, 0, 0, 0);

              const isDynamicHoliday = isPast && !hasStart && !hasEnd && !isSunday;

              if (isSunday || isDynamicHoliday) {
                const content = isSunday ? (
                  translate('common.holiday_sunday')
                ) : (
                  <Tooltip tooltipContent={translate('summary.tabs.task_summary.caution')}>
                    <span className="cursor-help border-b-2 border-dotted border-red-900 dark:border-red-300 pb-0.5">
                      {translate('common.holiday')}
                    </span>
                  </Tooltip>
                );

                return (
                  <tr
                    key={idx}
                    className="bg-red-200 dark:bg-[#4a1c1c] text-red-900 dark:text-red-300 text-center"
                  >
                    <td className="px-6 py-4 font-medium border-r border-b border-gray-300 dark:border-slate-700">
                      {row.dateDisplay}
                    </td>
                    <td
                      colSpan={2}
                      className="px-6 py-4 font-bold text-center border-b border-gray-300 dark:border-slate-700"
                    >
                      {content}
                    </td>
                  </tr>
                );
              }

              const isStartMissing = !hasStart && hasEnd;
              const isEndMissing = hasStart && !hasEnd;

              const startDisplay = hasStart ? formatDateWIB(row.startData.time, 'HH:mm') : '-';
              const endDisplay = hasEnd ? formatDateWIB(row.endData.time, 'HH:mm') : '-';

              const errorClass =
                'bg-red-100 dark:bg-[#4a1c1c] text-red-600 dark:text-red-400 font-bold';

              return (
                <tr
                  key={idx}
                  className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
                >
                  <td className={dataClass}>{row.dateDisplay}</td>
                  {/* CELL START RO */}
                  <td className={`${dataClass} ${isStartMissing ? errorClass : ''}`}>
                    {isStartMissing ? (
                      <Tooltip
                        tooltipContent={translate('summary.tabs.time_ro.tooltip.start_ro_error')}
                      >
                        <span className="cursor-help w-full inline-block">{startDisplay}</span>
                      </Tooltip>
                    ) : hasStart ? (
                      <Tooltip tooltipContent={`${row.startData.name}\n${row.startData.soNumber}`}>
                        <span
                          className="cursor-help border-b-2 border-dotted pb-0.5"
                          onClick={() => copySoNumber(row.startData.soNumber)}
                        >
                          {startDisplay}
                        </span>
                      </Tooltip>
                    ) : (
                      startDisplay
                    )}
                  </td>

                  {/* CELL END RO */}
                  <td className={`${dataClass} ${isEndMissing ? errorClass : ''}`}>
                    {isEndMissing ? (
                      <Tooltip
                        tooltipContent={translate('summary.tabs.time_ro.tooltip.end_ro_error')}
                      >
                        <span className="cursor-help w-full inline-block">{endDisplay}</span>
                      </Tooltip>
                    ) : hasEnd ? (
                      <Tooltip tooltipContent={`${row.endData.name}\n${row.endData.soNumber}`}>
                        <span
                          className="cursor-help border-b-2 border-dotted pb-0.5"
                          onClick={() => copySoNumber(row.endData.soNumber)}
                        >
                          {endDisplay}
                        </span>
                      </Tooltip>
                    ) : (
                      endDisplay
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="px-4 py-3 bg-white dark:bg-slate-800 rounded-b-lg border-t border-gray-200 dark:border-slate-700 text-sm shrink-0">
        <div className="text-xs text-slate-500 dark:text-slate-400 italic">
          *
          {translate('common.click_for_detail_param', {
            parameter: translate('summary.underline'),
          })}
        </div>
      </div>
    </div>
  );
}
