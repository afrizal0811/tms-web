'use client';

import Spinner from '@/components/Spinner';
import Tooltip from '@/components/Tooltip';
import { useMemo, useState } from 'react';
import RoutingDropdown from './components/RoutingDropdown';
import TaskSummaryModal from './modals/TaskSummaryModal';

const TableHeader = ({ tooltip, colorClass, text }) => (
  <Tooltip tooltipContent={tooltip}>
    <th
      className={`cursor-help px-2 py-3 border border-gray-300 dark:border-slate-700 min-w-[60px] ${colorClass}`}
    >
      <span className="cursor-help border-b-2 border-dotted border-slate-900 dark:border-slate-200 pb-0.5">
        {text}
      </span>
    </th>
  </Tooltip>
);

const TableCell = ({ children, colorClass = '', className = '' }) => (
  <td
    className={`px-2 py-2 border border-gray-300 dark:border-slate-700 ${colorClass} ${className}`}
  >
    {children}
  </td>
);

const LoadingSpinner = () => (
  <Spinner
    addClass="inline-block"
    border="border-2 border-slate-400 dark:border-slate-500 border-t-transparent"
    size="w-3 h-3"
  />
);

const COLORS = {
  yellow: 'bg-[#fff2cc] dark:bg-[#42311c]',
  pink: 'bg-[#ead1dc] dark:bg-[#4a2438]',
  green: 'bg-[#d9ead3] dark:bg-[#1a3d28]',
  red: 'bg-[#f4cccc] dark:bg-[#4a1c1c]',
  cyan: 'bg-[#d0e0e3] dark:bg-[#164150]',
  blue: 'bg-[#cfe2f3] dark:bg-[#1a2d52]',
  gray: 'bg-[#cccccc] dark:bg-[#2c394b]',
  violet: 'bg-[#d9d2e9] dark:bg-[#34205c]',
};

const HEADER_COLUMNS = [
  { key: 'dp', color: COLORS.pink, text: 'DP' },
  { key: 'dt', color: COLORS.green, text: 'DT' },
  { key: 'dt_persentage', color: COLORS.green, text: '% DT' },
  { key: 'ma', color: COLORS.red, text: 'MA' },
  { key: 'ma_persentage', color: COLORS.red, text: '% MA' },
  { key: 'rt', color: COLORS.cyan, text: 'RT' },
  { key: 'rt_persentage', color: COLORS.cyan, text: '% RT' },
  { key: 'co', color: COLORS.blue, text: 'CO' },
  { key: 'co_persentage', color: COLORS.blue, text: '% CO' },
  { key: 'pr', color: COLORS.gray, text: 'PR' },
  { key: 'pr_persentage', color: COLORS.gray, text: '% PR' },
  { key: 'mt', color: COLORS.yellow, text: 'MT' },
  { key: 'tv', color: COLORS.yellow, text: 'TV' },
  { key: 'va', color: COLORS.yellow, text: 'VA' },
  { key: 'tvu', color: COLORS.violet, text: 'TVU' },
  { key: 'tvu_persentage', color: COLORS.violet, text: '% TVU' },
];

