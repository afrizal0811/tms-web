'use client';

import CopyButton from '@/components/button/CopyButton';
import Tooltip from '@/components/Tooltip';
import {
  formatDateUniversal,
  formatLongDate,
  isDateSunday,
  isPastDate,
  parseCustomerString,
} from '@/lib/utils';
import { useMemo } from 'react';

const headerClass =
  'px-6 py-3 border-r border-b border-gray-300 dark:border-slate-700 font-bold w-1/3 text-center min-w-[200px]';
const dataClass =
  'px-6 py-4 font-medium text-slate-900 dark:text-slate-200 border-r border-b border-gray-200 dark:border-slate-700 text-center';

const HEADER_TITLES = ['routing_date', 'start_time', 'finish_time'];

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
    return hour >= 15;
  } else if (day === 6) {
    return hour >= 12;
  } else {
    return true;
  }
};

export default function RoutingTimeTab({ tasks, startDateStr, endDateStr, translate, localeCode }) {
  const processedData = useMemo(() => {
    const dataMap = {};

    const start = new Date(startDateStr);
    start.setHours(0, 0, 0, 0);

    const end = new Date(endDateStr);
    end.setHours(0, 0, 0, 0);

    const lastDayKey = formatDateUniversal(end, 'YYYY-MM-DD');
    const nextDay = new Date(end);
    nextDay.setDate(nextDay.getDate() + 1);
    const nextDayKey = formatDateUniversal(nextDay, 'YYYY-MM-DD');

    const current = new Date(start);

    while (current <= end) {
      const dateKey = formatDateUniversal(current, 'YYYY-MM-DD');
      const displayDate = formatLongDate(current, localeCode);

      dataMap[dateKey] = {
        dateKey: dateKey,
        dateDisplay: displayDate,
        startData: { time: null, name: null, soNumber: null },
        endData: { time: null, name: null, soNumber: null },
      };
      current.setDate(current.getDate() + 1);
    }

    if (tasks && Array.isArray(tasks)) {
      tasks.forEach((task) => {
        if (task.createdFrom !== 'API') return;
        if (task.flow !== 'Delivery') return;
        if (!task.createdTime) return;
        if (!isValidRoutingTimeWIB(task.createdTime)) return;

        let taskDateKey = formatDateUniversal(new Date(task.createdTime), 'YYYY-MM-DD');

        if (taskDateKey === '2026-01-02' && dataMap['2025-12-31']) {
          taskDateKey = '2025-12-31';
        }

        const targetKey =
          taskDateKey === nextDayKey && dataMap[lastDayKey] ? lastDayKey : taskDateKey;
        const targetRow = dataMap[targetKey];

        if (targetRow) {
          const {
            name: taskName,
            invoiceNumber,
            truncateInvoice,
          } = parseCustomerString(task.customerOrder) ||
          parseCustomerString(task.customerName) ||
          '-';

          if (
            !targetRow.startData.time ||
            new Date(task.createdTime) < new Date(targetRow.startData.time)
          ) {
            targetRow.startData.time = task.createdTime;
            targetRow.startData.name = taskName;
            targetRow.startData.soNumber = invoiceNumber;
            targetRow.startData.truncateInvoice = truncateInvoice;
          }

          if (
            task.assignedTime &&
            task.routingResultId &&
            isValidAssignedTimeWIB(task.createdTime, task.assignedTime)
          ) {
            if (
              !targetRow.endData.time ||
              new Date(task.assignedTime) > new Date(targetRow.endData.time)
            ) {
              targetRow.endData.time = task.assignedTime;
              targetRow.endData.name = taskName;
              targetRow.endData.soNumber = invoiceNumber;
              targetRow.endData.truncateInvoice = truncateInvoice;
            }
          }
        }
      });
    }

    return Object.keys(dataMap)
      .sort()
      .map((key) => dataMap[key]);
  }, [tasks, startDateStr, endDateStr, localeCode]);

  return (
    <div className="w-full h-full flex flex-col bg-white dark:bg-slate-800 shadow-sm p-0 overflow-auto">
      <div className="flex-1 overflow-auto">
        <table className="min-w-full text-sm text-left border-collapse">
          <thead className="text-xs text-slate-900 dark:text-slate-200 uppercase sticky top-0 z-10 bg-purple-200 dark:bg-[#34205c]">
            <tr>
              {HEADER_TITLES.map((header, index) => (
                <th key={index} className={headerClass}>
                  <Tooltip
                    tooltipContent={translate(`summary.tabs.routing_time.tooltip.${header}`)}
                  >
                    <span className="cursor-help border-b-2 border-dotted border-slate-900 dark:border-slate-200 pb-0.5">
                      {translate(`common.${header}`)}
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
              const isPast = isPastDate(row.dateKey);

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
              const startDisplay = hasStart
                ? formatDateUniversal(row.startData.time, 'HH:mm')
                : '-';
              const endDisplay = hasEnd ? formatDateUniversal(row.endData.time, 'HH:mm') : '-';
              const errorClass =
                'bg-red-100 dark:bg-[#4a1c1c] text-red-600 dark:text-red-400 font-bold';

              return (
                <tr
                  key={idx}
                  className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
                >
                  <td className={dataClass}>{row.dateDisplay}</td>
                  <td className={`${dataClass} ${isStartMissing ? errorClass : ''}`}>
                    <div className="flex items-center justify-center gap-1">
                      <Tooltip
                        tooltipContent={
                          isStartMissing
                            ? translate('summary.tabs.routing_time.tooltip.start_time_error')
                            : hasStart
                              ? `${row.startData.name}\n${row.startData.truncateInvoice}`
                              : ''
                        }
                      >
                        <span
                          className={`${isStartMissing ? 'cursor-help w-full inline-block' : hasStart ? 'cursor-help border-b-2 border-dotted pb-0.5' : ''} `}
                        >
                          {startDisplay}
                        </span>
                      </Tooltip>
                      {hasStart && <CopyButton text={row.startData.soNumber} />}
                    </div>
                  </td>
                  <td className={`${dataClass} ${isEndMissing ? errorClass : ''}`}>
                    <div className="flex items-center justify-center gap-1">
                      <Tooltip
                        tooltipContent={
                          isEndMissing
                            ? translate('summary.tabs.routing_time.tooltip.finish_time_error')
                            : hasEnd
                              ? `${row.endData.name}\n${row.endData.truncateInvoice}`
                              : ''
                        }
                      >
                        <span
                          className={`${isEndMissing ? 'cursor-help w-full inline-block' : hasEnd ? 'cursor-help border-b-2 border-dotted pb-0.5' : ''} `}
                        >
                          {endDisplay}
                        </span>
                      </Tooltip>
                      {hasEnd && <CopyButton text={row.endData.soNumber} />}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
