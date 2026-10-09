import {
  calculateMinuteDifference,
  formatDateUniversal,
  formatLongDate,
  formatMinutesToHHMM,
} from '@/lib/utils';
import * as XLSX from 'xlsx-js-style';
import { BASE_STYLES, COLORS, FILL_STYLES, HEADER_STYLES } from './reportStyles';

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

const createSafeDate = (dateStr) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
};

export function generateRoutingTimeSheet(
  wb,
  tasks,
  startDateStr,
  endDateStr,
  translate,
  localeCode
) {
  const dataMap = {};
  const start = createSafeDate(startDateStr);
  const end = createSafeDate(endDateStr);

  const getPrevRouting = (d) => {
    const nd = new Date(d);
    nd.setDate(nd.getDate() - (nd.getDay() === 1 ? 2 : 1));
    return nd;
  };

  const mappedStart = getPrevRouting(start);
  const mappedEnd = getPrevRouting(end);
  const actualStart = mappedStart <= mappedEnd ? mappedStart : mappedEnd;
  const actualEnd = mappedStart <= mappedEnd ? mappedEnd : mappedStart;

  const current = new Date(actualStart);
  while (current <= actualEnd) {
    const key = formatDateUniversal(current, 'YYYY-MM-DD');
    dataMap[key] = {
      dateDisplay: formatLongDate(current, localeCode),
      dry: { firstCreatedTime: null, lastAssignedTime: null },
      frozen: { firstCreatedTime: null, lastAssignedTime: null },
      isSunday: current.getDay() === 0,
    };
    current.setDate(current.getDate() + 1);
  }

  if (Array.isArray(tasks)) {
    tasks.forEach((task) => {
      if (task.createdFrom !== 'API') return;
      if (task.flow !== 'Delivery') return;
      if (!task.createdTime) return;
      if (!isValidRoutingTimeWIB(task.createdTime)) return;

      let taskDateKey = formatDateUniversal(new Date(task.createdTime), 'YYYY-MM-DD');

      if (dataMap[taskDateKey]) {
        const isValidRoutedTask =
          task.assignedTime &&
          task.routingResultId &&
          (task.eta || task.etd || task.routePlannedOrder) &&
          isValidAssignedTimeWIB(task.createdTime, task.assignedTime);

        if (isValidRoutedTask) {
          const type = (task.typeStorage || '').toUpperCase().includes('FROZEN') ? 'frozen' : 'dry';
          const target = dataMap[taskDateKey][type];

          if (
            !target.firstCreatedTime ||
            new Date(task.createdTime) < new Date(target.firstCreatedTime)
          ) {
            target.firstCreatedTime = task.createdTime;
          }

          if (
            !target.lastAssignedTime ||
            new Date(task.assignedTime) > new Date(target.lastAssignedTime)
          ) {
            target.lastAssignedTime = task.assignedTime;
          }
        }
      }
    });
  }

  const isTimeDifferent = (t1, t2) => {
    if (!t1 && !t2) return false;
    if (!t1 || !t2) return true;
    return Math.abs(new Date(t1).getTime() - new Date(t2).getTime()) > 60000;
  };

  let isSeparated = false;
  Object.keys(dataMap).forEach((key) => {
    const row = dataMap[key];
    if (
      isTimeDifferent(row.dry.firstCreatedTime, row.frozen.firstCreatedTime) ||
      isTimeDifferent(row.dry.lastAssignedTime, row.frozen.lastAssignedTime)
    ) {
      isSeparated = true;
    }
  });

  let excelData = [];
  let merges = [];

  if (isSeparated) {
    excelData = [
      [
        translate('common.routing_date'),
        translate('common.start_time'),
        '',
        translate('common.finish_time'),
        '',
        translate('common.duration'),
        '',
      ],
      ['', 'Dry', 'Frozen', 'Dry', 'Frozen', 'Dry', 'Frozen'],
    ];
    merges = [
      { s: { r: 0, c: 0 }, e: { r: 1, c: 0 } },
      { s: { r: 0, c: 1 }, e: { r: 0, c: 2 } },
      { s: { r: 0, c: 3 }, e: { r: 0, c: 4 } },
      { s: { r: 0, c: 5 }, e: { r: 0, c: 6 } },
    ];
  } else {
    excelData = [
      [
        translate('common.routing_date'),
        translate('common.start_time'),
        translate('common.finish_time'),
        translate('common.duration'),
      ],
    ];
  }

  Object.keys(dataMap)
    .sort()
    .forEach((key) => {
      const row = dataMap[key];
      const hasDryStart = !!row.dry.firstCreatedTime;
      const hasDryEnd = !!row.dry.lastAssignedTime;
      const hasFrzStart = !!row.frozen.firstCreatedTime;
      const hasFrzEnd = !!row.frozen.lastAssignedTime;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const currentMidnight = createSafeDate(key);
      currentMidnight.setHours(0, 0, 0, 0);
      const isPast = currentMidnight < today;

      const isDynamicHoliday =
        isPast && !hasDryStart && !hasDryEnd && !hasFrzStart && !hasFrzEnd && !row.isSunday;

      if (row.isSunday || isDynamicHoliday) {
        const rowIndex = excelData.length;
        const textLibur = row.isSunday
          ? translate('common.holiday_sunday')
          : translate('common.holiday');

        if (isSeparated) {
          excelData.push([row.dateDisplay, textLibur, '', '', '', '', '']);
          merges.push({ s: { r: rowIndex, c: 1 }, e: { r: rowIndex, c: 6 } });
        } else {
          excelData.push([row.dateDisplay, textLibur, '', '']);
          merges.push({ s: { r: rowIndex, c: 1 }, e: { r: rowIndex, c: 3 } });
        }
      } else {
        let dryDur = '-',
          frzDur = '-';
        if (hasDryStart && hasDryEnd)
          dryDur = formatMinutesToHHMM(
            calculateMinuteDifference(row.dry.firstCreatedTime, row.dry.lastAssignedTime),
            false
          );
        if (hasFrzStart && hasFrzEnd)
          frzDur = formatMinutesToHHMM(
            calculateMinuteDifference(row.frozen.firstCreatedTime, row.frozen.lastAssignedTime),
            false
          );

        if (isSeparated) {
          excelData.push([
            row.dateDisplay,
            hasDryStart ? formatDateUniversal(row.dry.firstCreatedTime, 'HH:mm') : '-',
            hasFrzStart ? formatDateUniversal(row.frozen.firstCreatedTime, 'HH:mm') : '-',
            hasDryEnd ? formatDateUniversal(row.dry.lastAssignedTime, 'HH:mm') : '-',
            hasFrzEnd ? formatDateUniversal(row.frozen.lastAssignedTime, 'HH:mm') : '-',
            dryDur,
            frzDur,
          ]);
        } else {
          excelData.push([
            row.dateDisplay,
            hasDryStart ? formatDateUniversal(row.dry.firstCreatedTime, 'HH:mm') : '-',
            hasDryEnd ? formatDateUniversal(row.dry.lastAssignedTime, 'HH:mm') : '-',
            dryDur,
          ]);
        }
      }
    });

  const ws = XLSX.utils.aoa_to_sheet(excelData);
  if (merges.length > 0) ws['!merges'] = merges;

  const range = XLSX.utils.decode_range(ws['!ref']);

  for (let R = 0; R <= (isSeparated ? 1 : 0); R++) {
    for (let C = 0; C <= (isSeparated ? 6 : 3); C++) {
      const cell = ws[XLSX.utils.encode_cell({ r: R, c: C })];
      if (cell) {
        cell.s = { ...HEADER_STYLES.main };
        if (isSeparated && R === 1) {
          if (excelData[R][C] === 'Dry') {
            cell.s.fill = FILL_STYLES.dry;
          } else if (excelData[R][C] === 'Frozen') {
            cell.s.fill = FILL_STYLES.frozen;
          }
        }
      }
    }
  }

  const ERROR_CELL_STYLE = {
    fill: { patternType: 'solid', fgColor: { rgb: 'FFC7CE' } },
    font: { color: { rgb: '9C0006' }, bold: true },
  };

  for (let R = isSeparated ? 2 : 1; R <= range.e.r; R++) {
    const dryStartVal = excelData[R][1];
    const frzStartVal = isSeparated ? excelData[R][2] : null;
    const dryEndVal = excelData[R][isSeparated ? 3 : 2];
    const frzEndVal = isSeparated ? excelData[R][4] : null;

    const textLiburSunday = translate('common.holiday_sunday');
    const textLiburDynamic = translate('common.holiday');
    const isHolidayRow = dryStartVal === textLiburSunday || dryStartVal === textLiburDynamic;

    for (let C = 0; C <= (isSeparated ? 6 : 3); C++) {
      const cell = ws[XLSX.utils.encode_cell({ r: R, c: C })];
      if (!cell) continue;

      let currentStyle = { ...BASE_STYLES.center };

      if (isHolidayRow) {
        currentStyle.fill = { patternType: 'solid', fgColor: COLORS.sunday };
        if (C === 1) {
          currentStyle.font = { bold: true, color: { rgb: '990000' } };
        }
      } else {
        if (isSeparated) {
          if (C === 1 && dryStartVal === '-' && dryEndVal !== '-')
            currentStyle = { ...currentStyle, ...ERROR_CELL_STYLE };
          else if (C === 2 && frzStartVal === '-' && frzEndVal !== '-')
            currentStyle = { ...currentStyle, ...ERROR_CELL_STYLE };
          else if (C === 3 && dryStartVal !== '-' && dryEndVal === '-')
            currentStyle = { ...currentStyle, ...ERROR_CELL_STYLE };
          else if (C === 4 && frzStartVal !== '-' && frzEndVal === '-')
            currentStyle = { ...currentStyle, ...ERROR_CELL_STYLE };
        } else {
          if (C === 1 && dryStartVal === '-' && dryEndVal !== '-')
            currentStyle = { ...currentStyle, ...ERROR_CELL_STYLE };
          else if (C === 2 && dryStartVal !== '-' && dryEndVal === '-')
            currentStyle = { ...currentStyle, ...ERROR_CELL_STYLE };
        }
      }

      cell.s = currentStyle;
    }
  }

  ws['!cols'] = isSeparated
    ? [{ wch: 22 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }]
    : [{ wch: 22 }, { wch: 14 }, { wch: 14 }, { wch: 14 }];

  XLSX.utils.book_append_sheet(wb, ws, translate('summary.tabs.routing_time.title'));
}
