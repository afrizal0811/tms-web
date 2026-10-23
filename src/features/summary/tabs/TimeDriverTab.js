'use client';

import Tooltip from '@/components/Tooltip';
import { formatLongDate, getBasePlate, isEmpty, isPastDate } from '@/lib/utils';
import { Fragment, useMemo, useState } from 'react';
import TimeDriverModal from './modals/TimeDriverModal';

const COLOR_A = 'bg-[#fae2d5] dark:bg-[#3f2113]';
const COLOR_B = 'bg-[#dbe9f7] dark:bg-[#15233b]';
const COLOR_C = 'bg-[#f4cccc] dark:bg-[#451a1a]';

const TH_CLASS =
  'border border-gray-300 dark:border-slate-700 px-2 py-2 text-center text-xs font-bold text-slate-700 dark:text-slate-200';
const TD_CLASS =
  'border border-gray-200 dark:border-slate-700 px-2 py-1 text-center text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap';

const STICKY_HEADER_TYPE = 'md:sticky md:left-0 md:z-40';
const STICKY_HEADER_PLATE = 'md:sticky md:left-[80px] md:z-40';
const STICKY_HEADER_DRIVER = 'md:sticky md:left-[180px] md:z-40';
const STICKY_BODY_TYPE = 'md:sticky md:left-0 md:z-20 md:border-r dark:md:border-r-slate-700';
const STICKY_BODY_PLATE = 'md:sticky md:left-[80px] md:z-20 md:border-r dark:md:border-r-slate-700';
const STICKY_BODY_DRIVER =
  'md:sticky md:left-[180px] md:z-20 md:border-r dark:md:border-r-slate-700 md:shadow-md';

function getFinishTooltip({ hasOutFinish, hasDiffDay, diffDay, finishTime, translate }) {
  if (!hasOutFinish && !hasDiffDay) return '';
  const diffDayTooltip = hasDiffDay
    ? `${hasOutFinish ? '\n- ' : ''}${translate('summary.tabs.time_driver.tooltip.diff_day', { days: diffDay, date: finishTime })} `
    : '';
  return hasOutFinish
    ? `${hasDiffDay ? '- ' : ''}${translate('summary.tabs.time_driver.tooltip.out_finish')} ${diffDayTooltip}`
    : diffDayTooltip;
}

