import { formatDateWIB } from '@/lib/utils';
import * as XLSX from 'xlsx-js-style';
import { BASE_STYLES, COLORS, HEADER_STYLES } from './reportStyles';

const isSameDayWIB = (iso1, iso2) => {
  if (!iso1 || !iso2) return false;
  return (
    formatDateWIB(new Date(iso1), 'YYYY-MM-DD') === formatDateWIB(new Date(iso2), 'YYYY-MM-DD')
  );
};

const createSafeDate = (dateStr) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
};

// ==========================
// MAIN
// ==========================
export function generateTimeROSheet(wb, tasks, startDateStr, endDateStr, translate, isIndo) {
  const dataMap = {};
  const start = createSafeDate(startDateStr);
  const end = createSafeDate(endDateStr);

  const lastDayKey = formatDateWIB(end, 'YYYY-MM-DD');
  const nextDay = new Date(end);
  nextDay.setDate(nextDay.getDate() + 1);
  const nextDayKey = formatDateWIB(nextDay, 'YYYY-MM-DD');

  // =====================
  // Generate tanggal
  // =====================
  const current = new Date(start);
  while (current <= end) {
    const key = formatDateWIB(current, 'YYYY-MM-DD');
    dataMap[key] = {
      dateDisplay: current.toLocaleDateString(isIndo ? 'id-ID' : 'en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
      minCreatedTime: null,
      minAssignedTime: null,
      isSunday: current.getDay() === 0,
    };
    current.setDate(current.getDate() + 1);
  }

  // =====================
  // Mapping tasks
  // =====================
  if (Array.isArray(tasks)) {
    tasks.forEach((task) => {
      if (task.createdFrom !== 'API') return;
      if (!task.createdTime) return;

      const taskDateKey = formatDateWIB(task.createdTime, 'YYYY-MM-DD');

      const targetKey =
        taskDateKey === nextDayKey && dataMap[lastDayKey] ? lastDayKey : taskDateKey;

      const row = dataMap[targetKey];
      if (!row) return;

      if (!row.minCreatedTime || new Date(task.createdTime) < new Date(row.minCreatedTime)) {
        row.minCreatedTime = task.createdTime;
      }

      if (task.assignedTime) {
        if (!row.minAssignedTime || new Date(task.assignedTime) < new Date(row.minAssignedTime)) {
          row.minAssignedTime = task.assignedTime;
        }
      }
    });
  }

  // =====================
  // Build Excel
  // =====================
  const excelData = [
    [
      translate('summary.tabs.time_ro.date_ro'),
      translate('summary.tabs.time_ro.start_ro'),
      translate('summary.tabs.time_ro.end_ro'),
    ],
  ];
  const merges = [];

  Object.keys(dataMap)
    .sort()
    .forEach((key) => {
      const row = dataMap[key];

      if (row.isSunday) {
        const rowIndex = excelData.length;
        excelData.push([row.dateDisplay, translate('summary.tabs.time_ro.holiday'), '']);

        // 🔴 MERGE Start RO & End RO (B:C)
        merges.push({
          s: { r: rowIndex, c: 1 },
          e: { r: rowIndex, c: 2 },
        });
      } else {
        const validEnd = isSameDayWIB(row.minCreatedTime, row.minAssignedTime);
        excelData.push([
          row.dateDisplay,
          formatDateWIB(row.minCreatedTime, 'HH:mm'),
          validEnd ? formatDateWIB(row.minAssignedTime, 'HH:mm') : '-',
        ]);
      }
    });

  const ws = XLSX.utils.aoa_to_sheet(excelData);
  ws['!merges'] = merges;

  // =====================
  // Styling
  // =====================
  const range = XLSX.utils.decode_range(ws['!ref']);

  // Header
  for (let C = 0; C <= 2; C++) {
    const cell = ws[XLSX.utils.encode_cell({ r: 0, c: C })];
    if (cell) cell.s = HEADER_STYLES.main;
  }

  // Body
  for (let R = 1; R <= range.e.r; R++) {
    const isSunday = excelData[R][1] === 'Libur (Minggu)' || excelData[R][1] === 'Holiday (Sunday)';
    for (let C = 0; C <= 2; C++) {
      const cell = ws[XLSX.utils.encode_cell({ r: R, c: C })];
      if (!cell) continue;

      cell.s = {
        ...BASE_STYLES.center,
        fill: isSunday ? { patternType: 'solid', fgColor: COLORS.sunday } : undefined,
      };
    }
  }

  ws['!cols'] = [{ wch: 22 }, { wch: 14 }, { wch: 14 }];

  XLSX.utils.book_append_sheet(wb, ws, translate('summary.tabs.time_ro.title'));
}
