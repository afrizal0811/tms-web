'use client';

import Tooltip from '@/components/Tooltip'; // Sesuaikan path ini jika berbeda
import { formatDateWIB, isDateSunday, formatLongDate } from '@/lib/utils';
import { useMemo } from 'react';

const violetColor = 'bg-[#d9d2e9]';
const headerClass =
  'px-6 py-3 border-r border-b border-gray-300 font-bold w-1/3 text-center min-w-[200px]';
const dataClass =
  'px-6 py-4 font-medium text-gray-900 border-r border-b border-gray-200 text-center';

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

export default function TimeROTab({ tasks, startDateStr, endDateStr, translate, language }) {
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
      const displayDate = formatLongDate(current, language);

      dataMap[dateKey] = {
        dateKey: dateKey,
        dateDisplay: displayDate,
        firstCreatedTime: null,
        lastAssignedTime: null,
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
          if (
            !dataMap[targetKey].firstCreatedTime ||
            new Date(task.createdTime) < new Date(dataMap[targetKey].firstCreatedTime)
          ) {
            dataMap[targetKey].firstCreatedTime = task.createdTime;
          }

          if (
            task.assignedTime &&
            task.routingResultId &&
            isValidAssignedTimeWIB(task.createdTime, task.assignedTime)
          ) {
            if (
              !dataMap[targetKey].lastAssignedTime ||
              new Date(task.assignedTime) > new Date(dataMap[targetKey].lastAssignedTime)
            ) {
              dataMap[targetKey].lastAssignedTime = task.assignedTime;
            }
          }
        }
      });
    }

    return Object.keys(dataMap)
      .sort()
      .map((key) => dataMap[key]);
  }, [tasks, startDateStr, endDateStr, language]);

  const headerTitle = ['date_ro', 'start_ro', 'end_ro'];
  return (
    <div className="w-full h-full flex flex-col bg-white rounded-b-lx shadow-sm border border-gray-200 p-0 overflow-auto">
      <div className="flex-1 overflow-auto">
        <table className="min-w-full text-sm text-left border-separate border border-gray-300 border-spacing-0">
          <thead className={`text-xs text-gray-700 uppercase sticky top-0 z-10 ${violetColor}`}>
            <tr>
              {headerTitle.map((header, index) => (
                <th key={index} className={headerClass}>
                  <Tooltip
                    tooltipContent={translate(`summary.tabs.time_ro.tooltip.${header}`)}
                  >
                    <span className="cursor-help border-b-2 border-dotted border-slate-700 pb-0.5">
                      {translate(`summary.tabs.time_ro.${header}`)}
                    </span>
                  </Tooltip>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {processedData.map((row, idx) => {
              const isSunday = isDateSunday(row.dateKey);

              if (isSunday) {
                return (
                  <tr
                    key={idx}
                    className="bg-red-200 border-b border-red-300 text-red-900 text-center"
                  >
                    <td className="px-6 py-4 font-medium border-r border-red-300">
                      {row.dateDisplay}
                    </td>
                    <td colSpan={2} className="px-6 py-4 font-bold text-center">
                      {translate('summary.tabs.time_ro.holiday')}
                    </td>
                  </tr>
                );
              }

              const hasStart = !!row.firstCreatedTime;
              const hasEnd = !!row.lastAssignedTime;

              const isStartMissing = !hasStart && hasEnd;
              const isEndMissing = hasStart && !hasEnd;

              const startDisplay = hasStart ? formatDateWIB(row.firstCreatedTime, 'HH:mm') : '-';
              const endDisplay = hasEnd ? formatDateWIB(row.lastAssignedTime, 'HH:mm') : '-';

              const errorClass = 'bg-red-100 text-red-600 font-bold';

              return (
                <tr key={idx} className="bg-white border-b hover:bg-gray-50">
                  <td className={dataClass}>{row.dateDisplay}</td>

                  {/* CELL START RO */}
                  <td className={`${dataClass} ${isStartMissing ? errorClass : ''}`}>
                    {isStartMissing ? (
                      <Tooltip
                        tooltipContent={translate('summary.tabs.time_ro.tooltip.start_ro_error')}
                      >
                        <span className="cursor-help w-full inline-block">{startDisplay}</span>
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
    </div>
  );
}
