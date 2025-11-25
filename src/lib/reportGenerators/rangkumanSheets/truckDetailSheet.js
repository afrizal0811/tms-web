// File: lib/reportGenerators/rangkumanSheets/truckDetailSheet.js
import * as XLSX from 'xlsx-js-style';
import { formatDate, formatMinutesToHHMM } from '@/lib/utils';
import { COLORS, BORDERS, BASE_STYLES, FILL_STYLES, FONT_STYLES } from './reportStyles';

// ... (Helpers & Logic Calculation TETAP SAMA) ...
// ... Copy semua fungsi helper dan calculateTruckDetailData dari file sebelumnya ...
const FAILED_STATUSES = ['PENDING', 'BATAL', 'TERIMA SEBAGIAN', 'PENDING GR'];
function getDeliveryDateFromRouting(isoString) {
  if (!isoString) return null;
  try {
    const date = new Date(isoString);
    const wibTimestamp = date.getTime() + 7 * 60 * 60 * 1000;
    const dateWIB = new Date(wibTimestamp);
    const routingDay = dateWIB.getUTCDay();
    let offsetDays = 1;
    if (routingDay === 6) offsetDays = 2;
    const deliveryTimestamp = wibTimestamp + offsetDays * 24 * 60 * 60 * 1000;
    return new Date(deliveryTimestamp).toISOString().split('T')[0];
  } catch (e) {
    return null;
  }
}
function getDateFromTask(isoString) {
  if (!isoString) return null;
  return isoString.substring(0, 10);
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

export function calculateTruckDetailData(
  driverData,
  resultsData,
  allTasks,
  startDateStr,
  endDateStr
) {
  /* ...Kode Logika Kalkulasi Sama Persis... */ const driverMap = new Map();
  const driverEmails = [];
  if (driverData && Array.isArray(driverData)) {
    driverData.forEach((d) => {
      const plat = d.plat || '-';
      if (plat === '-' || plat.toUpperCase().includes('DEMO')) {
        return;
      }
      const email = d.email ? d.email.toLowerCase().trim() : null;
      if (email) {
        if (!driverMap.has(email)) {
          driverMap.set(email, { name: d.name, plat: plat, type: getDriverStorageType(d) });
          driverEmails.push(email);
        }
      }
    });
  }
  const dateKeys = [];
  const currentIterDate = new Date(startDateStr);
  const endDateObj = new Date(endDateStr);
  while (currentIterDate <= endDateObj) {
    const dateStr = formatDate(currentIterDate);
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
  if (resultsData && Array.isArray(resultsData)) {
    resultsData.forEach((dispatch) => {
      const isDone = dispatch.dispatchStatus && dispatch.dispatchStatus.toLowerCase() === 'done';
      if (isDone && dispatch.result && Array.isArray(dispatch.result.routing)) {
        const dateKey = getDeliveryDateFromRouting(dispatch.createdTime);
        if (dateKey && dataMatrix[dateKey]) {
          dispatch.result.routing.forEach((route) => {
            const email = route.assignee ? route.assignee.toLowerCase().trim() : null;
            if (!email || !driverMap.has(email)) return;
            if (!dataMatrix[dateKey][email]) {
              dataMatrix[dateKey][email] = {
                weight: 0,
                maxWeight: 0,
                volume: 0,
                maxVolume: 0,
                dist: 0,
                duration: 0,
                outlets: 0,
                delivered: 0,
              };
            }
            const entry = dataMatrix[dateKey][email];
            entry.weight += route.totalWeight || 0;
            entry.maxWeight += route.vehicleMaxWeight || 0;
            entry.volume += route.totalVolume || 0;
            entry.maxVolume += route.vehicleMaxVolume || 0;
            entry.dist += route.totalDistance || 0;
            entry.duration += route.totalSpentTime || 0;
          });
        }
      }
    });
  }
  if (allTasks && Array.isArray(allTasks)) {
    allTasks.forEach((task) => {
      const dateKey = getDateFromTask(task.doneTime);
      const assigneeArr = task.assignee || [];
      const email = assigneeArr.length > 0 ? assigneeArr[0].toLowerCase().trim() : null;
      if (dateKey && email && dataMatrix[dateKey]) {
        if (!driverMap.has(email)) return;
        if (!dataMatrix[dateKey][email]) {
          dataMatrix[dateKey][email] = {
            weight: 0,
            maxWeight: 0,
            volume: 0,
            maxVolume: 0,
            dist: 0,
            duration: 0,
            outlets: 0,
            delivered: 0,
          };
        }
        const entry = dataMatrix[dateKey][email];
        entry.outlets += 1;
        const status = task.label && task.label.length > 0 ? task.label[0].toUpperCase() : '';
        if (!FAILED_STATUSES.includes(status)) {
          entry.delivered += 1;
        }
      }
    });
  }
  driverEmails.sort((a, b) => {
    const nameA = (driverMap.get(a).name || '').toLowerCase();
    const nameB = (driverMap.get(b).name || '').toLowerCase();
    return nameA.localeCompare(nameB);
  });
  return { driverMap, driverEmails, dateKeys, dataMatrix };
}

export function generateTruckDetailSheet(
  wb,
  driverData,
  resultsData,
  allTasks,
  startDateStr,
  endDateStr
) {
  const { driverMap, driverEmails, dateKeys, dataMatrix } = calculateTruckDetailData(
    driverData,
    resultsData,
    allTasks,
    startDateStr,
    endDateStr
  );

  // --- STYLING REFACTOR (Pakai reportStyles) ---
  // Gunakan Spread Syntax untuk override jika perlu
  const headerStyle = {
    ...BASE_STYLES.cellCenter,
    font: FONT_STYLES.bold,
    border: { top: BORDERS.thin, bottom: BORDERS.thin, left: BORDERS.thin, right: BORDERS.thin },
  };

  const dataStyle = {
    ...BASE_STYLES.cellCenter,
    border: { top: BORDERS.thin, bottom: BORDERS.thin }, // Kiri kanan manual
  };

  // --- BUILD DATA (Tetap Sama) ---
  const row1 = ['Type of Truck', 'Licence No.', 'Driver'];
  const row2 = ['', '', ''];
  dateKeys.forEach((d) => {
    row1.push(d.display, '', '', '', '', '', '');
    row2.push(
      'Weight',
      'Volume',
      'Distance (m)',
      'Total Outlets',
      'Total Delivered',
      'Ship Duration',
      'Delivered'
    );
  });
  const excelData = [row1, row2];
  driverEmails.forEach((email) => {
    const driver = driverMap.get(email);
    const row = [driver.type, driver.plat, driver.name];
    dateKeys.forEach((d) => {
      const metrics = dataMatrix[d.str][email];
      if (metrics && (metrics.outlets > 0 || metrics.dist > 0 || metrics.weight > 0)) {
        const weightPct = metrics.maxWeight > 0 ? metrics.weight / metrics.maxWeight : 0;
        const volPct = metrics.maxVolume > 0 ? metrics.volume / metrics.maxVolume : 0;
        const delPct = metrics.outlets > 0 ? metrics.delivered / metrics.outlets : 0;
        row.push(
          weightPct,
          volPct,
          metrics.dist,
          metrics.outlets,
          metrics.delivered,
          formatMinutesToHHMM(metrics.duration),
          delPct
        );
      } else {
        row.push(null, null, null, null, null, null, null);
      }
    });
    excelData.push(row);
  });
  const ws = XLSX.utils.aoa_to_sheet(excelData);

  // --- MERGES (Tetap Sama) ---
  const merges = [];
  merges.push({ s: { r: 0, c: 0 }, e: { r: 1, c: 0 } });
  merges.push({ s: { r: 0, c: 1 }, e: { r: 1, c: 1 } });
  merges.push({ s: { r: 0, c: 2 }, e: { r: 1, c: 2 } });
  let colIdx = 3;
  dateKeys.forEach(() => {
    merges.push({ s: { r: 0, c: colIdx }, e: { r: 0, c: colIdx + 6 } });
    colIdx += 7;
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
      let isSunday = false;

      if (C <= 2) {
        // Driver Info
        if (R === 0 || R === 1) cellFill = { patternType: 'solid', fgColor: COLORS.dry }; // Peach
      } else {
        // Data
        const dateIdx = Math.floor((C - 3) / 7);
        if (dateKeys[dateIdx]) {
          const dObj = new Date(dateKeys[dateIdx].str);
          if (dObj.getUTCDay() === 0) {
            isSunday = true;
            cellFill = FILL_STYLES.red; // Minggu
          } else {
            if (R === 0) cellFill = { patternType: 'solid', fgColor: COLORS.frozen }; // Biru
            if (R === 1) cellFill = { patternType: 'solid', fgColor: COLORS.dry }; // Peach
          }
        }
      }

      if (R === 0 || R === 1) {
        cell.s = { ...headerStyle };
        if (cellFill) cell.s.fill = cellFill;
        if (C > 2 && (C - 3) % 7 === 6) cell.s.border.right = BORDERS.medium;
      } else {
        cell.s = { ...dataStyle };
        // Clone border to avoid mutation
        cell.s.border = { ...dataStyle.border };
        if (cellFill) cell.s.fill = cellFill;

        if (C === 2) cell.s.border.right = BORDERS.medium;

        if (C > 2) {
          const relativeIdx = (C - 3) % 7;
          if ([0, 1, 6].includes(relativeIdx)) {
            cell.t = 'n';
            cell.s = { ...cell.s, numFmt: '0.0%' };
          } else if ([2, 3, 4].includes(relativeIdx)) {
            cell.t = 'n';
            cell.s = { ...cell.s, numFmt: '#,##0' };
          }
          if (relativeIdx === 6) cell.s.border.right = BORDERS.medium;
        } else {
          cell.s.alignment = { horizontal: 'left', vertical: 'center', indent: 1 };
        }
      }
    }
  }
  const cols = [{ wch: 12 }, { wch: 15 }, { wch: 30 }];
  for (let i = 0; i < dateKeys.length * 7; i++) cols.push({ wch: 12 });
  ws['!cols'] = cols;

  XLSX.utils.book_append_sheet(wb, ws, 'Truck Detail');
}
