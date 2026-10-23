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

const HEADER_CLASS =
  'px-6 py-3 border-r border-b border-gray-300 dark:border-slate-700 font-bold w-1/3 text-center min-w-[200px]';
const DATA_CLASS =
  'px-6 py-4 font-medium text-slate-900 dark:text-slate-200 border-r border-b border-gray-200 dark:border-slate-700 text-center';
const SUBHEADER_DRY_CLASS =
  'px-6 py-3 border-r border-b border-gray-300 dark:border-slate-700 font-bold text-center bg-[#fae2d5] dark:bg-slate-800 dark:bg-gradient-to-t dark:from-[#fae2d5]/10 dark:to-[#fae2d5]/10 text-slate-800 dark:text-slate-200';
const SUBHEADER_FROZEN_CLASS =
  'px-6 py-3 border-r border-b border-gray-300 dark:border-slate-700 font-bold text-center bg-[#dbe9f7] dark:bg-slate-800 dark:bg-gradient-to-t dark:from-[#dbe9f7]/10 dark:to-[#dbe9f7]/10 text-slate-800 dark:text-slate-200';
const HEADER_TITLES = ['routing_date', 'start_time', 'finish_time', 'duration'];
const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

function isValidAssignedTimeWIB(createdIso, assignedIso) {
  if (!createdIso || !assignedIso) return false;

  const cTime = new Date(createdIso).getTime();
  const aTime = new Date(assignedIso).getTime();

  if (isNaN(cTime) || isNaN(aTime) || aTime < cTime) return false;

  const cWIB = new Date(cTime + WIB_OFFSET_MS);
  const aWIB = new Date(aTime + WIB_OFFSET_MS);

  const maxWIB = new Date(
    Date.UTC(cWIB.getUTCFullYear(), cWIB.getUTCMonth(), cWIB.getUTCDate() + 1, 3, 0, 0)
  );

  return aWIB.getTime() <= maxWIB.getTime();
}

function isValidRoutingTimeWIB(utcString) {
  if (!utcString) return false;
  const d = new Date(utcString);
  if (isNaN(d.getTime())) return false;

  const wibDate = new Date(d.getTime() + WIB_OFFSET_MS);
  const day = wibDate.getUTCDay();
  const hour = wibDate.getUTCHours();

  if (day >= 1 && day <= 5) return hour >= 15;
  if (day === 6) return hour >= 11;
  return true;
}

function isTimeDifferent(t1, t2) {
  if (!t1 && !t2) return false;
  if (!t1 || !t2) return true;
  return Math.abs(new Date(t1).getTime() - new Date(t2).getTime()) > 60000;
}

function createEmptyTypeData() {
  return {
    start: { time: null, name: null, soNumber: null },
    finish: { time: null, name: null, soNumber: null },
    batches: [],
    mainBatch: null,
  };
}

function mapTaskResult(task, time, actualRoutingDay) {
  return {
    time,
    name: task?.name || null,
    soNumber: task?.soNumber || null,
    truncateInvoice: task?.truncateInvoice || null,
    actualRoutingDay,
  };
}

function getTooltipContent({ target, typeData, hasError, timeType, translate }) {
  if (hasError) {
    return translate(`summary.tabs.routing_time.tooltip.${timeType}_time_error`);
  }
  if (!target?.time) return '';

  const invoiceText = target.truncateInvoice || '';
  let batchInfo = '';
  if (typeData?.batches && typeData.batches.length > 1) {
    const mainCount = typeData.mainBatch?.tasks?.length || 0;
    const otherBatches = typeData.batches.filter((b) => b !== typeData.mainBatch);
    const otherTasksCount = otherBatches.reduce((acc, b) => acc + b.tasks.length, 0);
    batchInfo = `Batch Utama: ${mainCount} Task (${otherBatches.length} sesi lain: ${otherTasksCount} task)`;
  }

  const routingDayText = target.actualRoutingDay
    ? translate?.('summary.tabs.routing_time.tooltip.routing_done_on', {
        day: target.actualRoutingDay,
      }) || `Routing dilakukan pada hari ${target.actualRoutingDay}`
    : '';

  return [invoiceText, batchInfo, routingDayText].filter(Boolean).join(' • ');
}

function TimeCell({ target, typeData, hasError, timeType, translate }) {
  const hasTime = Boolean(target?.time);
  const errClass = hasError
    ? 'bg-red-100 dark:bg-[#4a1c1c] text-red-600 dark:text-red-400 font-bold'
    : '';
  const display = hasTime ? formatDateUniversal(target.time, 'HH:mm') : '-';
  const tooltipContent = getTooltipContent({ target, typeData, hasError, timeType, translate });

  const spanClass = hasError
    ? 'cursor-help w-full inline-block'
    : hasTime
      ? 'cursor-help border-b-2 border-dotted pb-0.5 border-red-700 dark:border-red-300'
      : '';

  return (
    <td className={`${DATA_CLASS} ${errClass}`}>
      <div className="flex items-center justify-center gap-1">
        <Tooltip tooltipContent={tooltipContent}>
          <span className={spanClass}>{display}</span>
        </Tooltip>
        {hasTime && <CopyButton text={target.soNumber} />}
      </div>
    </td>
  );
}

