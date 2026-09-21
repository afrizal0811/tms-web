'use client';

import Tooltip from '@/components/Tooltip';
import { Fragment } from 'react';

const thClass =
  'border border-gray-300 dark:border-slate-700 px-2 py-2 text-center text-xs font-bold text-slate-700 dark:text-slate-200';
const tdClass =
  'border border-gray-200 dark:border-slate-700 px-2 py-1 text-center text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap';

const bgHeader = 'bg-[#d9d2e9] dark:bg-slate-800';
const bgDry = 'bg-[#fae2d5] dark:bg-slate-800';
const bgFrozen = 'bg-[#dbe9f7] dark:bg-slate-800';
const bgTotal = 'bg-[#d9f2d0] dark:bg-slate-700/80 font-bold';

const bgHolidayHeader = 'bg-[#ffc7ce] dark:bg-[#4a1c1c] text-red-900 dark:text-red-300 font-bold';
const bgHolidayDry = 'bg-[#ffc7ce] dark:bg-[#4a1c1c] text-red-900 dark:text-red-300 font-bold';
const bgHolidayFrozen = 'bg-[#ffc7ce] dark:bg-[#4a1c1c] text-red-900 dark:text-red-300 font-bold';
const bgHolidayBody = 'bg-[#ffc7ce] dark:bg-[#4a1c1c] text-red-900 dark:text-red-300 font-bold';

const thickBorderClass = 'border-r-[3px] border-r-slate-400 dark:border-r-slate-500';

