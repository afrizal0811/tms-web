'use client';

import { useMemo } from 'react';

const thClass =
  'border border-gray-300 dark:border-slate-700 px-2 py-1 text-center text-xs font-bold text-slate-700 dark:text-slate-200';
const tdClass =
  'border border-gray-200 dark:border-slate-700 px-2 py-1 text-center text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap';

const bgHeader = 'bg-[#d9d2e9] dark:bg-slate-800';
const bgDry = 'bg-[#fae2d5] dark:bg-slate-800';
const bgFrozen = 'bg-[#dbe9f7] dark:bg-slate-800';
const bgTotal = 'bg-[#d9f2d0] dark:bg-slate-700/80 font-bold';

export default function ServiceLevelSummaryTable({
  dateKeys = [],
  dateMap = {},
  daysList = [],
  translate,
  onCellClick,
  dateRangeStr,
}) {
  const summaryData = useMemo(() => {
    const data = daysList.map((dayNum) => {
      const dryTasks = [];
      const frozenTasks = [];

      dateKeys.forEach((d) => {
        if (!d.isHoliday) {
          const dm = dateMap[d.str];
          if (dm && dm.Dry[dayNum]) dryTasks.push(...dm.Dry[dayNum]);
          if (dm && dm.Frozen[dayNum]) frozenTasks.push(...dm.Frozen[dayNum]);
        }
      });

      return {
        dayNum,
        dryTasks,
        frozenTasks,
      };
    });

    const totalDryTasks = data.reduce((acc, curr) => acc + curr.dryTasks.length, 0);
    const totalFrozenTasks = data.reduce((acc, curr) => acc + curr.frozenTasks.length, 0);

    const allDryTasks = [];
    const allFrozenTasks = [];
    data.forEach((item) => {
      allDryTasks.push(...item.dryTasks);
      allFrozenTasks.push(...item.frozenTasks);
    });

    return { rows: data, totalDryTasks, totalFrozenTasks, allDryTasks, allFrozenTasks };
  }, [dateKeys, dateMap, daysList]);

  return (
    <div className="w-full max-w-2xl">
      <table className="border-collapse text-sm border border-gray-300 dark:border-slate-700 w-full">
        <thead>
          <tr>
            <th rowSpan="3" className={`${thClass} ${bgHeader} w-[90px]`}>
              {translate('common.day')}
            </th>
            <th colSpan="4" className={`${thClass} ${bgHeader} py-2`}>
              {dateRangeStr || '-'}
            </th>
          </tr>
          <tr>
            <th colSpan="2" className={`${thClass} ${bgDry}`}>
              DRY
            </th>
            <th colSpan="2" className={`${thClass} ${bgFrozen}`}>
              FROZEN
            </th>
          </tr>
          <tr>
            <th className={`${thClass} ${bgDry} min-w-20`}>{translate('common.task')}</th>
            <th className={`${thClass} ${bgDry} min-w-20`}>%</th>
            <th className={`${thClass} ${bgFrozen} min-w-20`}>{translate('common.task')}</th>
            <th className={`${thClass} ${bgFrozen} min-w-20`}>%</th>
          </tr>
        </thead>
        <tbody>
          {summaryData.rows.length === 0 ? (
            <tr>
              <td colSpan="5" className={`${tdClass} py-4 text-gray-400 italic`}>
                {translate('common.no_data')}
              </td>
            </tr>
          ) : (
            summaryData.rows.map((row) => {
              const dryCount = row.dryTasks.length;
              const dryPct =
                summaryData.totalDryTasks > 0 ? (dryCount / summaryData.totalDryTasks) * 100 : 0;

              const frzCount = row.frozenTasks.length;
              const frzPct =
                summaryData.totalFrozenTasks > 0
                  ? (frzCount / summaryData.totalFrozenTasks) * 100
                  : 0;

              return (
                <tr key={row.dayNum} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                  <td className={`${tdClass} font-bold text-center ${bgHeader}`}>{row.dayNum}</td>
                  <td
                    className={`${tdClass} group/dry ${dryCount > 0 ? 'cursor-pointer hover:bg-orange-200/60 dark:hover:bg-orange-900/40 font-medium text-slate-800 dark:text-slate-100' : ''}`}
                    onClick={() =>
                      dryCount > 0 &&
                      onCellClick &&
                      onCellClick(row.dryTasks, 'Dry', row.dayNum, dateRangeStr)
                    }
                  >
                    {dryCount || ''}
                  </td>
                  <td
                    className={`${tdClass} group-hover/dry:bg-orange-200/60 dark:group-hover/dry:bg-orange-900/40 ${dryCount > 0 ? 'cursor-pointer hover:bg-orange-200/60 dark:hover:bg-orange-900/40 font-medium text-slate-800 dark:text-slate-100' : ''}`}
                    onClick={() =>
                      dryCount > 0 &&
                      onCellClick &&
                      onCellClick(row.dryTasks, 'Dry', row.dayNum, dateRangeStr)
                    }
                  >
                    {dryCount > 0 ? `${dryPct.toFixed(2)}%` : ''}
                  </td>
                  <td
                    className={`${tdClass} group/frz ${frzCount > 0 ? 'cursor-pointer hover:bg-blue-200/60 dark:hover:bg-blue-900/40 font-medium text-slate-800 dark:text-slate-100' : ''}`}
                    onClick={() =>
                      frzCount > 0 &&
                      onCellClick &&
                      onCellClick(row.frozenTasks, 'Frozen', row.dayNum, dateRangeStr)
                    }
                  >
                    {frzCount || ''}
                  </td>
                  <td
                    className={`${tdClass} group-hover/frz:bg-blue-200/60 dark:group-hover/frz:bg-blue-900/40 ${frzCount > 0 ? 'cursor-pointer hover:bg-blue-200/60 dark:hover:bg-blue-900/40 font-medium text-slate-800 dark:text-slate-100' : ''}`}
                    onClick={() =>
                      frzCount > 0 &&
                      onCellClick &&
                      onCellClick(row.frozenTasks, 'Frozen', row.dayNum, dateRangeStr)
                    }
                  >
                    {frzCount > 0 ? `${frzPct.toFixed(2)}%` : ''}
                  </td>
                </tr>
              );
            })
          )}
          <tr className={bgTotal}>
            <td className={`${tdClass} ${bgTotal} text-center font-bold`}>Total</td>
            <td
              colSpan="2"
              className={`${tdClass} ${summaryData.totalDryTasks > 0 ? 'cursor-pointer hover:bg-emerald-200/70 dark:hover:bg-emerald-900/60 font-bold' : ''}`}
              onClick={() =>
                summaryData.totalDryTasks > 0 &&
                onCellClick &&
                onCellClick(summaryData.allDryTasks, 'Dry', '', dateRangeStr)
              }
            >
              {summaryData.totalDryTasks || 0}
            </td>
            <td
              colSpan="2"
              className={`${tdClass} ${summaryData.totalFrozenTasks > 0 ? 'cursor-pointer hover:bg-emerald-200/70 dark:hover:bg-emerald-900/60 font-bold' : ''}`}
              onClick={() =>
                summaryData.totalFrozenTasks > 0 &&
                onCellClick &&
                onCellClick(summaryData.allFrozenTasks, 'Frozen', '', dateRangeStr)
              }
            >
              {summaryData.totalFrozenTasks || 0}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
