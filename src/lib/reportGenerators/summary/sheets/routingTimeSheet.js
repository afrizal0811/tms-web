import {
  calculateMinuteDifference,
  formatDateUniversal,
  formatLongDate,
  formatMinutesToHHMM,
} from '@/lib/utils';
import * as XLSX from 'xlsx-js-style';
import { BASE_STYLES, COLORS, HEADER_STYLES } from './reportStyles';

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

  const current = new Date(start);
  while (current <= end) {
    const key = formatDateUniversal(current, 'YYYY-MM-DD');
    dataMap[key] = {
      dateDisplay: formatLongDate(current, localeCode),
      firstCreatedTime: null,
      lastAssignedTime: null,
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
          if (
            !dataMap[taskDateKey].firstCreatedTime ||
            new Date(task.createdTime) < new Date(dataMap[taskDateKey].firstCreatedTime)
          ) {
            dataMap[taskDateKey].firstCreatedTime = task.createdTime;
          }

          if (
            !dataMap[taskDateKey].lastAssignedTime ||
            new Date(task.assignedTime) > new Date(dataMap[taskDateKey].lastAssignedTime)
          ) {
            dataMap[taskDateKey].lastAssignedTime = task.assignedTime;
          }
        }
      }
    });
  }

  const excelData = [
    [
      translate('common.routing_date'),
      translate('common.start_time'),
      translate('common.finish_time'),
      translate('common.duration'),
    ],
  ];
  const merges = [];

  Object.keys(dataMap)
    .sort()
    .forEach((key) => {
      const row = dataMap[key];
      const hasStart = !!row.firstCreatedTime;
      const hasEnd = !!row.lastAssignedTime;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const currentMidnight = createSafeDate(key);
      currentMidnight.setHours(0, 0, 0, 0);
      const isPast = currentMidnight < today;

      const isDynamicHoliday = isPast && !hasStart && !hasEnd && !row.isSunday;

      if (row.isSunday || isDynamicHoliday) {
        const rowIndex = excelData.length;
        const textLibur = row.isSunday
          ? translate('common.holiday_sunday')
          : translate('common.holiday');

        excelData.push([row.dateDisplay, textLibur, '', '']);

        merges.push({
          s: { r: rowIndex, c: 1 },
          e: { r: rowIndex, c: 3 },
        });
      } else {
        let durationDisplay = '-';
        if (hasStart && hasEnd) {
          const diffMins = calculateMinuteDifference(row.firstCreatedTime, row.lastAssignedTime);
          durationDisplay = formatMinutesToHHMM(diffMins, false);
        }

        excelData.push([
          row.dateDisplay,
          hasStart ? formatDateUniversal(row.firstCreatedTime, 'HH:mm') : '-',
          hasEnd ? formatDateUniversal(row.lastAssignedTime, 'HH:mm') : '-',
          durationDisplay,
        ]);
      }
    });

  const ws = XLSX.utils.aoa_to_sheet(excelData);
  ws['!merges'] = merges;

  const range = XLSX.utils.decode_range(ws['!ref']);

  for (let C = 0; C <= 3; C++) {
    const cell = ws[XLSX.utils.encode_cell({ r: 0, c: C })];
    if (cell) cell.s = HEADER_STYLES.main;
  }

  const ERROR_CELL_STYLE = {
    fill: { patternType: 'solid', fgColor: { rgb: 'FFC7CE' } },
    font: { color: { rgb: '9C0006' }, bold: true },
  };

  for (let R = 1; R <= range.e.r; R++) {
    const startVal = excelData[R][1];
    const endVal = excelData[R][2];

    const textLiburSunday = translate('common.holiday_sunday');
    const textLiburDynamic = translate('common.holiday');
    const isHolidayRow = startVal === textLiburSunday || startVal === textLiburDynamic;

    const isStartMissing = startVal === '-' && endVal !== '-';
    const isEndMissing = startVal !== '-' && endVal === '-';

    for (let C = 0; C <= 3; C++) {
      const cell = ws[XLSX.utils.encode_cell({ r: R, c: C })];
      if (!cell) continue;

      let currentStyle = { ...BASE_STYLES.center };

      if (isHolidayRow) {
        currentStyle.fill = { patternType: 'solid', fgColor: COLORS.sunday };
        if (C === 1) {
          currentStyle.font = { bold: true, color: { rgb: '990000' } };
        }
      } else {
        if (C === 1 && isStartMissing) {
          currentStyle = { ...currentStyle, ...ERROR_CELL_STYLE };
        } else if (C === 2 && isEndMissing) {
          currentStyle = { ...currentStyle, ...ERROR_CELL_STYLE };
        }
      }

      cell.s = currentStyle;
    }
  }

  ws['!cols'] = [{ wch: 22 }, { wch: 14 }, { wch: 14 }, { wch: 14 }];

  XLSX.utils.book_append_sheet(wb, ws, translate('summary.tabs.routing_time.title'));
}