function ColumnHeader({ titleKey, tooltipKey, translate, rowSpan, colSpan }) {
  return (
    <th rowSpan={rowSpan} colSpan={colSpan} className={HEADER_CLASS}>
      <Tooltip tooltipContent={translate(tooltipKey)}>
        <span className="cursor-help border-b-2 border-dotted border-slate-900 dark:border-slate-200 pb-0.5">
          {translate(titleKey)}
        </span>
      </Tooltip>
    </th>
  );
}

function Subheaders({ isSeparated }) {
  if (!isSeparated) return null;
  return (
    <>
      <th className={SUBHEADER_DRY_CLASS}>Dry</th>
      <th className={SUBHEADER_FROZEN_CLASS}>Frozen</th>
    </>
  );
}

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
        dateKey,
        dateDisplay: displayDate,
        dry: createEmptyTypeData(),
        frozen: createEmptyTypeData(),
      };
      tasksByDate[dateKey] = { dry: [], frozen: [] };
      current.setDate(current.getDate() + 1);
    }

    if (tasks && Array.isArray(tasks)) {
      for (const task of tasks) {
        const isApi = !task.createdFrom || task.createdFrom === 'API';
        if (!isApi || task.flow !== 'Delivery' || !task.createdTime) continue;
        if (!isValidRoutingTimeWIB(task.createdTime)) continue;

        const taskDateKey = getTargetRoutingDate(task.startTime, task.createdTime);
        const targetRow = taskDateKey ? dataMap[taskDateKey] : null;

        if (targetRow && tasksByDate[taskDateKey]) {
          const parsedCustomer =
            parseCustomerString(task.customerOrder) ||
            parseCustomerString(task.customerName) ||
            {};

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
              name: parsedCustomer.name,
              soNumber: parsedCustomer.invoiceNumber,
              truncateInvoice: parsedCustomer.truncateInvoice,
            });
          }
        }
      }
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
              const wibDate = new Date(cTime + WIB_OFFSET_MS);
              actualRoutingDay = wibDate.toLocaleDateString(
                localeCode === 'en' ? 'en-US' : 'id-ID',
                { weekday: 'long', timeZone: 'UTC' }
              );
            }
          }

          dataMap[dateKey][type].start = mapTaskResult(
            result.startTask,
            result.startTime,
            actualRoutingDay
          );
          dataMap[dateKey][type].finish = mapTaskResult(
            result.finishTask,
            result.finishTime,
            actualRoutingDay
          );
          dataMap[dateKey][type].batches = result.batches;
          dataMap[dateKey][type].mainBatch = result.mainBatch;
        }
      });
    });

    return Object.keys(dataMap)
      .sort()
      .map((key) => dataMap[key]);
  }, [tasks, startDateStr, endDateStr, localeCode]);

  const { isStartSeparated, isFinishSeparated, isDurationSeparated, hasAnySeparation, totalCols } =
    useMemo(() => {
      const isStartDiff = processedData.some((row) =>
        isTimeDifferent(row.dry.start.time, row.frozen.start.time)
      );
      const isFinishDiff = processedData.some((row) =>
        isTimeDifferent(row.dry.finish.time, row.frozen.finish.time)
      );
      const anySeparation = isStartDiff || isFinishDiff;
      const cols = 1 + (isStartDiff ? 2 : 1) + (isFinishDiff ? 2 : 1) + (anySeparation ? 2 : 1);

      return {
        isStartSeparated: isStartDiff,
        isFinishSeparated: isFinishDiff,
        isDurationSeparated: anySeparation,
        hasAnySeparation: anySeparation,
        totalCols: cols,
      };
    }, [processedData]);

  return (
    <div className="w-full h-full flex flex-col bg-white dark:bg-slate-800 shadow-sm p-0 overflow-auto">
      <div className="flex-1 overflow-auto">
        <table className="min-w-full text-sm text-left border-collapse">
          <thead className="text-xs text-slate-900 dark:text-slate-200 uppercase sticky top-0 z-10 bg-purple-200 dark:bg-[#34205c]">
            {hasAnySeparation ? (
              <>
                <tr>
                  <th rowSpan={2} className={HEADER_CLASS}>
                    {translate('common.routing_date')}
                  </th>
                  <ColumnHeader
                    rowSpan={isStartSeparated ? undefined : 2}
                    colSpan={isStartSeparated ? 2 : undefined}
                    titleKey="common.start_time"
                    tooltipKey="summary.tabs.routing_time.tooltip.start_time"
                    translate={translate}
                  />
                  <ColumnHeader
                    rowSpan={isFinishSeparated ? undefined : 2}
                    colSpan={isFinishSeparated ? 2 : undefined}
                    titleKey="common.finish_time"
                    tooltipKey="summary.tabs.routing_time.tooltip.finish_time"
                    translate={translate}
                  />
                  <ColumnHeader
                    rowSpan={isDurationSeparated ? undefined : 2}
                    colSpan={isDurationSeparated ? 2 : undefined}
                    titleKey="common.duration"
                    tooltipKey="summary.tabs.routing_time.tooltip.duration"
                    translate={translate}
                  />
                </tr>
                <tr>
                  <Subheaders isSeparated={isStartSeparated} />
                  <Subheaders isSeparated={isFinishSeparated} />
                  <Subheaders isSeparated={isDurationSeparated} />
                </tr>
              </>
            ) : (
              <tr>
                {HEADER_TITLES.map((header) => (
                  <ColumnHeader
                    key={header}
                    titleKey={`common.${header}`}
                    tooltipKey={`summary.tabs.routing_time.tooltip.${header}`}
                    translate={translate}
                  />
                ))}
              </tr>
            )}
          </thead>
          <tbody className="bg-white dark:bg-slate-800">
            {processedData.map((row, idx) => {
              const hasDryStart = Boolean(row.dry.start.time);
              const hasDryFinish = Boolean(row.dry.finish.time);
              const hasFrzStart = Boolean(row.frozen.start.time);
              const hasFrzFinish = Boolean(row.frozen.finish.time);
              const hasAnyTime = hasDryStart || hasDryFinish || hasFrzStart || hasFrzFinish;

              const isSunday = isDateSunday(row.dateKey);
              const isPast = isPastDate(row.dateKey);
              const isDynamicHoliday = isPast && !hasAnyTime && !isSunday;

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

              const dryDur =
                hasDryStart && hasDryFinish
                  ? formatMinutesToHHMM(
                      calculateMinuteDifference(row.dry.start.time, row.dry.finish.time)
                    )
                  : '-';
              const frzDur =
                hasFrzStart && hasFrzFinish
                  ? formatMinutesToHHMM(
                      calculateMinuteDifference(row.frozen.start.time, row.frozen.finish.time)
                    )
                  : '-';
              const unifiedDur = dryDur !== '-' ? dryDur : frzDur;

              const unifiedActiveStartType = row.dry.start.time ? 'dry' : 'frozen';
              const unifiedActiveFinishType = row.dry.finish.time ? 'dry' : 'frozen';

              return (
                <tr
                  key={idx}
                  className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
                >
                  <td className={DATA_CLASS}>{row.dateDisplay}</td>

                  {isStartSeparated ? (
                    <>
                      <TimeCell
                        target={row.dry.start}
                        typeData={row.dry}
                        hasError={!row.dry.start.time && Boolean(row.dry.finish.time)}
                        timeType="start"
                        translate={translate}
                      />
                      <TimeCell
                        target={row.frozen.start}
                        typeData={row.frozen}
                        hasError={!row.frozen.start.time && Boolean(row.frozen.finish.time)}
                        timeType="start"
                        translate={translate}
                      />
                    </>
                  ) : (
                    <TimeCell
                      target={row[unifiedActiveStartType].start}
                      typeData={row[unifiedActiveStartType]}
                      hasError={
                        !row[unifiedActiveStartType].start.time &&
                        Boolean(row.dry.finish.time || row.frozen.finish.time)
                      }
                      timeType="start"
                      translate={translate}
                    />
                  )}

                  {isFinishSeparated ? (
                    <>
                      <TimeCell
                        target={row.dry.finish}
                        typeData={row.dry}
                        hasError={!row.dry.finish.time && Boolean(row.dry.start.time)}
                        timeType="finish"
                        translate={translate}
                      />
                      <TimeCell
                        target={row.frozen.finish}
                        typeData={row.frozen}
                        hasError={!row.frozen.finish.time && Boolean(row.frozen.start.time)}
                        timeType="finish"
                        translate={translate}
                      />
                    </>
                  ) : (
                    <TimeCell
                      target={row[unifiedActiveFinishType].finish}
                      typeData={row[unifiedActiveFinishType]}
                      hasError={
                        !row[unifiedActiveFinishType].finish.time &&
                        Boolean(row.dry.start.time || row.frozen.start.time)
                      }
                      timeType="finish"
                      translate={translate}
                    />
                  )}

                  {isDurationSeparated ? (
                    <>
                      <td className={DATA_CLASS}>{dryDur}</td>
                      <td className={DATA_CLASS}>{frzDur}</td>
                    </>
                  ) : (
                    <td className={DATA_CLASS}>{unifiedDur}</td>
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
