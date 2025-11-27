// File: lib/reportGenerators/rangkumanSheets/truckDetailSheet.js
import * as XLSX from 'xlsx-js-style';
import { formatDate, formatMinutesToHHMM } from '@/lib/utils';
import { COLORS, BORDERS, BASE_STYLES, FILL_STYLES, FONT_STYLES } from './reportStyles';

// Status yang dianggap GAGAL / BELUM SELESAI
const FAILED_STATUSES = ['PENDING', 'BATAL', 'TERIMA SEBAGIAN', 'PENDING GR'];

// --- HELPERS ---
function getDeliveryDateFromRouting(isoString) {
  if (!isoString) return null;
  try {
    const date = new Date(isoString);
    // UTC -> WIB (+7) -> Offset Hari (+1 atau +2 jika Sabtu)
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

/**
 * BAGIAN 1: LOGIKA PERHITUNGAN (DATA MATRIX)
 */
export function calculateTruckDetailData(
  driverData,
  resultsData,
  allTasks,
  startDateStr,
  endDateStr
) {
  const driverMap = new Map();
  const driverEmails = [];

  // 1. Init Master Driver
  if (driverData && Array.isArray(driverData)) {
    driverData.forEach((d) => {
      const plat = d.plat || '-';
      if (plat === '-' || plat.toUpperCase().includes('DEMO')) {
        return;
      }

      const email = d.email ? d.email.toLowerCase().trim() : null;
      if (email) {
        if (!driverMap.has(email)) {
          driverMap.set(email, {
            name: d.name,
            plat: plat,
            type: getDriverStorageType(d),
          });
          driverEmails.push(email);
        }
      }
    });
  }

  // 2. Init Date Range
  const dateKeys = [];
  const currentIterDate = new Date(startDateStr);
  const endDateObj = new Date(endDateStr);

  while (currentIterDate <= endDateObj) {
    const dateStr = formatDate(currentIterDate);
    const dayNum = currentIterDate.getDate();
    const monthName = currentIterDate.toLocaleDateString('en-GB', { month: 'long' });
    const yearShort = currentIterDate.toLocaleDateString('en-GB', { year: '2-digit' });

    dateKeys.push({
      str: dateStr,
      display: `${dayNum}-${monthName} ${yearShort}`,
    });
    currentIterDate.setDate(currentIterDate.getDate() + 1);
  }

  // 3. Data Container
  const dataMatrix = {};
  dateKeys.forEach((d) => {
    dataMatrix[d.str] = {};
  });

  // 4. Process Routing (Results)
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

            // --- 1. DURASI (Manual Fallback) ---
            let durationVal = route.totalSpentTime || 0;
            if (durationVal === 0 && Array.isArray(route.trips)) {
              const manualSum = route.trips.reduce((acc, trip) => {
                if (!trip.isHub) {
                  return (
                    acc + (trip.travelTime || 0) + (trip.visitTime || 0) + (trip.waitingTime || 0)
                  );
                }
                return acc;
              }, 0);
              if (manualSum > 0) durationVal = manualSum;
            }

            // --- 2. WEIGHT, VOLUME, DISTANCE (Manual Fallback) ---
            let weightVal = route.totalWeight || 0;
            let volumeVal = route.totalVolume || 0;
            let distVal = route.totalDistance || 0;

            // Jika nilai <= 0, coba hitung manual dari trips
            if ((weightVal <= 0 || volumeVal <= 0 || distVal === 0) && Array.isArray(route.trips)) {
              const manualMetrics = route.trips.reduce(
                (acc, trip) => {
                  if (!trip.isHub) {
                    // Gunakan Math.abs()
                    acc.w += Math.abs(trip.weight || 0);
                    acc.v += Math.abs(trip.volume || 0);
                    acc.d += trip.distance || 0;
                  }
                  return acc;
                },
                { w: 0, v: 0, d: 0 }
              );

              if (weightVal <= 0) weightVal = manualMetrics.w;
              if (volumeVal <= 0) volumeVal = manualMetrics.v;
              if (distVal === 0) distVal = manualMetrics.d;
            }

            // --- AKUMULASI DATA ---
            entry.weight += weightVal;
            entry.maxWeight += route.vehicleMaxWeight || 0;
            entry.volume += volumeVal;
            entry.maxVolume += route.vehicleMaxVolume || 0;
            entry.dist += distVal;
            entry.duration += durationVal;
          });
        }
      }
    });
  }

  // 5. Process Task Data (OUTLETS)
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

  // 6. Sorting
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
    const nameA = (driverA.name || '').toLowerCase();
    const nameB = (driverB.name || '').toLowerCase();
    return nameA.localeCompare(nameB);
  });

  return { driverMap, driverEmails, dateKeys, dataMatrix };
}

/**
 * BAGIAN 2: GENERATOR EXCEL
 */
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

  // --- STYLES ---
  const headerStyle = {
    ...BASE_STYLES.cellCenter,
    font: FONT_STYLES.bold,
    border: { top: BORDERS.thin, bottom: BORDERS.thin, left: BORDERS.thin, right: BORDERS.thin },
  };

  const dataStyle = {
    ...BASE_STYLES.cellCenter,
    border: { top: BORDERS.thin, bottom: BORDERS.thin },
  };

  // --- BUILD DATA ---
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
      // --- UPDATE LOGIC DISPLAY DI SINI ---
      // Syarat mutlak: metrics.outlets > 0
      // Jika outlets == 0 (walaupun ada weight/volume dari routing), tampilkan NULL.
      if (metrics && metrics.outlets > 0) {
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
        // Baris kosong jika tidak ada pengiriman (outlet)
        row.push(null, null, null, null, null, null, null);
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
    merges.push({ s: { r: 0, c: colIdx }, e: { r: 0, c: colIdx + 6 } });
    colIdx += 7;
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

      if (C <= 2) {
        if (R === 0 || R === 1) cellFill = { patternType: 'solid', fgColor: COLORS.dry };
      } else {
        const dateIdx = Math.floor((C - 3) / 7);
        if (dateKeys[dateIdx]) {
          const dObj = new Date(dateKeys[dateIdx].str);
          if (dObj.getUTCDay() === 0) {
            cellFill = FILL_STYLES.red;
          } else {
            if (R === 0) cellFill = { patternType: 'solid', fgColor: COLORS.frozen };
            if (R === 1) cellFill = { patternType: 'solid', fgColor: COLORS.dry };
          }
        }
      }

      if (R === 0 || R === 1) {
        cell.s = { ...headerStyle };
        if (cellFill) cell.s.fill = cellFill;
        if (C > 2 && (C - 3) % 7 === 6) cell.s.border.right = BORDERS.medium;
      } else {
        cell.s = { ...dataStyle };
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