export default function ServiceLevelTable({
  dateKeys = [],
  dateMap = {},
  daysList = [],
  totalRowsCount = 0,
  translate,
  onCellClick,
}) {
  return (
    <table className="border-separate border-spacing-0 border-0 text-sm whitespace-nowrap min-w-max">
      <thead>
        <tr>
          <th
            rowSpan="3"
            className={`${thClass} w-[90px] min-w-[90px] max-w-[90px] sticky left-0 z-30 ${thickBorderClass} ${bgHeader}`}
          >
            {translate('common.day')}
          </th>
          {dateKeys.map((d, i) => {
            const headerColor = d.isHoliday ? bgHolidayHeader : bgHeader;
            const dm = dateMap[d.str];

            return (
              <th
                key={i}
                colSpan="4"
                className={`${thClass} ${thickBorderClass} min-w-60 ${headerColor} align-middle`}
              >
                {d.isDynamicHoliday ? (
                  <Tooltip tooltipContent={translate('summary.tabs.task_summary.caution')}>
                    <span className="cursor-help border-b-2 border-dotted border-red-900 dark:border-red-300 pb-0.5">
                      {dm.displayDate}
                    </span>
                  </Tooltip>
                ) : (
                  dm.displayDate
                )}
              </th>
            );
          })}
        </tr>
        <tr>
          {dateKeys.map((d, i) => {
            const dryColor = d.isHoliday ? bgHolidayDry : bgDry;
            const frzColor = d.isHoliday ? bgHolidayFrozen : bgFrozen;
            return (
              <Fragment key={i}>
                <th colSpan="2" className={`${thClass} ${dryColor}`}>
                  DRY
                </th>
                <th colSpan="2" className={`${thClass} ${thickBorderClass} ${frzColor}`}>
                  FROZEN
                </th>
              </Fragment>
            );
          })}
        </tr>
        <tr>
          {dateKeys.map((d, i) => {
            const dryColor = d.isHoliday ? bgHolidayDry : bgDry;
            const frzColor = d.isHoliday ? bgHolidayFrozen : bgFrozen;
            return (
              <Fragment key={i}>
                <th className={`${thClass} ${dryColor} min-w-[60px]`}>
                  {translate('common.task')}
                </th>
                <th className={`${thClass} ${dryColor} min-w-[60px]`}>%</th>
                <th className={`${thClass} ${frzColor} min-w-[60px]`}>
                  {translate('common.task')}
                </th>
                <th className={`${thClass} ${thickBorderClass} ${frzColor} min-w-[60px]`}>%</th>
              </Fragment>
            );
          })}
        </tr>
      </thead>
      <tbody>
        {daysList.map((dayNum, rowIdx) => {
          return (
            <tr key={dayNum} className="hover:bg-gray-50/50 dark:hover:bg-slate-700/20">
              <td
                className={`${tdClass} w-[90px] min-w-[90px] max-w-[90px] font-bold sticky left-0 z-20 ${thickBorderClass} ${bgHeader}`}
              >
                {dayNum}
              </td>

              {dateKeys.map((d, i) => {
                if (d.isHoliday) {
                  if (rowIdx === 0) {
                    return (
                      <td
                        key={i}
                        colSpan={4}
                        rowSpan={totalRowsCount}
                        className={`border border-gray-300 dark:border-slate-700 px-2 py-1 text-center font-bold align-middle ${bgHolidayBody} ${thickBorderClass}`}
                      >
                        {d.isSunday
                          ? translate('common.holiday_sunday')
                          : translate('common.holiday')}
                      </td>
                    );
                  }
                  return null;
                }

                const dm = dateMap[d.str];
                const dryTotal = dm.dryTasks.length;
                const frzTotal = dm.frozenTasks.length;

                const dryTasks = dm.Dry[dayNum] || [];
                const dryCount = dryTasks.length;
                const dryPct = dryTotal > 0 ? (dryCount / dryTotal) * 100 : 0;

                const frzTasks = dm.Frozen[dayNum] || [];
                const frzCount = frzTasks.length;
                const frzPct = frzTotal > 0 ? (frzCount / frzTotal) * 100 : 0;

                return (
                  <Fragment key={i}>
                    <td
                      className={`${tdClass} group/dry ${dryCount > 0 ? 'cursor-pointer hover:bg-orange-200/60 dark:hover:bg-orange-900/40 font-medium text-slate-800 dark:text-slate-100' : ''}`}
                      onClick={() =>
                        dryCount > 0 && onCellClick && onCellClick(dryTasks, 'Dry', dayNum, d.str)
                      }
                    >
                      {dryCount > 0 ? dryCount : null}
                    </td>
                    <td
                      className={`${tdClass} group-hover/dry:bg-orange-200/60 dark:group-hover/dry:bg-orange-900/40 ${dryCount > 0 ? 'cursor-pointer hover:bg-orange-200/60 dark:hover:bg-orange-900/40 font-medium text-slate-800 dark:text-slate-100' : ''}`}
                      onClick={() =>
                        dryCount > 0 && onCellClick && onCellClick(dryTasks, 'Dry', dayNum, d.str)
                      }
                    >
                      {dryCount > 0 ? `${dryPct.toFixed(2)}%` : null}
                    </td>
                    <td
                      className={`${tdClass} group/frz ${frzCount > 0 ? 'cursor-pointer hover:bg-blue-200/60 dark:hover:bg-blue-900/40 font-medium text-slate-800 dark:text-slate-100' : ''}`}
                      onClick={() =>
                        frzCount > 0 &&
                        onCellClick &&
                        onCellClick(frzTasks, 'Frozen', dayNum, d.str)
                      }
                    >
                      {frzCount > 0 ? frzCount : null}
                    </td>
                    <td
                      className={`${tdClass} ${thickBorderClass} group-hover/frz:bg-blue-200/60 dark:group-hover/frz:bg-blue-900/40 ${frzCount > 0 ? 'cursor-pointer hover:bg-blue-200/60 dark:hover:bg-blue-900/40 font-medium text-slate-800 dark:text-slate-100' : ''}`}
                      onClick={() =>
                        frzCount > 0 &&
                        onCellClick &&
                        onCellClick(frzTasks, 'Frozen', dayNum, d.str)
                      }
                    >
                      {frzCount > 0 ? `${frzPct.toFixed(2)}%` : null}
                    </td>
                  </Fragment>
                );
              })}
            </tr>
          );
        })}

        <tr className={bgTotal}>
          <td
            className={`${tdClass} w-[90px] min-w-[90px] max-w-[90px] font-bold sticky left-0 z-20 ${thickBorderClass} ${bgTotal}`}
          >
            Total
          </td>

          {dateKeys.map((d, i) => {
            if (d.isHoliday) return null;

            const dm = dateMap[d.str];
            const dryTotal = dm.dryTasks.length;
            const frzTotal = dm.frozenTasks.length;

            return (
              <Fragment key={`tot-${i}`}>
                <td
                  colSpan="2"
                  className={`${tdClass} ${dryTotal > 0 ? 'cursor-pointer hover:bg-emerald-200/70 dark:hover:bg-emerald-900/60 font-bold' : ''}`}
                  onClick={() =>
                    dryTotal > 0 && onCellClick && onCellClick(dm.dryTasks, 'Dry', '', d.str)
                  }
                >
                  {dryTotal > 0 ? dryTotal : 0}
                </td>
                <td
                  colSpan="2"
                  className={`${tdClass} ${thickBorderClass} ${frzTotal > 0 ? 'cursor-pointer hover:bg-emerald-200/70 dark:hover:bg-emerald-900/60 font-bold' : ''}`}
                  onClick={() =>
                    frzTotal > 0 && onCellClick && onCellClick(dm.frozenTasks, 'Frozen', '', d.str)
                  }
                >
                  {frzTotal > 0 ? frzTotal : 0}
                </td>
              </Fragment>
            );
          })}
        </tr>
      </tbody>
    </table>
  );
}