export default function TimeDriverTab({ data, translate, localeCode, activeHubLocation }) {
  const { driverEmails = [], driverMap = {}, dateKeys = [], dataMatrix = {} } = data || {};
  const [modalData, setModalData] = useState(null);

  const handleCellClick = (metrics, driverName, dateStr) => {
    const hasCoords = metrics?.entries?.some((e) => e.startLat || e.finishLat);
    if (hasCoords) {
      setModalData({
        driverName,
        dateStr: formatLongDate(dateStr, localeCode),
        entries: metrics.entries,
        activeHubLocation,
      });
    }
  };

  const closeModal = () => setModalData(null);

  const holidayStatusMap = useMemo(() => {
    const map = {};
    if (!dateKeys || !dataMatrix) return map;

    for (const d of dateKeys) {
      const dateStr = d.str;
      if (!dateStr) continue;
      const [y, m, day] = dateStr.split('-').map(Number);
      const isSunday = new Date(y, m - 1, day).getDay() === 0;

      const dayIsEmpty =
        !dataMatrix[dateStr] ||
        driverEmails.every((email) => {
          const metrics = dataMatrix[dateStr][email];
          return !metrics || !metrics.hasData;
        });

      const isDynamic = !isSunday && isPastDate(dateStr) && dayIsEmpty;

      map[dateStr] = {
        isHoliday: isSunday || isDynamic,
        isDynamic,
        isSunday,
        dayIsEmpty,
      };
    }
    return map;
  }, [dateKeys, dataMatrix, driverEmails]);

  return (
    <Fragment>
      <div className="overflow-auto h-full relative">
        <TimeDriverModal
          isOpen={Boolean(modalData)}
          onClose={closeModal}
          data={modalData}
          translate={translate}
        />

        <table className="border-collapse w-full text-sm">
          <thead className="sticky top-0 z-30 bg-gray-100 dark:bg-slate-800">
            <tr>
              <th rowSpan="2" className={`${TH_CLASS} min-w-20 ${STICKY_HEADER_TYPE} ${COLOR_A}`}>
                {translate('common.storage_type')}
              </th>
              <th
                rowSpan="2"
                className={`${TH_CLASS} min-w-[100px] ${STICKY_HEADER_PLATE} ${COLOR_A}`}
              >
                {translate('common.license_number')}
              </th>
              <th
                rowSpan="2"
                className={`${TH_CLASS} min-w-[200px] ${STICKY_HEADER_DRIVER} ${COLOR_A} border-r-2 border-slate-400 dark:border-slate-600`}
              >
                {translate('common.driver')}
              </th>

              {dateKeys.map((d, i) => {
                const holidayInfo = holidayStatusMap[d.str] || {};
                const headerColor = holidayInfo.isHoliday ? COLOR_C : COLOR_B;
                const dateText = formatLongDate(d.str, localeCode);

                const headerContent = holidayInfo.isDynamic ? (
                  <Tooltip tooltipContent={translate('summary.tabs.task_summary.caution')}>
                    <span className="cursor-help border-b-2 border-dotted border-red-900 dark:border-red-300 pb-0.5">
                      {dateText}
                    </span>
                  </Tooltip>
                ) : (
                  dateText
                );

                return (
                  <th
                    key={i}
                    colSpan="3"
                    className={`${TH_CLASS} border-l-2 border-l-gray-400 dark:border-l-slate-600 ${headerColor}`}
                  >
                    {headerContent}
                  </th>
                );
              })}
            </tr>
            <tr>
              {dateKeys.map((d, i) => {
                const holidayInfo = holidayStatusMap[d.str] || {};
                const metricColor = holidayInfo.isHoliday ? COLOR_C : COLOR_A;
                return (
                  <Fragment key={i}>
                    <th
                      className={`${TH_CLASS} ${metricColor} border-l-2 border-l-gray-400 dark:border-l-slate-600`}
                    >
                      {translate('common.start_time')}
                    </th>
                    <th className={`${TH_CLASS} ${metricColor}`}>
                      {translate('common.finish_time')}
                    </th>
                    <th className={`${TH_CLASS} ${metricColor}`}>
                      {translate('common.duration')}
                    </th>
                  </Fragment>
                );
              })}
            </tr>
          </thead>

          <tbody className="bg-white dark:bg-slate-800">
            {driverEmails.map((email, rowIndex) => {
              const driver = driverMap[email] || {};
              return (
                <tr key={email} className="hover:bg-gray-50 dark:hover:bg-slate-700/10">
                  <td className={`${TD_CLASS} ${STICKY_BODY_TYPE} bg-white dark:bg-slate-800`}>
                    {driver.type}
                  </td>
                  <td className={`${TD_CLASS} ${STICKY_BODY_PLATE} bg-white dark:bg-slate-800`}>
                    {getBasePlate(driver.plat)}
                  </td>
                  <td
                    className={`${TD_CLASS} ${STICKY_BODY_DRIVER} text-left md:border-r-2 md:border-slate-400 dark:md:border-slate-600 bg-white dark:bg-slate-800`}
                  >
                    {driver.name}
                  </td>

                  {dateKeys.map((d, i) => {
                    const metrics = dataMatrix[d.str]?.[email];
                    const holidayInfo = holidayStatusMap[d.str] || {};
                    const baseBorder = 'border-l-2 border-l-gray-400 dark:border-l-slate-600';

                    if (holidayInfo.isHoliday) {
                      if (rowIndex === 0) {
                        return (
                          <td
                            key={i}
                            colSpan={3}
                            rowSpan={driverEmails.length}
                            className={`${TD_CLASS} ${baseBorder} bg-red-200 dark:bg-[#4a1c1c] text-red-900! dark:text-red-300 text-center font-bold align-middle`}
                          >
                            {holidayInfo.isSunday
                              ? translate('common.holiday_sunday')
                              : translate('common.holiday')}
                          </td>
                        );
                      }
                      return null;
                    }

                    const emptyBg = 'bg-gray-50 dark:bg-slate-800/50';

                    if (!metrics || !metrics.hasData) {
                      return (
                        <Fragment key={i}>
                          <td className={`${TD_CLASS} ${baseBorder} ${emptyBg}`} />
                          <td className={`${TD_CLASS} ${emptyBg}`} />
                          <td className={`${TD_CLASS} ${emptyBg}`} />
                        </Fragment>
                      );
                    }

                    const hasMultiple = metrics.entries && metrics.entries.length > 1;
                    const hasCoords = metrics.entries?.some((e) => e.startLat || e.finishLat);
                    const cellCursor = hasCoords
                      ? 'cursor-pointer hover:bg-sky-50 dark:hover:bg-sky-900/30 transition-colors'
                      : '';
                    const onCellAction = hasCoords
                      ? () => handleCellClick(metrics, driver.name, d.str)
                      : undefined;

                    if (hasMultiple) {
                      return (
                        <td
                          key={i}
                          colSpan={3}
                          onClick={onCellAction}
                          className={`${TD_CLASS} ${baseBorder} bg-red-500 dark:bg-red-700 text-white font-bold transition-opacity ${hasCoords ? 'cursor-pointer hover:opacity-80' : ''}`}
                        >
                          {translate('common.click_for_detail')}
                        </td>
                      );
                    }

                    const hasOutStart = Boolean(metrics.entries?.some((e) => e.isStartOutRadius === true));
                    const hasOutFinish = Boolean(metrics.entries?.some((e) => e.isFinishOutRadius === true));

                    const startWarningBg = hasOutStart ? 'bg-red-100! dark:bg-red-900/40!' : '';
                    const finishWarningBg = hasOutFinish ? 'bg-red-100! dark:bg-red-900/40!' : '';

                    const diffDay = metrics.dayDiff;
                    const hasDiffDay = !isEmpty(diffDay);
                    const finishTime = formatLongDate(metrics.finishTime, localeCode);
                    const finishTooltipContent = getFinishTooltip({
                      hasOutFinish,
                      hasDiffDay,
                      diffDay,
                      finishTime,
                      translate,
                    });

                    return (
                      <Fragment key={d.str}>
                        <td
                          onClick={onCellAction}
                          className={`${TD_CLASS} ${baseBorder} ${startWarningBg} ${cellCursor}`}
                        >
                          <Tooltip
                            tooltipContent={
                              hasOutStart
                                ? translate('summary.tabs.time_driver.tooltip.out_start')
                                : ''
                            }
                          >
                            <span className="block w-full">{metrics.startDisplay}</span>
                          </Tooltip>
                        </td>

                        <td
                          onClick={onCellAction}
                          className={`${TD_CLASS} ${finishWarningBg} ${cellCursor}`}
                        >
                          <Tooltip tooltipContent={finishTooltipContent}>
                            <div className="flex items-center justify-center w-full">
                              {metrics.finishDisplay}
                              {hasDiffDay && (
                                <span className="text-red-600 dark:text-red-400 text-[10px] ml-1 font-bold">
                                  (+{diffDay})
                                </span>
                              )}
                            </div>
                          </Tooltip>
                        </td>

                        <td
                          onClick={onCellAction}
                          className={`${TD_CLASS} font-medium ${cellCursor}`}
                        >
                          {metrics.durationDisplay}
                        </td>
                      </Fragment>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Fragment>
  );
}
