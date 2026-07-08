'use client';

import Tooltip from '@/components/Tooltip';
import { formatLongDate, getBasePlate, isEmpty, isPastDate } from '@/lib/utils';
import { Fragment, useState } from 'react';
import TimeDriverModal from './modals/TimeDriverModal';

const COLOR_A = 'bg-[#fae2d5] dark:bg-[#3f2113]';
const COLOR_B = 'bg-[#dbe9f7] dark:bg-[#15233b]';
const COLOR_C = 'bg-[#f4cccc] dark:bg-[#451a1a]';

const thClass =
  'border border-gray-300 dark:border-slate-700 px-2 py-2 text-center text-xs font-bold text-slate-700 dark:text-slate-200';
const tdClass =
  'border border-gray-200 dark:border-slate-700 px-2 py-1 text-center text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap';

const stickyHeaderType = 'md:sticky md:left-0 md:z-40';
const stickyHeaderPlate = 'md:sticky md:left-[80px] md:z-40';
const stickyHeaderDriver = 'md:sticky md:left-[180px] md:z-40';
const stickyBodyType = 'md:sticky md:left-0 md:z-20 md:border-r dark:md:border-r-slate-700';
const stickyBodyPlate = 'md:sticky md:left-[80px] md:z-20 md:border-r dark:md:border-r-slate-700';
const stickyBodyDriver =
  'md:sticky md:left-[180px] md:z-20 md:border-r dark:md:border-r-slate-700 md:shadow-md';

