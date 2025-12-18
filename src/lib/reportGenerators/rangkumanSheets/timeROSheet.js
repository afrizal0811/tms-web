import * as XLSX from 'xlsx-js-style';
import { BASE_STYLES, HEADER_STYLES, COLORS } from './reportStyles';

// ==========================
// Helpers (sama dengan UI)
// ==========================
const formatTimeHHMM = (isoString) => {
  if (!isoString) return '-';
  try {
    return new Date(isoString).toLocaleTimeString('id-ID', {
      timeZone: 'Asia/Jakarta',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  } catch {
    return '-';
  }
};

const getDateKeyWIB = (dateObj) =>
  dateObj.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });

const isSameDayWIB = (iso1, iso2) => {
  if (!iso1 || !iso2) return false;
  return getDateKeyWIB(new Date(iso1)) === getDateKeyWIB(new Date(iso2));
};

const createSafeDate = (dateStr) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
};

// ==========================
// MAIN
// ==========================
export function generateTimeROSheet(wb, tasks, startDateStr, endDateStr) {
  const dataMap = {};

  const start = createSafeDate(startDateStr);
  const end = createSafeDate(endDateStr);

  const lastDayKey = getDateKeyWIB(end);
  const nextDay = new Date(end);
  nextDay.setDate(nextDay.getDate() + 1);
  const nextDayKey = getDateKeyWIB(nextDay);

  // =====================
  // Generate tanggal
  // =====================
  const current = new Date(start);
  while (current <= end) {
    const key = getDateKeyWIB(current);
    dataMap[key] = {
      dateDisplay: current.toLocaleDateString('id-ID', {
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

      const taskDateKey = new Date(task.createdTime).toLocaleDateString('en-CA', {
        timeZone: 'Asia/Jakarta',
      });

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
  const excelData = [['Tanggal RO', 'Start RO', 'End RO']];
  const merges = [];

  Object.keys(dataMap)
    .sort()
    .forEach((key) => {
      const row = dataMap[key];

      if (row.isSunday) {
        const rowIndex = excelData.length;
        excelData.push([row.dateDisplay, 'Libur (Minggu)', '']);

        // 🔴 MERGE Start RO & End RO (B:C)
        merges.push({
          s: { r: rowIndex, c: 1 },
          e: { r: rowIndex, c: 2 },
        });
      } else {
        const validEnd = isSameDayWIB(row.minCreatedTime, row.minAssignedTime);
        excelData.push([
          row.dateDisplay,
          formatTimeHHMM(row.minCreatedTime),
          validEnd ? formatTimeHHMM(row.minAssignedTime) : '-',
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
    const isSunday = excelData[R][1] === 'Libur (Minggu)';
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

  XLSX.utils.book_append_sheet(wb, ws, 'Time RO');
}
