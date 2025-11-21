// File: lib/reportGenerators/rangkumanSheets/timeDriverSheet.js
import * as XLSX from 'xlsx-js-style';
import { formatMinutesToHHMM } from '@/lib/utils';

// --- HELPERS ---
function normalizeEmail(email) {
  return email ? email.toLowerCase().trim() : '';
}

function parseApiDateString(dateStr) {
  if (!dateStr) return null;
  let isoStr = dateStr.toString().replace(' ', 'T');
  if (!isoStr.endsWith('Z') && !isoStr.includes('+')) isoStr += 'Z';
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
  const h = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
  const m = String(totalMinutes % 60).padStart(2, '0');
  return `${h}:${m}`;
}

function getDriverStorageType(driver) {
  const t = (driver.type || '').toUpperCase();
  const n = (driver.name || '').toUpperCase();
  if (t.includes('FROZEN') || n.includes('FROZEN') || n.includes("'FRZ'")) return 'Frozen';
  if (t.includes('DRY') || n.includes('DRY') || n.includes("'DRY'")) return 'Dry';
  return '-';
}

// ======================================================================
//                    BAGIAN 1 — PERHITUNGAN DATA
// ======================================================================
export function calculateTimeDriverData(driverData, locationHistoryData, startDateStr, endDateStr) {
  const driverMap = new Map();
  const driverEmails = [];

  if (driverData && Array.isArray(driverData)) {
    driverData.forEach((d) => {
      const plat = d.plat || '';
      if (!plat || plat.includes('DEMO')) return;

      const email = normalizeEmail(d.email);
      if (email && !driverMap.has(email)) {
        driverMap.set(email, {
          name: d.name,
          plat: plat,
          type: getDriverStorageType(d),
        });
        driverEmails.push(email);
      }
    });
  }

  const dateKeys = [];
  const cur = new Date(startDateStr);
  const end = new Date(endDateStr);

  while (cur <= end) {
    const key = getDateKeyWIB(cur);
    const d = cur.getDate();
    const m = cur.toLocaleDateString('en-GB', { month: 'long' });
    const y = cur.toLocaleDateString('en-GB', { year: '2-digit' });
    dateKeys.push({ str: key, display: `${d}-${m} ${y}` });
    cur.setDate(cur.getDate() + 1);
  }

  const dataMatrix = {};
  dateKeys.forEach((d) => (dataMatrix[d.str] = {}));

  // Parse Location History
  if (locationHistoryData) {
    locationHistoryData.forEach((item) => {
      const email = normalizeEmail(item.email);
      if (!email || !driverMap.has(email)) return;

      const tracked = Math.abs(item.trackedTime || 0);
      const distance = item.finish?.totalDistance || 0;
      if (tracked < 10 || distance <= 5) return;

      const startObj = parseApiDateString(item.startTime);
      const finishObj = item.finish ? parseApiDateString(item.finish.finishTime) : null;
      const key = getDateKeyWIB(startObj);

      if (key && dataMatrix[key]) {
        const startStr = formatHHMM_WIB(startObj);
        const finishStr = formatHHMM_WIB(finishObj);
        const durationStr = startObj && finishObj ? calculateDuration(startObj, finishObj) : '-';

        dataMatrix[key][email] = {
          startDisplay: startStr,
          finishDisplay: finishStr,
          durationDisplay: durationStr,
          hasData: true,
        };
      }
    });
  }

  driverEmails.sort((a, b) => driverMap.get(a).name.localeCompare(driverMap.get(b).name));

  return { driverMap, driverEmails, dateKeys, dataMatrix };
}

// ======================================================================
//                    BAGIAN 2 — GENERATOR EXCEL
// ======================================================================
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

  // =================== STYLES ===================
  const headerColor = { rgb: 'FAE2D5' };
  const dateHeaderColor = { rgb: 'DBE9F7' };
  const sundayColor = { rgb: 'F4CCCC' };

  const thin = { style: 'thin', color: { auto: 1 } };

  const center = { alignment: { horizontal: 'center', vertical: 'center' } };
  const left = { alignment: { horizontal: 'left', vertical: 'center', indent: 1 } };

  const headerStyle = {
    ...center,
    font: { bold: true },
  };

  // =================== BUILD DATA ===================
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
      const m = dataMatrix[d.str][email];
      if (m?.hasData) {
        row.push(m.startDisplay, m.finishDisplay, m.durationDisplay);
      } else {
        row.push(null, null, null);
      }
    });

    excelData.push(row);
  });

  const ws = XLSX.utils.aoa_to_sheet(excelData);

  // =================== MERGES ===================
  const merges = [];
  merges.push({ s: { r: 0, c: 0 }, e: { r: 1, c: 0 } });
  merges.push({ s: { r: 0, c: 1 }, e: { r: 1, c: 1 } });
  merges.push({ s: { r: 0, c: 2 }, e: { r: 1, c: 2 } });

  let cIdx = 3;
  dateKeys.forEach(() => {
    merges.push({ s: { r: 0, c: cIdx }, e: { r: 0, c: cIdx + 2 } });
    cIdx += 3;
  });

  ws['!merges'] = merges;

  // =================== STYLING LOOP ===================
  const range = XLSX.utils.decode_range(ws['!ref']);

  for (let R = range.s.r; R <= range.e.r; R++) {
    for (let C = range.s.c; C <= range.e.c; C++) {
      const ref = XLSX.utils.encode_cell({ r: R, c: C });
      if (!ws[ref]) ws[ref] = { t: 's', v: '' };
      const cell = ws[ref];

      let fill = null;

      // LEFT SIDE HEADER ONLY
      if (C <= 2) {
        if (R <= 1) fill = { patternType: 'solid', fgColor: headerColor };
        cell.s = R <= 1 ? { ...headerStyle } : { ...left };
        if (fill) cell.s.fill = fill;
        continue;
      }

      // DATA COLUMNS
      const dateIdx = Math.floor((C - 3) / 3);
      const dateStr = dateKeys[dateIdx]?.str;
      const isSunday = dateStr && new Date(dateStr).getUTCDay() === 0 ? true : false;

      if (R === 0) {
        fill = { patternType: 'solid', fgColor: dateHeaderColor };
      } else if (R === 1) {
        fill = { patternType: 'solid', fgColor: headerColor };
      } else if (isSunday) {
        fill = { patternType: 'solid', fgColor: sundayColor };
      }

      cell.s = { ...center };
      if (fill) cell.s.fill = fill;

      // ======= THE ONLY BORDERS ALLOWED: VERTICAL DATE SEPARATORS =======
      const rel = (C - 3) % 3;

      // START TIME (left)
      if (rel === 0) cell.s.border = { left: thin };

      // DURATION (right)
      if (rel === 2) cell.s.border = { right: thin };
    }
  }

  const cols = [{ wch: 12 }, { wch: 15 }, { wch: 30 }];
  for (let i = 0; i < dateKeys.length * 3; i++) cols.push({ wch: 12 });
  ws['!cols'] = cols;

  XLSX.utils.book_append_sheet(wb, ws, 'Time Driver');
}