export default function TaskSummaryTab({
  metrics,
  isLoading,
  progress,
  startDateStr,
  endDateStr,
  translate,
  masterTruckData = { Dry: { Total: 0 }, Frozen: { Total: 0 } },
}) {
  const [modalConfig, setModalConfig] = useState({ isOpen: false, data: null });
  const [openDropdown, setOpenDropdown] = useState(null);

  const allDates = useMemo(() => {
    if (!startDateStr || !endDateStr) return [];
    const dates = [];
    const current = new Date(startDateStr);
    const end = new Date(endDateStr);

    while (current <= end) {
      const dateObj = new Date(current);
      const day = dateObj.getDate().toString().padStart(2, '0');
      const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
      const year = dateObj.getFullYear();

      dates.push({
        key: `${year}-${month}-${day}`,
        display: `${day}-${month}-${year}`,
        dateObj: new Date(current),
        isSunday: dateObj.getDay() === 0,
      });
      current.setDate(current.getDate() + 1);
    }
    return dates;
  }, [startDateStr, endDateStr]);

  const calculatePct = (num, den) => {
    if (isLoading && (num === undefined || den === undefined)) return <LoadingSpinner />;
    const n = num || 0;
    const d = den || 0;
    return d === 0 ? '0%' : ((n / d) * 100).toFixed(2) + '%';
  };

  const renderValue = (val) => (isLoading && val === undefined ? <LoadingSpinner /> : val || 0);

  const renderClickableCell = (val, tasksArray, typeKey, category, dateObj, isFrozen = false) => {
    if (isLoading && val === undefined)
      return (
        <TableCell>
          <LoadingSpinner />
        </TableCell>
      );
    const num = val || 0;
    if (num === 0) return <TableCell>0</TableCell>;

    const armada = isFrozen ? 'Frozen' : 'Dry';
    const typeLabel =
      typeKey === 'ma'
        ? translate('common.status.manual_assign')
        : translate(`summary.tabs.task_summary.${typeKey}`);
    const hasWrongGR = tasksArray && tasksArray.some((t) => t.isWrongGR);

    return (
      <td
        onClick={() =>
          setModalConfig({
            isOpen: true,
            data: {
              title: `${typeLabel} - ${armada}`,
              dateObj,
              type: category,
              tasks: tasksArray || [],
            },
          })
        }
        className={`px-2 py-2 border border-gray-300 dark:border-slate-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700/50 transition-colors ${hasWrongGR ? 'text-red-600 dark:text-red-400' : 'text-slate-800 dark:text-slate-200'}`}
      >
        <span className="inline-block border-b-2 border-dotted border-red-700 dark:border-red-400 px-2 pb-0.5">
          {num} {hasWrongGR && <span className="ml-1 text-xs">⚠️</span>}
        </span>
      </td>
    );
  };

  const renderClickableTvCell = (val, tvArray, dateObj, isFrozen = false) => {
    if (isLoading && val === undefined)
      return (
        <TableCell>
          <LoadingSpinner />
        </TableCell>
      );
    const num = val || 0;
    if (num === 0) return <TableCell>0</TableCell>;

    const typeLabel = translate('summary.tabs.task_summary.tv') || 'Total Vehicle';
    return (
      <td
        onClick={() =>
          setModalConfig({
            isOpen: true,
            data: {
              title: `${typeLabel} - ${isFrozen ? 'Frozen' : 'Dry'}`,
              dateObj,
              vehicles: tvArray || [],
            },
          })
        }
        className="px-2 py-2 border border-gray-300 dark:border-slate-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700/50 transition-colors text-slate-800 dark:text-slate-200"
      >
        <span className="inline-block border-b-2 border-dotted border-red-700 dark:border-red-400 px-2 pb-0.5">
          {num}
        </span>
      </td>
    );
  };

  const renderArmadaRow = (
    data,
    mtTotal,
    dateObj,
    isFrozen,
    isFirstRow,
    rowSpanProps,
    isZeroDP,
    routingNames
  ) => {
    const dateCellClass = isZeroDP
      ? 'bg-red-100 dark:bg-[#4a1c1c] text-red-600 dark:text-red-400 font-bold'
      : 'bg-white dark:bg-slate-800 font-medium';

    return (
      <tr
        key={isFrozen ? 'frozen' : 'dry'}
        className="hover:bg-gray-50 dark:hover:bg-slate-700/50 bg-white dark:bg-slate-800"
      >
        {isFirstRow && (
          <td
            rowSpan={2}
            className={`px-2 py-2 border border-gray-300 dark:border-slate-700 align-middle text-center relative ${dateCellClass}`}
          >
            {routingNames && routingNames.length > 0 && !isZeroDP ? (
              <RoutingDropdown
                displayText={rowSpanProps.display}
                routingNames={routingNames}
                translate={translate}
                position="right"
                isOpen={openDropdown === rowSpanProps.display}
                onToggle={() =>
                  setOpenDropdown(
                    openDropdown === rowSpanProps.display ? null : rowSpanProps.display
                  )
                }
              />
            ) : (
              <span>{rowSpanProps.display}</span>
            )}
          </td>
        )}

        <TableCell className="font-semibold text-slate-600 dark:text-slate-300">
          {isFrozen ? 'Frozen' : 'Dry'}
        </TableCell>

        {renderClickableCell(data.dp, data.dp_tasks, 'dp', 'DP', dateObj, isFrozen)}

        {renderClickableCell(data.dt_total, data.dt_tasks, 'dt', 'DT', dateObj, isFrozen)}
        <TableCell colorClass={COLORS.green}>{calculatePct(data.dt_total, data.dp)}</TableCell>

        {renderClickableCell(data.ma_total, data.ma_tasks, 'ma', 'MA', dateObj, isFrozen)}
        <TableCell colorClass={COLORS.red}>{calculatePct(data.ma_total, data.dp)}</TableCell>

        {renderClickableCell(data.rt, data.rt_tasks, 'rt', 'RT', dateObj, isFrozen)}
        <TableCell colorClass={COLORS.cyan}>{calculatePct(data.rt, data.dp)}</TableCell>

        {renderClickableCell(data.co, data.co_tasks, 'co', 'CO', dateObj, isFrozen)}
        <TableCell colorClass={COLORS.blue}>{calculatePct(data.co, data.dp)}</TableCell>

        {renderClickableCell(data.pr, data.pr_tasks, 'pr', 'PR', dateObj, isFrozen)}
        <TableCell colorClass={COLORS.gray}>{calculatePct(data.pr, data.dp)}</TableCell>

        <TableCell className="font-semibold">{mtTotal}</TableCell>

        {renderClickableTvCell(data.tv, data.tv_details, dateObj, isFrozen)}

        <TableCell>{renderValue(data.va)}</TableCell>
        <TableCell>{renderValue(data.tvu)}</TableCell>
        <TableCell colorClass={COLORS.violet}>{calculatePct(data.tvu, mtTotal)}</TableCell>
      </tr>
    );
  };

  const renderHolidayRows = (key, display, isSunday) => {
    const content = isSunday ? (
      translate('common.holiday_sunday')
    ) : (
      <Tooltip tooltipContent={translate('summary.tabs.task_summary.caution')}>
        <span className="cursor-help border-b-2 border-dotted border-red-900 dark:border-red-300 pb-0.5">
          {translate('common.holiday')}
        </span>
      </Tooltip>
    );

    return [
      <tr
        key={`${key}-hol-1`}
        className="bg-red-200 dark:bg-[#4a1c1c] text-red-900 dark:text-red-300 border-b border-gray-300 dark:border-slate-700"
      >
        <td
          rowSpan={2}
          className="px-2 py-2 border border-gray-300 dark:border-slate-700 font-medium align-middle bg-red-200 dark:bg-[#4a1c1c] text-center"
        >
          {display}
        </td>
        <td
          rowSpan={2}
          colSpan={17}
          className="px-2 py-2 border border-gray-300 dark:border-slate-700 font-bold text-center align-middle dark:bg-[#4a1c1c]"
        >
          {content}
        </td>
      </tr>,
      <tr
        key={`${key}-hol-2`}
        className="bg-red-200 dark:bg-[#4a1c1c] text-red-900 dark:text-red-300"
      ></tr>,
    ];
  };

  return (
    <div className="w-full h-full flex flex-col p-0">
      {isLoading && (
        <div className="w-full h-1 bg-gray-100 dark:bg-slate-700">
          <div
            className="h-full bg-emerald-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      <div className="flex-1 overflow-auto bg-white dark:bg-slate-800">
        <table className="min-w-full text-xs text-center border-collapse text-gray-700 dark:text-slate-200">
          <thead className="text-xs text-gray-700 dark:text-slate-200 capitalize sticky top-0 z-10 font-bold">
            <tr>
              <th
                className={`px-2 py-3 border border-gray-300 dark:border-slate-700 min-w-[100px] ${COLORS.yellow}`}
              >
                {translate('common.routing_date')}
              </th>
              <th
                className={`px-2 py-3 border border-gray-300 dark:border-slate-700 min-w-20 ${COLORS.yellow}`}
              >
                {translate('common.type')}
              </th>
              {HEADER_COLUMNS.map((col) => {
                const keyColumn =
                  col.key === 'ma'
                    ? translate(`common.status.manual_assign`)
                    : translate(`summary.tabs.task_summary.${col.key}`);
                return (
                  <TableHeader
                    key={col.key}
                    colorClass={col.color}
                    text={col.text}
                    tooltip={keyColumn}
                  />
                );
              })}
            </tr>
          </thead>
          <tbody>
            {allDates.map((item) => {
              const data = metrics ? metrics[item.key] : null;
              const d = data?.dry || {};
              const f = data?.frozen || {};
              const mtDry = masterTruckData?.Dry?.Total || 0;
              const mtFrozen = masterTruckData?.Frozen?.Total || 0;

              const rNames = data?.routingNames || [];

              const isPast =
                new Date(item.dateObj).setHours(0, 0, 0, 0) < new Date().setHours(0, 0, 0, 0);

              const checkZero = (obj) =>
                (obj.dp || 0) === 0 &&
                (obj.dt_total || 0) === 0 &&
                (obj.ma_total || 0) === 0 &&
                (obj.rt || 0) === 0 &&
                (obj.co || 0) === 0 &&
                (obj.pr || 0) === 0 &&
                (obj.tv || 0) === 0 &&
                (obj.va || 0) === 0 &&
                (obj.tvu || 0) === 0;

              const isDynamicHoliday = isPast && checkZero(d) && checkZero(f);

              if (item.isSunday) return renderHolidayRows(item.key, item.display, true);
              if (isDynamicHoliday) return renderHolidayRows(item.key, item.display, false);

              const isZeroDP = (d.dp || 0) === 0 && (f.dp || 0) === 0 && isPast;

              return [
                renderArmadaRow(
                  d,
                  mtDry,
                  item.dateObj,
                  false,
                  true,
                  { display: item.display },
                  isZeroDP,
                  rNames
                ),
                renderArmadaRow(f, mtFrozen, item.dateObj, true, false, {}, isZeroDP, rNames),
              ];
            })}
          </tbody>
        </table>
      </div>
      <TaskSummaryModal
        isOpen={modalConfig.isOpen}
        onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
        data={modalConfig.data}
        translate={translate}
      />
    </div>
  );
}