export default function TimeDriverTab({ data, translate, localeCode, activeHubLocation }) {
  const { driverEmails, driverMap, dateKeys, dataMatrix } = data || {};
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

  const isDayEmpty = (dateStr) => {
    if (!dataMatrix || !dataMatrix[dateStr]) return true;
    return driverEmails.every((email) => {
      const metrics = dataMatrix[dateStr][email];
      return !metrics || !metrics.hasData;
    });
  };

  const checkHolidayStatus = (dateStr) => {
    const [y, m, day] = dateStr.split('-').map(Number);
    const safeDate = new Date(y, m - 1, day);
    const isSunday = safeDate.getDay() === 0;

    const isDynamic = !isSunday && isPastDate(dateStr) && isDayEmpty(dateStr);
    return {
      isHoliday: isSunday || isDynamic,
      isDynamic,
      isSunday,
    };
  };

  return (
    <Fragment>
      <div className="overflow-auto h-full relative">
        <TimeDriverModal
          isOpen={!!modalData}
          onClose={closeModal}
          data={modalData}
          translate={translate}
        />

        <table className="border-collapse w-full text-sm">
          <thead className="sticky top-0 z-30 bg-gray-100 dark:bg-slate-800">
            <tr>
              <th rowSpan="2" className={`${thClass} min-w-20 ${stickyHeaderType} ${COLOR_A}`}>
                {translate('common.storage_type')}
              </th>
              <th
                rowSpan="2"
                className={`${thClass} min-w-[100px] ${stickyHeaderPlate} ${COLOR_A}`}
              >
                {translate('common.license_number')}
              </th>
              <th
                rowSpan="2"
                className={`${thClass} min-w-[200px] ${stickyHeaderDriver} ${COLOR_A} border-r-2 border-slate-400 dark:border-slate-600`}
              >
                {translate('common.driver')}
              </th>

              {dateKeys.map((d, i) => {
                const { isHoliday, isDynamic } = checkHolidayStatus(d.str);
                const headerColor = isHoliday ? COLOR_C : COLOR_B;
                const dateText = formatLongDate(d.str, localeCode);

                const headerContent = isDynamic ? (
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
                    className={`${thClass} border-l-2 border-l-gray-400 dark:border-l-slate-600 ${headerColor}`}
                  >
                    {headerContent}
                  </th>
                );
              })}
            </tr>
            <tr>
              {dateKeys.map((d, i) => {
                const { isHoliday } = checkHolidayStatus(d.str);
                const metricColor = isHoliday ? COLOR_C : COLOR_A;
                return (
                  <Fragment key={i}>
                    <th
                      className={`${thClass} ${metricColor} border-l-2 border-l-gray-400 dark:border-l-slate-600`}
                    >
                      {translate('common.start_time')}
                    </th>
                    <th className={`${thClass} ${metricColor}`}>
                      {translate('common.finish_time')}
                    </th>
                    <th className={`${thClass} ${metricColor}`}>
                      {translate('summary.tabs.time_driver.duration')}
                    </th>
                  </Fragment>
                );
              })}
            </tr>
          </thead>

          <tbody className="bg-white dark:bg-slate-800">
            {driverEmails.map((email, rowIndex) => {
              const driver = driverMap[email];
              return (
                <tr key={email} className="hover:bg-gray-50 dark:hover:bg-slate-700/10">
                  <td className={`${tdClass} ${stickyBodyType} bg-white dark:bg-slate-800`}>
                    {driver.type}
                  </td>
                  <td className={`${tdClass} ${stickyBodyPlate} bg-white dark:bg-slate-800`}>
                    {getBasePlate(driver.plat)}
                  </td>
                  <td
                    className={`${tdClass} ${stickyBodyDriver} text-left md:border-r-2 md:border-slate-400 dark:md:border-slate-600 bg-white dark:bg-slate-800`}
                  >
                    {driver.name}
                  </td>

                  {dateKeys.map((d, i) => {
                    const metrics = dataMatrix[d.str][email];
                    const { isHoliday, isSunday } = checkHolidayStatus(d.str);
                    const baseBorder = 'border-l-2 border-l-gray-400 dark:border-l-slate-600';

                    if (isHoliday) {
                      if (rowIndex === 0) {
                        return (
                          <td
                            key={i}
                            colSpan={3}
                            rowSpan={driverEmails.length}
                            className={`${tdClass} ${baseBorder} bg-red-200 dark:bg-[#4a1c1c] text-red-900! dark:text-red-300 text-center font-bold align-middle`}
                          >
                            {isSunday
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
                          <td className={`${tdClass} ${baseBorder} ${emptyBg}`}></td>
                          <td className={`${tdClass} ${emptyBg}`}></td>
                          <td className={`${tdClass} ${emptyBg}`}></td>
                        </Fragment>
                      );
                    }

                    const hasMultiple = metrics.entries && metrics.entries.length > 1;
                    const hasCoords = metrics.entries?.some((e) => e.startLat || e.finishLat);
                    const cellCursor = hasCoords
                      ? 'cursor-pointer hover:bg-sky-50 dark:hover:bg-sky-900/30 transition-colors'
                      : '';

                    if (hasMultiple) {
                      return (
                        <td
                          key={i}
                          colSpan={3}
                          onClick={() => hasCoords && handleCellClick(metrics, driver.name, d.str)}
                          className={`${tdClass} ${baseBorder} bg-red-500 dark:bg-red-700 text-white font-bold transition-opacity ${hasCoords ? 'cursor-pointer hover:opacity-80' : ''}`}
                        >
                          {translate('common.click_for_detail')}
                        </td>
                      );
                    }

                    const hasOutStart = !!metrics.entries?.some((e) => e.isStartOutRadius === true);
                    const hasOutFinish = !!metrics.entries?.some(
                      (e) => e.isFinishOutRadius === true
                    );

                    const startWarningBg = hasOutStart ? 'bg-red-100! dark:bg-red-900/40!' : '';
                    const finishWarningBg = hasOutFinish ? 'bg-red-100! dark:bg-red-900/40!' : '';

                    const diffDay = metrics.dayDiff;
                    const hasDiffDay = !isEmpty(diffDay);
                    const finishTime = formatLongDate(metrics.finishTime, localeCode);
                    const diffDayTooltip = hasDiffDay
                      ? `${hasOutFinish ? '\n- ' : ''}${translate('summary.tabs.time_driver.tooltip.diff_day', { days: diffDay, date: finishTime })} `
                      : '';
                    const outFinishTooltip = `${hasDiffDay ? '- ' : ''}${translate('summary.tabs.time_driver.tooltip.out_finish')} ${diffDayTooltip}`;

                    return (
                      <Fragment key={d.str}>
                        <td
                          onClick={() => hasCoords && handleCellClick(metrics, driver.name, d.str)}
                          className={`${tdClass} ${baseBorder} ${startWarningBg} ${cellCursor}`}
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
                          onClick={() => hasCoords && handleCellClick(metrics, driver.name, d.str)}
                          className={`${tdClass} ${finishWarningBg} ${cellCursor}`}
                        >
                          <Tooltip
                            tooltipContent={hasOutFinish ? outFinishTooltip : diffDayTooltip}
                          >
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
                          onClick={() => hasCoords && handleCellClick(metrics, driver.name, d.str)}
                          className={`${tdClass} font-medium ${cellCursor}`}
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
      <div className="px-4 py-3 bg-white dark:bg-slate-800 rounded-b-lg border-t border-gray-200 dark:border-slate-700 text-sm shrink-0">
        <div className="text-xs text-slate-500 dark:text-slate-400 italic">
          *{translate('common.click_for_detail_param', { parameter: translate('summary.row') })}
        </div>
      </div>
    </Fragment>
  );
}
