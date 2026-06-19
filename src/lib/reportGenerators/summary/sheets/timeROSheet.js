import { formatDateWIB, formatLongDate } from '@/lib/utils';
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
    return hour >= 16;
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

export function generateTimeROSheet(wb, tasks, startDateStr, endDateStr, translate, localeCode) {
  const dataMap = {};
  const start = createSafeDate(startDateStr);
  const end = createSafeDate(endDateStr);

  const lastDayKey = formatDateWIB(end, 'YYYY-MM-DD');
  const nextDay = new Date(end);
  nextDay.setDate(nextDay.getDate() + 1);
  const nextDayKey = formatDateWIB(nextDay, 'YYYY-MM-DD');

  const current = new Date(start);
  while (current <= end) {
    const key = formatDateWIB(current, 'YYYY-MM-DD');
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

  const excelData = [
    [
      translate('summary.tabs.time_ro.date_ro'),
      translate('common.start_time'),
      translate('common.finish_time'),
    ],
  ];
  const merges = [];

  Object.keys(dataMap)
    .sort()
    .forEach((key) => {
      const row = dataMap[key];

      if (row.isSunday) {
        const rowIndex = excelData.length;
        excelData.push([row.dateDisplay, translate('common.holiday_sunday'), '']);

        merges.push({
          s: { r: rowIndex, c: 1 },
          e: { r: rowIndex, c: 2 },
        });
      } else {
        const hasStart = !!row.firstCreatedTime;
        const hasEnd = !!row.lastAssignedTime;

        excelData.push([
          row.dateDisplay,
          hasStart ? formatDateWIB(row.firstCreatedTime, 'HH:mm') : '-',
          hasEnd ? formatDateWIB(row.lastAssignedTime, 'HH:mm') : '-',
        ]);
      }
    });

  const ws = XLSX.utils.aoa_to_sheet(excelData);
  ws['!merges'] = merges;

  const range = XLSX.utils.decode_range(ws['!ref']);

  for (let C = 0; C <= 2; C++) {
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
    const isSunday = startVal === 'Libur (Minggu)' || startVal === 'Holiday (Sunday)';

    // Validasi missing pair
    const isStartMissing = startVal === '-' && endVal !== '-';
    const isEndMissing = startVal !== '-' && endVal === '-';

    for (let C = 0; C <= 2; C++) {
      const cell = ws[XLSX.utils.encode_cell({ r: R, c: C })];
      if (!cell) continue;

      let currentStyle = { ...BASE_STYLES.center };

      if (isSunday) {
        currentStyle.fill = { patternType: 'solid', fgColor: COLORS.sunday };
      } else {
        // Berikan warna merah pada cell yang bolong
        if (C === 1 && isStartMissing) {
          currentStyle = { ...currentStyle, ...ERROR_CELL_STYLE };
        } else if (C === 2 && isEndMissing) {
          currentStyle = { ...currentStyle, ...ERROR_CELL_STYLE };
        }
      }

      cell.s = currentStyle;
    }
  }

  ws['!cols'] = [{ wch: 22 }, { wch: 14 }, { wch: 14 }];

  XLSX.utils.book_append_sheet(wb, ws, translate('summary.tabs.time_ro.title'));
}
