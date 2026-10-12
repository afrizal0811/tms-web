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
import {
  getRoutingTimeFromTasks,
  getTargetRoutingDate,
} from '@/lib/reportGenerators/summary/sheets/routingTimeSheet';
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
    return hour >= 11;
  } else {
    return true;
  }
};

export default function RoutingTimeTab({ tasks, startDateStr, endDateStr, translate, localeCode }) {
  const processedData = useMemo(() => {
    const dataMap = {};
    const tasksByDate = {};
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
        dry: {
          start: { time: null, name: null, soNumber: null },
          finish: { time: null, name: null, soNumber: null },
          batches: [],
          mainBatch: null,
        },
        frozen: {
          start: { time: null, name: null, soNumber: null },
          finish: { time: null, name: null, soNumber: null },
          batches: [],
          mainBatch: null,
        },
      };
      tasksByDate[dateKey] = { dry: [], frozen: [] };
      current.setDate(current.getDate() + 1);
    }

    if (tasks && Array.isArray(tasks)) {
      tasks.forEach((task) => {
        const isApi = !task.createdFrom || task.createdFrom === 'API';
        if (!isApi) return;
        if (task.flow !== 'Delivery') return;
        if (!task.createdTime) return;
        if (!isValidRoutingTimeWIB(task.createdTime)) return;

        const taskDateKey = getTargetRoutingDate(task.startTime, task.createdTime);

        const targetRow = taskDateKey ? dataMap[taskDateKey] : null;

        if (targetRow && tasksByDate[taskDateKey]) {
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
            const type = (task.typeStorage || '').toUpperCase().includes('FROZEN')
              ? 'frozen'
              : 'dry';
            tasksByDate[taskDateKey][type].push({
              ...task,
              name: taskName,
              soNumber: invoiceNumber,
              truncateInvoice: truncateInvoice,
            });
          }
        }
      });
    }

    Object.keys(dataMap).forEach((dateKey) => {
      ['dry', 'frozen'].forEach((type) => {
        const typeTasks = tasksByDate[dateKey] ? tasksByDate[dateKey][type] : [];
        const result = getRoutingTimeFromTasks(typeTasks);
        if (result.startTime && result.finishTime) {
          let actualRoutingDay = null;
          if (result.startTask?.createdTime) {
            const actualDateKey = formatDateUniversal(
              new Date(result.startTask.createdTime),
              'YYYY-MM-DD'
            );
            if (actualDateKey !== dateKey) {
              const cTime = new Date(result.startTask.createdTime).getTime();
              const wibDate = new Date(cTime + 7 * 60 * 60 * 1000);
              actualRoutingDay = wibDate.toLocaleDateString(
                localeCode === 'en' ? 'en-US' : 'id-ID',
                { weekday: 'long', timeZone: 'UTC' }
              );
            }
          }

          dataMap[dateKey][type].start = {
            time: result.startTime,
            name: result.startTask?.name || null,
            soNumber: result.startTask?.soNumber || null,
            truncateInvoice: result.startTask?.truncateInvoice || null,
            actualRoutingDay,
          };
          dataMap[dateKey][type].finish = {
            time: result.finishTime,
            name: result.finishTask?.name || null,
            soNumber: result.finishTask?.soNumber || null,
            truncateInvoice: result.finishTask?.truncateInvoice || null,
            actualRoutingDay,
          };
          dataMap[dateKey][type].batches = result.batches;
          dataMap[dateKey][type].mainBatch = result.mainBatch;
        }
      });
    });

    return Object.keys(dataMap)
      .sort()
      .map((key) => dataMap[key]);
  }, [tasks, startDateStr, endDateStr, localeCode]);

  const isTimeDifferent = (t1, t2) => {
    if (!t1 && !t2) return false;
    if (!t1 || !t2) return true;
    return Math.abs(new Date(t1).getTime() - new Date(t2).getTime()) > 60000;
  };

  const { isStartSeparated, isFinishSeparated, isDurationSeparated, hasAnySeparation, totalCols } =
    useMemo(() => {
      const isStartDiff = processedData.some((row) =>
        isTimeDifferent(row.dry.start.time, row.frozen.start.time)
      );
      const isFinishDiff = processedData.some((row) =>
        isTimeDifferent(row.dry.finish.time, row.frozen.finish.time)
      );
      const isDurDiff = isStartDiff || isFinishDiff;
      const anySeparation = isStartDiff || isFinishDiff;
      const cols = 1 + (isStartDiff ? 2 : 1) + (isFinishDiff ? 2 : 1) + (isDurDiff ? 2 : 1);

      return {
        isStartSeparated: isStartDiff,
        isFinishSeparated: isFinishDiff,
        isDurationSeparated: isDurDiff,
        hasAnySeparation: anySeparation,
        totalCols: cols,
      };
    }, [processedData]);

  const subheaderDryClass =
    'px-6 py-3 border-r border-b border-gray-300 dark:border-slate-700 font-bold text-center bg-[#fae2d5] dark:bg-slate-800 dark:bg-gradient-to-t dark:from-[#fae2d5]/10 dark:to-[#fae2d5]/10 text-slate-800 dark:text-slate-200';
  const subheaderFrozenClass =
    'px-6 py-3 border-r border-b border-gray-300 dark:border-slate-700 font-bold text-center bg-[#dbe9f7] dark:bg-slate-800 dark:bg-gradient-to-t dark:from-[#dbe9f7]/10 dark:to-[#dbe9f7]/10 text-slate-800 dark:text-slate-200';

  return (
    <div className="w-full h-full flex flex-col bg-white dark:bg-slate-800 shadow-sm p-0 overflow-auto">
      <div className="flex-1 overflow-auto">
        <table className="min-w-full text-sm text-left border-collapse">
          <thead className="text-xs text-slate-900 dark:text-slate-200 uppercase sticky top-0 z-10 bg-purple-200 dark:bg-[#34205c]">
            {hasAnySeparation ? (
              <>
                <tr>
                  <th rowSpan={2} className={headerClass}>
                    {translate('common.routing_date')}
                  </th>
                  <th
                    rowSpan={isStartSeparated ? undefined : 2}
                    colSpan={isStartSeparated ? 2 : undefined}
                    className={headerClass}
                  >
                    <Tooltip
                      tooltipContent={translate('summary.tabs.routing_time.tooltip.start_time')}
                    >
                      <span className="cursor-help border-b-2 border-dotted border-slate-900 dark:border-slate-200 pb-0.5">
                        {translate('common.start_time')}
                      </span>
                    </Tooltip>
                  </th>
                  <th
                    rowSpan={isFinishSeparated ? undefined : 2}
                    colSpan={isFinishSeparated ? 2 : undefined}
                    className={headerClass}
                  >
                    <Tooltip
                      tooltipContent={translate('summary.tabs.routing_time.tooltip.finish_time')}
                    >
                      <span className="cursor-help border-b-2 border-dotted border-slate-900 dark:border-slate-200 pb-0.5">
                        {translate('common.finish_time')}
                      </span>
                    </Tooltip>
                  </th>
                  <th
                    rowSpan={isDurationSeparated ? undefined : 2}
                    colSpan={isDurationSeparated ? 2 : undefined}
                    className={headerClass}
                  >
                    <Tooltip
                      tooltipContent={translate('summary.tabs.routing_time.tooltip.duration')}
                    >
                      <span className="cursor-help border-b-2 border-dotted border-slate-900 dark:border-slate-200 pb-0.5">
                        {translate('common.duration')}
                      </span>
                    </Tooltip>
                  </th>
                </tr>
                <tr>
                  {isStartSeparated && (
                    <>
                      <th className={subheaderDryClass}>Dry</th>
                      <th className={subheaderFrozenClass}>Frozen</th>
                    </>
                  )}
                  {isFinishSeparated && (
                    <>
                      <th className={subheaderDryClass}>Dry</th>
                      <th className={subheaderFrozenClass}>Frozen</th>
                    </>
                  )}
                  {isDurationSeparated && (
                    <>
                      <th className={subheaderDryClass}>Dry</th>
                      <th className={subheaderFrozenClass}>Frozen</th>
                    </>
                  )}
                </tr>
              </>
            ) : (
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
            )}
          </thead>
          <tbody className="bg-white dark:bg-slate-800">
            {processedData.map((row, idx) => {
              const hasDryStart = !!row.dry.start.time;
              const hasDryFinish = !!row.dry.finish.time;
              const hasFrzStart = !!row.frozen.start.time;
              const hasFrzFinish = !!row.frozen.finish.time;

              const isSunday = isDateSunday(row.dateKey);
              const isPast = isPastDate(row.dateKey);
              const isDynamicHoliday =
                isPast &&
                !hasDryStart &&
                !hasDryFinish &&
                !hasFrzStart &&
                !hasFrzFinish &&
                !isSunday;

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
                      colSpan={totalCols - 1}
                      className="px-6 py-4 font-bold text-center border-b border-gray-300 dark:border-slate-700"
                    >
                      {content}
                    </td>
                  </tr>
                );
              }

              const renderTimeCell = (type, timeType) => {
                const target = row[type][timeType];
                const hasTime = !!target.time;
                const errClass = (
                  timeType === 'start'
                    ? !hasTime && !!row[type].finish.time
                    : !hasTime && !!row[type].start.time
                )
                  ? 'bg-red-100 dark:bg-[#4a1c1c] text-red-600 dark:text-red-400 font-bold'
                  : '';
                const display = hasTime ? formatDateUniversal(target.time, 'HH:mm') : '-';

                let tooltipContent = '';
                if (errClass !== '') {
                  tooltipContent = translate(
                    `summary.tabs.routing_time.tooltip.${timeType}_time_error`
                  );
                } else if (hasTime) {
                  const invoiceText = target.truncateInvoice || '';
                  const typeData = row[type];
                  let batchInfo = '';
                  if (typeData?.batches && typeData.batches.length > 1) {
                    const mainCount = typeData.mainBatch?.tasks?.length || 0;
                    const otherBatches = typeData.batches.filter((b) => b !== typeData.mainBatch);
                    const otherTasksCount = otherBatches.reduce(
                      (acc, b) => acc + b.tasks.length,
                      0
                    );
                    batchInfo = `Batch Utama: ${mainCount} Task (${otherBatches.length} sesi lain: ${otherTasksCount} task)`;
                  }

                  const routingDayText = target.actualRoutingDay
                    ? translate
                      ? translate('summary.tabs.routing_time.tooltip.routing_done_on', {
                          day: target.actualRoutingDay,
                        })
                      : `Routing dilakukan pada hari ${target.actualRoutingDay}`
                    : '';

                  const parts = [invoiceText, batchInfo, routingDayText].filter(Boolean);
                  tooltipContent = parts.join(' • ');
                }

                return (
                  <td className={`${dataClass} ${errClass}`}>
                    <div className="flex items-center justify-center gap-1">
                      <Tooltip tooltipContent={tooltipContent}>
                        <span
                          className={
                            errClass !== ''
                              ? 'cursor-help w-full inline-block'
                              : hasTime
                                ? 'cursor-help border-b-2 border-dotted pb-0.5'
                                : ''
                          }
                        >
                          {display}
                        </span>
                      </Tooltip>
                      {hasTime && <CopyButton text={target.soNumber} />}
                    </div>
                  </td>
                );
              };

              const renderUnifiedTimeCell = (timeType) => {
                const activeType = row.dry[timeType].time ? 'dry' : 'frozen';
                const target = row[activeType][timeType];
                const hasTime = !!target.time;
                const hasAnyOpposite =
                  timeType === 'start'
                    ? !!row.dry.finish.time || !!row.frozen.finish.time
                    : !!row.dry.start.time || !!row.frozen.start.time;

                const errClass =
                  !hasTime && hasAnyOpposite
                    ? 'bg-red-100 dark:bg-[#4a1c1c] text-red-600 dark:text-red-400 font-bold'
                    : '';
                const display = hasTime ? formatDateUniversal(target.time, 'HH:mm') : '-';

                let tooltipContent = '';
                if (errClass !== '') {
                  tooltipContent = translate(
                    `summary.tabs.routing_time.tooltip.${timeType}_time_error`
                  );
                } else if (hasTime) {
                  const invoiceText = target.truncateInvoice || '';
                  const typeData = row[activeType];
                  let batchInfo = '';
                  if (typeData?.batches && typeData.batches.length > 1) {
                    const mainCount = typeData.mainBatch?.tasks?.length || 0;
                    const otherBatches = typeData.batches.filter((b) => b !== typeData.mainBatch);
                    const otherTasksCount = otherBatches.reduce(
                      (acc, b) => acc + b.tasks.length,
                      0
                    );
                    batchInfo = `Batch Utama: ${mainCount} Task (${otherBatches.length} sesi lain: ${otherTasksCount} task)`;
                  }

                  const routingDayText = target.actualRoutingDay
                    ? translate
                      ? translate('summary.tabs.routing_time.tooltip.routing_done_on', {
                          day: target.actualRoutingDay,
                        })
                      : `Routing dilakukan pada hari ${target.actualRoutingDay}`
                    : '';

                  const parts = [invoiceText, batchInfo, routingDayText].filter(Boolean);
                  tooltipContent = parts.join(' • ');
                }

                return (
                  <td className={`${dataClass} ${errClass}`}>
                    <div className="flex items-center justify-center gap-1">
                      <Tooltip tooltipContent={tooltipContent}>
                        <span
                          className={
                            errClass !== ''
                              ? 'cursor-help w-full inline-block'
                              : hasTime
                                ? 'cursor-help border-b-2 border-dotted pb-0.5'
                                : ''
                          }
                        >
                          {display}
                        </span>
                      </Tooltip>
                      {hasTime && <CopyButton text={target.soNumber} />}
                    </div>
                  </td>
                );
              };

              let dryDur = '-',
                frzDur = '-';
              if (hasDryStart && hasDryFinish)
                dryDur = formatMinutesToHHMM(
                  calculateMinuteDifference(row.dry.start.time, row.dry.finish.time),
                  false
                );
              if (hasFrzStart && hasFrzFinish)
                frzDur = formatMinutesToHHMM(
                  calculateMinuteDifference(row.frozen.start.time, row.frozen.finish.time),
                  false
                );
              const unifiedDur = dryDur !== '-' ? dryDur : frzDur;

              return (
                <tr
                  key={idx}
                  className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
                >
                  <td className={dataClass}>{row.dateDisplay}</td>

                  {isStartSeparated ? (
                    <>
                      {renderTimeCell('dry', 'start')}
                      {renderTimeCell('frozen', 'start')}
                    </>
                  ) : (
                    renderUnifiedTimeCell('start')
                  )}

                  {isFinishSeparated ? (
                    <>
                      {renderTimeCell('dry', 'finish')}
                      {renderTimeCell('frozen', 'finish')}
                    </>
                  ) : (
                    renderUnifiedTimeCell('finish')
                  )}

                  {isDurationSeparated ? (
                    <>
                      <td className={dataClass}>{dryDur}</td>
                      <td className={dataClass}>{frzDur}</td>
                    </>
                  ) : (
                    <td className={dataClass}>{unifiedDur}</td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
