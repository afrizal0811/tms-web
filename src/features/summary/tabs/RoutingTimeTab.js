'use client';

import CopyButton from '@/components/button/CopyButton';
import Tooltip from '@/components/Tooltip';
import {
  calculateMinuteDifference,
  formatDateUniversal,
  formatLongDate,
  formatMinutesToHHMM,
  isDateSunday,
  isPastDate,
  parseCustomerString,
} from '@/lib/utils';
import { useMemo } from 'react';

const headerClass =
  'px-6 py-3 border-r border-b border-gray-300 dark:border-slate-700 font-bold w-1/3 text-center min-w-[200px]';
const dataClass =
  'px-6 py-4 font-medium text-slate-900 dark:text-slate-200 border-r border-b border-gray-200 dark:border-slate-700 text-center';

const HEADER_TITLES = ['routing_date', 'start_time', 'finish_time', 'duration'];

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

    const current = new Date(start);

    while (current <= end) {
      const dateKey = formatDateUniversal(current, 'YYYY-MM-DD');
      const displayDate = formatLongDate(current, localeCode);

      dataMap[dateKey] = {
        dateKey: dateKey,
        dateDisplay: displayDate,
        startData: { time: null, name: null, soNumber: null },
        finishData: { time: null, name: null, soNumber: null },
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

        const targetRow = dataMap[taskDateKey];

        if (targetRow) {
          const {
            name: taskName,
            invoiceNumber,
            truncateInvoice,
          } = parseCustomerString(task.customerOrder) ||
          parseCustomerString(task.customerName) ||
          '-';

          const isValidRoutedTask =
            task.assignedTime &&
            task.routingResultId &&
            (task.eta || task.etd || task.routePlannedOrder) &&
            isValidAssignedTimeWIB(task.createdTime, task.assignedTime);

          if (isValidRoutedTask) {
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
              !targetRow.finishData.time ||
              new Date(task.assignedTime) > new Date(targetRow.finishData.time)
            ) {
              targetRow.finishData.time = task.assignedTime;
              targetRow.finishData.name = taskName;
              targetRow.finishData.soNumber = invoiceNumber;
              targetRow.finishData.truncateInvoice = truncateInvoice;
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
              const hasFinish = !!row.finishData.time;
              const isSunday = isDateSunday(row.dateKey);
              const isPast = isPastDate(row.dateKey);

              const isDynamicHoliday = isPast && !hasStart && !hasFinish && !isSunday;

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
                      colSpan={3}
                      className="px-6 py-4 font-bold text-center border-b border-gray-300 dark:border-slate-700"
                    >
                      {content}
                    </td>
                  </tr>
                );
              }

              const isStartMissing = !hasStart && hasFinish;
              const isFinishMissing = hasStart && !hasFinish;
              const startDisplay = hasStart
                ? formatDateUniversal(row.startData.time, 'HH:mm')
                : '-';
              const endDisplay = hasFinish
                ? formatDateUniversal(row.finishData.time, 'HH:mm')
                : '-';

              let durationDisplay = '-';
              if (hasStart && hasFinish) {
                const diffMins = calculateMinuteDifference(row.startData.time, row.finishData.time);
                durationDisplay = formatMinutesToHHMM(diffMins, false);
              }

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
                              ? row.startData.truncateInvoice
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
                  <td className={`${dataClass} ${isFinishMissing ? errorClass : ''}`}>
                    <div className="flex items-center justify-center gap-1">
                      <Tooltip
                        tooltipContent={
                          isFinishMissing
                            ? translate('summary.tabs.routing_time.tooltip.finish_time_error')
                            : hasFinish
                              ? row.finishData.truncateInvoice
                              : ''
                        }
                      >
                        <span
                          className={`${isFinishMissing ? 'cursor-help w-full inline-block' : hasFinish ? 'cursor-help border-b-2 border-dotted pb-0.5' : ''} `}
                        >
                          {endDisplay}
                        </span>
                      </Tooltip>
                      {hasFinish && <CopyButton text={row.finishData.soNumber} />}
                    </div>
                  </td>
                  <td className={dataClass}>{durationDisplay}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
