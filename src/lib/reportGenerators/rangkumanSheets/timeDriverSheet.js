// File: lib/reportGenerators/rangkumanSheets/timeDriverSheet.js
import * as XLSX from 'xlsx-js-style';
import { formatMinutesToHHMM } from '@/lib/utils';
import { COLORS, BORDERS, BASE_STYLES, FILL_STYLES, FONT_STYLES } from './reportStyles';

// ... (SEMUA HELPER FUNCTION & LOGIC CALCULATION TETAP SAMA) ...
function normalizeEmail(email) {
  return email ? email.toLowerCase().trim() : '';
}
function parseApiDateString(dateStr) {
  if (!dateStr) return null;
  let isoStr = dateStr.toString().replace(' ', 'T');
  if (!isoStr.endsWith('Z') && !isoStr.includes('+')) {
    isoStr += 'Z';
  }
  const d = new Date(isoStr);
  return isNaN(d.getTime()) ? null : d;
}
function getDateKeyWIB(dateObj) {
  if (!dateObj) return null;
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .format(dateObj)
    .split('/')
    .reverse()
    .join('-');
}
function formatHHMM_WIB(dateObj) {
  if (!dateObj) return '-';
  return dateObj.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Jakarta',
  });
}
function calculateDuration(startObj, finishObj) {
  if (!startObj || !finishObj) return '-';
  let diffMs = finishObj.getTime() - startObj.getTime();
  if (diffMs < 0) diffMs = 0;
  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const h = Math.floor(totalMinutes / 60)
    .toString()
    .padStart(2, '0');
  const m = (totalMinutes % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}
function getDayDifferenceWIB(startObj, finishObj) {
  if (!startObj || !finishObj) return 0;
  const startDateWIB = getDateKeyWIB(startObj);
  const finishDateWIB = getDateKeyWIB(finishObj);
  if (startDateWIB === finishDateWIB) return 0;
  const s = new Date(startDateWIB);
  const f = new Date(finishDateWIB);
  const diffTime = Math.abs(f - s);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}
function getDriverStorageType(driver) {
  const typeStr = driver.type || '';
  const nameStr = driver.name || '';
  if (typeStr.toUpperCase().includes('FROZEN')) return 'Frozen';
  if (typeStr.toUpperCase().includes('DRY')) return 'Dry';
  if (nameStr.toUpperCase().includes("'FRZ'") || nameStr.toUpperCase().includes('FROZEN'))
    return 'Frozen';
  if (nameStr.toUpperCase().includes("'DRY'") || nameStr.toUpperCase().includes('DRY'))
    return 'Dry';
  return '-';
}

export function calculateTimeDriverData(driverData, locationHistoryData, startDateStr, endDateStr) {
  /* ...KODE LOGIC CALCULATION SAMA PERSIS... */ const driverMap = new Map();
  const driverEmails = [];
  if (driverData && Array.isArray(driverData)) {
    driverData.forEach((d) => {
      const plat = d.plat || '';
      if (!plat || plat.trim() === '' || plat.toUpperCase().includes('DEMO')) return;
      const email = normalizeEmail(d.email);
      if (email && !driverMap.has(email)) {
        driverMap.set(email, { name: d.name, plat: plat, type: getDriverStorageType(d) });
        driverEmails.push(email);
      }
    });
  }
  const dateKeys = [];
  const currentIterDate = new Date(startDateStr);
  const endDateObj = new Date(endDateStr);
  while (currentIterDate <= endDateObj) {
    const dateStr = getDateKeyWIB(currentIterDate);
    const dayNum = currentIterDate.getDate();
    const monthName = currentIterDate.toLocaleDateString('en-GB', { month: 'long' });
    const yearShort = currentIterDate.toLocaleDateString('en-GB', { year: '2-digit' });
    dateKeys.push({ str: dateStr, display: `${dayNum}-${monthName} ${yearShort}` });
    currentIterDate.setDate(currentIterDate.getDate() + 1);
  }
  const dataMatrix = {};
  dateKeys.forEach((d) => {
    dataMatrix[d.str] = {};
  });
  if (locationHistoryData && Array.isArray(locationHistoryData)) {
    locationHistoryData.forEach((item) => {
      const email = normalizeEmail(item.email);
      if (!email || !driverMap.has(email)) return;
      const trackedTime = Math.abs(item.trackedTime || 0);
      const totalDistance = item.finish ? item.finish.totalDistance || 0 : 0;
      if (trackedTime < 10) return;
      if (totalDistance <= 5) return;
      const startObj = parseApiDateString(item.startTime);
      const finishObj = item.finish ? parseApiDateString(item.finish.finishTime) : null;
      const dateKey = getDateKeyWIB(startObj);
      if (dateKey && dataMatrix[dateKey]) {
        const existingEntry = dataMatrix[dateKey][email];
        if (existingEntry) {
          const existingStartObj = parseApiDateString(existingEntry.startTimeISO);
          if (existingStartObj && existingStartObj.getTime() >= startObj.getTime()) {
            return;
          }
        }
        const startStr = formatHHMM_WIB(startObj);
        const finishStr = formatHHMM_WIB(finishObj);
        let durationStr = '-';
        let dayDiff = 0;
        if (startObj && finishObj) {
          durationStr = calculateDuration(startObj, finishObj);
          dayDiff = getDayDifferenceWIB(startObj, finishObj);
        }
        dataMatrix[dateKey][email] = {
          startTimeISO: item.startTime,
          startDisplay: startStr,
          finishDisplay: finishStr,
          durationDisplay: durationStr,
          dayDiff: dayDiff,
          hasData: true,
        };
      }
    });
  }
  const getGroupPriority = (plat) => {
    const p = (plat || '').toUpperCase();
    if (p.includes('DM')) return 3;
    if (p.includes('SEWA')) return 2;
    return 1;
  };
  driverEmails.sort((a, b) => {
    const driverA = driverMap.get(a);
    const driverB = driverMap.get(b);
    const prioA = getGroupPriority(driverA.plat);
    const prioB = getGroupPriority(driverB.plat);
    if (prioA !== prioB) return prioA - prioB;
    return (driverA.name || '').localeCompare(driverB.name || '');
  });
  return { driverMap, driverEmails, dateKeys, dataMatrix };
}

export function generateTimeDriverSheet(
  wb,
  driverData,
  locationHistoryData,
  startDateStr,
  endDateStr
) {
  const { driverMap, driverEmails, dateKeys, dataMatrix } = calculateTimeDriverData(
    driverData,
    locationHistoryData,
    startDateStr,
    endDateStr
  );

  // --- STYLES (Refactored) ---
  const headerStyle = {
    ...BASE_STYLES.center,
    font: FONT_STYLES.bold,
    border: { top: BORDERS.thin, bottom: BORDERS.thin, left: BORDERS.thin, right: BORDERS.thin },
  };
  const dataStyle = {
    ...BASE_STYLES.center,
    border: { top: BORDERS.thin, bottom: BORDERS.thin },
  };

  // --- BUILD DATA (Sama) ---
  const row1 = ['Type of Truck', 'Licence No.', 'Driver'];
  const row2 = ['', '', ''];
  dateKeys.forEach((d) => {
    row1.push(d.display, '', '');
    row2.push('Start Time', 'Finish Time', 'Duration');
  });
  const excelData = [row1, row2];
  driverEmails.forEach((email) => {
    const driver = driverMap.get(email);
    const row = [driver.type, driver.plat, driver.name];
    dateKeys.forEach((d) => {
      const metrics = dataMatrix[d.str][email];
      if (metrics && metrics.hasData) {
        let finishText = metrics.finishDisplay;
        if (metrics.dayDiff > 0) finishText += ` (+${metrics.dayDiff})`;
        row.push(metrics.startDisplay, finishText, metrics.durationDisplay);
      } else {
        row.push(null, null, null);
      }
    });
    excelData.push(row);
  });
  const ws = XLSX.utils.aoa_to_sheet(excelData);

  // --- MERGES ---
  const merges = [];
  merges.push({ s: { r: 0, c: 0 }, e: { r: 1, c: 0 } });
  merges.push({ s: { r: 0, c: 1 }, e: { r: 1, c: 1 } });
  merges.push({ s: { r: 0, c: 2 }, e: { r: 1, c: 2 } });
  let colIdx = 3;
  dateKeys.forEach(() => {
    merges.push({ s: { r: 0, c: colIdx }, e: { r: 0, c: colIdx + 2 } });
    colIdx += 3;
  });
  ws['!merges'] = merges;

  // --- STYLING LOOP (Refactored) ---
  const range = XLSX.utils.decode_range(ws['!ref']);
  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
      if (!ws[cellRef]) ws[cellRef] = { t: 's', v: '' };
      const cell = ws[cellRef];

      let cellFill = null;
      if (C <= 2) {
        if (R === 0 || R === 1) cellFill = { patternType: 'solid', fgColor: COLORS.dry }; // Peach
      } else {
        const dateIdx = Math.floor((C - 3) / 3);
        if (dateKeys[dateIdx]) {
          const dObj = new Date(dateKeys[dateIdx].str);
          if (dObj.getUTCDay() === 0)
            cellFill = FILL_STYLES.red; // Minggu
          else {
            if (R === 0) cellFill = { patternType: 'solid', fgColor: COLORS.frozen }; // Biru
            if (R === 1) cellFill = { patternType: 'solid', fgColor: COLORS.dry }; // Peach
          }
        }
      }

      if (R === 0 || R === 1) {
        cell.s = { ...headerStyle };
        if (cellFill) cell.s.fill = cellFill;
        if (C > 2 && (C - 2) % 3 === 0) cell.s.border.right = BORDERS.medium;
      } else {
        cell.s = { ...dataStyle };
        cell.s.border = { ...dataStyle.border };
        if (cellFill) cell.s.fill = cellFill;

        if (C === 2) cell.s.border.right = BORDERS.medium;
        if (C > 2 && (C - 2) % 3 === 0) cell.s.border.right = BORDERS.medium;
        if (C <= 2) cell.s.alignment = { horizontal: 'left', vertical: 'center', indent: 1 };
      }
    }
  }
  const cols = [{ wch: 12 }, { wch: 15 }, { wch: 30 }];
  for (let i = 0; i < dateKeys.length * 3; i++) cols.push({ wch: 10 });
  ws['!cols'] = cols;
  XLSX.utils.book_append_sheet(wb, ws, 'Time Driver');
}
