// File: lib/reportGenerators/rangkumanSheets/timeDriverSheet.js
import { formatDateWIB, normalizeEmail } from '@/lib/utils';
import * as XLSX from 'xlsx-js-style';
import { BASE_STYLES, BORDERS, COLORS, FILL_STYLES, FONT_STYLES } from './reportStyles';

function parseApiDateString(dateStr) {
  if (!dateStr) return null;
  let isoStr = dateStr.toString().replace(' ', 'T');
  if (!isoStr.endsWith('Z') && !isoStr.includes('+')) {
    isoStr += 'Z';
  }
  const d = new Date(isoStr);
  return isNaN(d.getTime()) ? null : d;
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
  const startDateWIB = formatDateWIB(startObj, 'YYYY-MM-DD');
  const finishDateWIB = formatDateWIB(finishObj, 'YYYY-MM-DD');
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

export function calculateTimeDriverData(
  driverData,
  locationHistoryData,
  startDateStr,
  endDateStr,
  isIndo
) {
  const driverMap = new Map();
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
    const dateStr = formatDateWIB(currentIterDate, 'YYYY-MM-DD');
    const dayNum = currentIterDate.getDate();
    const monthName = currentIterDate.toLocaleDateString(isIndo ? 'id-ID' : 'en-GB', {
      month: 'long',
    });
    const yearShort = currentIterDate.toLocaleDateString(isIndo ? 'id-ID' : 'en-GB', {
      year: '2-digit',
    });
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
      const dateKey = formatDateWIB(startObj, 'YYYY-MM-DD');
      if (dateKey && dataMatrix[dateKey]) {
        const existingEntry = dataMatrix[dateKey][email];
        if (existingEntry) {
          const existingStartObj = parseApiDateString(existingEntry.startTimeISO);
          if (existingStartObj && existingStartObj.getTime() >= startObj.getTime()) {
            return;
          }
        }
        const startStr = formatDateWIB(startObj, 'HH:mm');
        const finishStr = formatDateWIB(finishObj, 'HH:mm');
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
  endDateStr,
  translate,
  isIndo
) {
  const { driverMap, driverEmails, dateKeys, dataMatrix } = calculateTimeDriverData(
    driverData,
    locationHistoryData,
    startDateStr,
    endDateStr,
    isIndo
  );
  // --- STYLES ---
  const headerStyle = {
    ...BASE_STYLES.center,
    font: FONT_STYLES.bold,
    // Header tetap pakai box border agar rapi
    border: BORDERS.thin,
  };

  // Style Base untuk Data (Alignment Center)
  const dataStyle = {
    ...BASE_STYLES.center,
    font: { name: 'Calibri', sz: 11 },
  };

  // --- BUILD DATA ---
  const row1 = [
    translate('summary.tabs.time_driver.temp'),
    translate('summary.tabs.time_driver.lisence'),
    translate('summary.tabs.time_driver.driver'),
  ];
  const row2 = ['', '', ''];
  dateKeys.forEach((d) => {
    row1.push(d.display, '', '');
    row2.push(
      translate('summary.tabs.time_driver.start_time'),
      translate('summary.tabs.time_driver.finish_time'),
      translate('summary.tabs.time_driver.duration')
    );
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

  // --- STYLING LOOP ---
  const range = XLSX.utils.decode_range(ws['!ref']);
  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
      if (!ws[cellRef]) ws[cellRef] = { t: 's', v: '' };
      const cell = ws[cellRef];

      let cellFill = null;

      // Tentukan Warna Header (Sama seperti sebelumnya)
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

      // --- HEADER (Row 0 & 1) ---
      if (R === 0 || R === 1) {
        cell.s = { ...headerStyle };
        if (cellFill) cell.s.fill = cellFill;

        // Tambah border kanan tebal untuk pemisah grup di header
        if (C === 2) cell.s.border = { ...BORDERS.thin, right: BORDERS.medium };
        else if (C > 2 && (C - 2) % 3 === 0)
          cell.s.border = { ...BORDERS.thin, right: BORDERS.medium };
      }

      // --- DATA ROWS (Row >= 2) ---
      else {
        cell.s = { ...dataStyle };
        if (cellFill) cell.s.fill = cellFill;

        // Alignment untuk kolom Info
        if (C <= 2) cell.s.alignment = { horizontal: 'left', vertical: 'center', indent: 1 };

        // --- LOGIKA BORDER BARU (Tanpa Atas Bawah, Grouping Kanan Kiri) ---
        let borderLeft = { style: 'none' };
        let borderRight = { style: 'none' };
        const borderTop = { style: 'none' };
        const borderBottom = { style: 'none' };

        // 1. Kolom Info (0, 1, 2)
        if (C <= 2) {
          borderLeft = { style: 'thin' };
          borderRight = { style: 'thin' };
          // Kolom Driver (idx 2) dikasih batas kanan tebal
          if (C === 2) borderRight = BORDERS.medium;
        }
        // 2. Kolom Tanggal (3, 4, 5 | 6, 7, 8 | ...)
        else {
          const relIdx = (C - 3) % 3; // 0=Start, 1=Finish, 2=Duration

          // Awal Grup Tanggal (Start Time) -> Border Kiri Medium
          if (relIdx === 0) {
            borderLeft = BORDERS.medium;
          }
          // Akhir Grup Tanggal (Duration) -> Border Kanan Medium
          if (relIdx === 2) {
            borderRight = BORDERS.medium;
          }
        }

        cell.s.border = {
          top: borderTop,
          bottom: borderBottom,
          left: borderLeft,
          right: borderRight,
        };
      }
    }
  }

  const cols = [{ wch: 12 }, { wch: 15 }, { wch: 30 }];
  for (let i = 0; i < dateKeys.length * 3; i++) cols.push({ wch: 10 });
  ws['!cols'] = cols;

  XLSX.utils.book_append_sheet(wb, ws, translate('summary.tabs.time_driver.title'));
}
