// File: src/lib/reportGenerators/rangkumanSheets/truckDetailSheet.js
import {
  formatDateUniversal,
  formatDateWIB,
  formatMinutesToHHMM,
  getUTC7DateString,
  isEmpty,
  parseCustomerString,
} from '@/lib/utils';
import * as XLSX from 'xlsx-js-style';
import { BASE_STYLES, BORDERS, COLORS, FILL_STYLES, FONT_STYLES } from './reportStyles';

// Status yang dianggap GAGAL / BELUM SELESAI
const FAILED_STATUSES = ['PENDING', 'BATAL', 'TERIMA SEBAGIAN'];

const ERROR_STYLES = {
  manual: {
    fill: { patternType: 'solid', fgColor: { rgb: '4F76C7' } },
    font: { color: { rgb: 'FFFFFF' }, bold: true, name: 'Calibri', sz: 11 },
  },
  date: {
    fill: { patternType: 'solid', fgColor: { rgb: 'C85D86' } },
    font: { color: { rgb: 'FFFFFF' }, bold: true, name: 'Calibri', sz: 11 },
  },
  both: {
    fill: { patternType: 'solid', fgColor: { rgb: '5C5FB2' } },
    font: { color: { rgb: 'FFFFFF' }, bold: true, name: 'Calibri', sz: 11 },
  },
};

// --- HELPER DATE (ORIGINAL LOGIC - ROBUST) ---
function getDeliveryDateFromRouting(isoString) {
  if (!isoString) return null;
  try {
    const date = new Date(isoString);
    // Geser ke WIB (UTC+7) dalam miliseconds
    const wibMs = date.getTime() + 7 * 60 * 60 * 1000;
    const wibDate = new Date(wibMs);

    // Ambil hari (0=Minggu, 6=Sabtu)
    const routingDay = wibDate.getUTCDay();

    let offsetDays = 1;
    // Jika Sabtu (6) -> Senin (+2 hari)
    if (routingDay === 6) offsetDays = 2;

    // Tambahkan offset
    const deliveryMs = wibMs + offsetDays * 24 * 60 * 60 * 1000;

    // Return YYYY-MM-DD
    return new Date(deliveryMs).toISOString().split('T')[0];
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

function formatDateTimeWIB(isoString) {
  if (!isoString) return '-';
  try {
    const d = new Date(isoString);
    const dateStr = formatDateUniversal(d, 'DD/MM/YYYY');
    const timeStr = formatDateWIB(d, 'HH:mm');
    return `${dateStr} ${timeStr}`;
  } catch {
    return '-';
  }
}

function parseApiDateString(dateStr) {
  if (!dateStr) return null;
  let isoStr = dateStr.toString().replace(' ', 'T');
  if (!isoStr.endsWith('Z') && !isoStr.includes('+')) isoStr += 'Z';
  const d = new Date(isoStr);
  return isNaN(d.getTime()) ? null : d;
}

export function calculateTruckDetailData(
  driverData,
  resultsData,
  allTasks,
  startDateStr,
  endDateStr,
  isIndo
) {
  const driverMap = new Map();
  const driverEmails = [];

  // 1. Init Master Driver
  if (driverData && Array.isArray(driverData)) {
    driverData.forEach((d) => {
      const plat = d.plat || '-';
      if (isEmpty(plat) || plat.toUpperCase().includes('DEMO')) {
        return;
      }
      const email = d.email ? d.email.toLowerCase().trim() : null;
      if (email && !driverMap.has(email)) {
        driverMap.set(email, { name: d.name, plat: plat, type: getDriverStorageType(d) });
        driverEmails.push(email);
      }
    });
  }

  // 2. Init Date Range (UTC Loop)
  const dateKeys = [];
  const dataMatrix = {};

  const [sY, sM, sD] = startDateStr.split('-').map(Number);
  const [eY, eM, eD] = endDateStr.split('-').map(Number);

  const currentIterDate = new Date(Date.UTC(sY, sM - 1, sD));
  const endDateObj = new Date(Date.UTC(eY, eM - 1, eD));

  while (currentIterDate <= endDateObj) {
    const y = currentIterDate.getUTCFullYear();
    const m = String(currentIterDate.getUTCMonth() + 1).padStart(2, '0');
    const d = String(currentIterDate.getUTCDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;

    // Format Display
    const safeDate = new Date(y, currentIterDate.getUTCMonth(), currentIterDate.getUTCDate());
    const dayNum = safeDate.getDate();
    const monthName = safeDate.toLocaleDateString(isIndo ? 'id-ID' : 'en-GB', { month: 'long' });
    const yearShort = safeDate.toLocaleDateString(isIndo ? 'id-ID' : 'en-GB', { year: '2-digit' });

    dateKeys.push({ str: dateStr, display: `${dayNum}-${monthName} ${yearShort}` });
    dataMatrix[dateStr] = {};

    currentIterDate.setUTCDate(currentIterDate.getUTCDate() + 1);
  }

  // 4. Process Routing (Results) - LOGIKA H+1 KEMBALI DIGUNAKAN
  if (resultsData && Array.isArray(resultsData)) {
    resultsData.forEach((dispatch) => {
      const isDone = dispatch.dispatchStatus && dispatch.dispatchStatus.toLowerCase() === 'done';
      if (isDone && dispatch.result && Array.isArray(dispatch.result.routing)) {
        // GUNAKAN HELPER (H+1 logic)
        const dateKey = getDeliveryDateFromRouting(dispatch.createdTime);

        if (dateKey && dateKey >= startDateStr && dateKey <= endDateStr && dataMatrix[dateKey]) {
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
                hasManualError: false,
                hasBedaHariError: false,
                taskList: [],
              };
            }
            const entry = dataMatrix[dateKey][email];

            let durationVal = route.totalSpentTime || 0;
            if (durationVal === 0 && Array.isArray(route.trips)) {
              const manualSum = route.trips.reduce(
                (acc, trip) =>
                  !trip.isHub
                    ? acc + (trip.travelTime || 0) + (trip.visitTime || 0) + (trip.waitingTime || 0)
                    : acc,
                0
              );
              if (manualSum > 0) durationVal = manualSum;
            }
            let weightVal = route.totalWeight || 0;
            let volumeVal = route.totalVolume || 0;
            let distVal = route.totalDistance || 0;
            if ((weightVal <= 0 || volumeVal <= 0 || distVal === 0) && Array.isArray(route.trips)) {
              const manualMetrics = route.trips.reduce(
                (acc, trip) => {
                  if (!trip.isHub) {
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

  // 5. Process Task Data
  if (allTasks && Array.isArray(allTasks)) {
    allTasks.forEach((task) => {
      const dateKey = getDateFromTask(task.doneTime);

      if (!dateKey) return;
      if (startDateStr && endDateStr) {
        if (dateKey < startDateStr || dateKey > endDateStr) return;
      }

      const assigneeArr = task.assignee || [];
      const email = assigneeArr.length > 0 ? assigneeArr[0].toLowerCase().trim() : null;

      if (email && dataMatrix[dateKey]) {
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
            hasManualError: false,
            hasBedaHariError: false,
            taskList: [],
          };
        }
        const entry = dataMatrix[dateKey][email];
        entry.outlets += 1;
        const flow = task.flow || '-';
        let status =
          flow !== 'Pickup'
            ? task.statusDelivery && task.statusDelivery.length > 0
              ? task.statusDelivery[0].toUpperCase()
              : '-'
            : task.status && task.status.toUpperCase();
        status = status !== 'ONGOING' ? status : '-';
        if (!FAILED_STATUSES.includes(status)) entry.delivered += 1;

        const isManual = !task.eta || !task.etd || !task.routePlannedOrder;
        const startD = getUTC7DateString(task.startTime);
        const doneD = getUTC7DateString(task.doneTime);

        let isDateDiff = false;
        let dayDiffCount = 0;
        if (startD && doneD && startD !== doneD) {
          isDateDiff = true;
          const d1 = new Date(startD);
          const d2 = new Date(doneD);
          const diffTime = Math.abs(d2 - d1);
          dayDiffCount = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        }
        if (isManual) entry.hasManualError = true;
        if (isDateDiff) entry.hasBedaHariError = true;

        const rawSO = task.content || '-';
        const formattedSO = rawSO.replace(/,/g, ', ');

        const isGR = flow.toUpperCase().includes('GR');
        let arrivalSource;
        if (isGR) {
          arrivalSource = task.page1DoneTime;
        } else {
          arrivalSource = task.klikJikaSudahSampai || task.klikJikaAndaSudahSampai;
        }
        const arrObj = parseApiDateString(arrivalSource);
        const arrivalTimestamp = arrObj ? arrObj.getTime() : 9999999999999;
        const realStartTimeStr = arrivalSource
          ? formatDateTimeWIB(arrivalSource)
          : formatDateTimeWIB(task.startTime);
        const { fullCustomerName: customerName } = parseCustomerString(task.customerOrder);

        entry.taskList.push({
          _tempId: Math.random().toString(36).substr(2, 9),
          customerName: customerName,
          soNumber: formattedSO,
          flow: flow,
          status: status,
          isManual: isManual,
          isDateDiff: isDateDiff,
          dayDiff: dayDiffCount,
          startTimeStr: realStartTimeStr,
          roSequence: task.routePlannedOrder,
          arrivalTimestamp: arrivalTimestamp,
        });
      }
    });
  }

  // --- 6. LOGIKA LOOKBACK + STRICT VALIDATION ---
  const LOOKBACK_LIMIT = 3;
  const sortedDateKeys = dateKeys.map((d) => d.str).sort();

  sortedDateKeys.forEach((currDateKey, idx) => {
    if (idx === 0) return; // Skip hari pertama

    driverEmails.forEach((email) => {
      const currData = dataMatrix[currDateKey][email];
      if (!currData) return;

      const hasTasks = currData.outlets > 0;
      const hasRouting = currData.dist > 0 || currData.weight > 0 || currData.volume > 0;

      // KONDISI: Ada Task TAPI Tidak Ada Routing (Indikasi Libur/Error)
      if (hasTasks && !hasRouting) {
        let foundRouting = false;

        // 1. Cek Mundur (Lookback)
        for (let back = 1; back <= LOOKBACK_LIMIT; back++) {
          const prevIdx = idx - back;
          if (prevIdx < 0) break;

          const prevDateKey = sortedDateKeys[prevIdx];
          const prevData = dataMatrix[prevDateKey][email];

          if (prevData) {
            const prevHasRouting = prevData.dist > 0 || prevData.weight > 0 || prevData.volume > 0;
            const prevHasTasks = prevData.outlets > 0;

            // SYARAT: Hari sebelumnya punya Routing TAPI Tidak ada Task
            if (prevHasRouting && !prevHasTasks) {
              // FOUND! Pindahkan data
              currData.weight = prevData.weight;
              currData.maxWeight = prevData.maxWeight;
              currData.volume = prevData.volume;
              currData.maxVolume = prevData.maxVolume;
              currData.dist = prevData.dist;
              currData.duration = prevData.duration;

              // Bersihkan data lama
              prevData.weight = 0;
              prevData.maxWeight = 0;
              prevData.volume = 0;
              prevData.maxVolume = 0;
              prevData.dist = 0;
              prevData.duration = 0;

              foundRouting = true;
              break;
            }
          }
        }

        // 2. STRICT VALIDATION: Jika setelah Lookback tetap tidak ketemu -> HAPUS DATA TASK
        if (!foundRouting) {
          currData.outlets = 0;
          currData.delivered = 0;
          currData.taskList = [];
          currData.hasManualError = false;
          currData.hasBedaHariError = false;
        }
      }
    });
  });

  // --- 7. POST-PROCESSING: SEQUENCE & SORTING ---
  Object.keys(dataMatrix).forEach((dateKey) => {
    Object.keys(dataMatrix[dateKey]).forEach((email) => {
      const entry = dataMatrix[dateKey][email];
      if (entry.taskList && entry.taskList.length > 0) {
        const sortedByTime = [...entry.taskList].sort((a, b) => {
          return a.arrivalTimestamp - b.arrivalTimestamp;
        });
        const realRankMap = new Map();
        sortedByTime.forEach((item, index) => {
          realRankMap.set(item._tempId, index + 1);
        });
        entry.taskList.forEach((item) => {
          item.realSequence = realRankMap.get(item._tempId);
        });
        entry.taskList.sort((a, b) => {
          const roA = a.roSequence === null || a.roSequence === undefined ? -1 : a.roSequence;
          const roB = b.roSequence === null || b.roSequence === undefined ? -1 : b.roSequence;
          if (roA !== roB) return roA - roB;
          return (a.realSequence || 0) - (b.realSequence || 0);
        });
      }
    });
  });

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

export function generateTruckDetailSheet(
  wb,
  driverData,
  resultsData,
  allTasks,
  startDateStr,
  endDateStr,
  translate,
  isIndo
) {
  const { driverMap, driverEmails, dateKeys, dataMatrix } = calculateTruckDetailData(
    driverData,
    resultsData,
    allTasks,
    startDateStr,
    endDateStr,
    isIndo
  );

  const headerStyle = {
    ...BASE_STYLES.cellCenter,
    font: FONT_STYLES.bold,
    border: { top: BORDERS.thin, bottom: BORDERS.thin, left: BORDERS.thin, right: BORDERS.thin },
  };
  const dataStyle = {
    ...BASE_STYLES.cellCenter,
    font: { name: 'Calibri', sz: 11 },
  };

  const row1 = [
    translate('common.storage_type'),
    translate('common.number_plates'),
    translate('common.driver'),
  ];
  const row2 = ['', '', ''];
  dateKeys.forEach((d) => {
    row1.push(d.display, '', '', '', '', '', '');
    row2.push(
      translate('summary.tabs.truck_detail.weight'),
      translate('summary.tabs.truck_detail.volume'),
      translate('summary.tabs.truck_detail.distance'),
      translate('summary.tabs.truck_detail.total_outlet'),
      translate('summary.tabs.truck_detail.total_delivery'),
      translate('summary.tabs.truck_detail.ship_duration'),
      translate('summary.tabs.truck_detail.delivered')
    );
  });
  const excelData = [row1, row2];
  driverEmails.forEach((email) => {
    const driver = driverMap.get(email);
    const row = [driver.type, driver.plat, driver.name];
    dateKeys.forEach((d) => {
      const metrics = dataMatrix[d.str][email];
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
        row.push(null, null, null, null, null, null, null);
      }
    });
    excelData.push(row);
  });

  excelData.push([]);
  const legendStartRow = excelData.length;
  excelData.push([translate('summary.tabs.truck_detail.color_exp')]);
  excelData.push(['', translate('summary.tabs.truck_detail.blue')]);
  excelData.push(['', translate('summary.tabs.truck_detail.magenta')]);
  excelData.push(['', translate('summary.tabs.truck_detail.indigo')]);
  excelData.push([translate('summary.tabs.truck_detail.more_exp')]);

  const ws = XLSX.utils.aoa_to_sheet(excelData);
  const merges = [];
  merges.push({ s: { r: 0, c: 0 }, e: { r: 1, c: 0 } });
  merges.push({ s: { r: 0, c: 1 }, e: { r: 1, c: 1 } });
  merges.push({ s: { r: 0, c: 2 }, e: { r: 1, c: 2 } });
  let colIdx = 3;
  dateKeys.forEach(() => {
    merges.push({ s: { r: 0, c: colIdx }, e: { r: 0, c: colIdx + 6 } });
    colIdx += 7;
  });

  merges.push({ s: { r: legendStartRow, c: 0 }, e: { r: legendStartRow, c: 5 } });
  merges.push({ s: { r: legendStartRow + 1, c: 1 }, e: { r: legendStartRow + 1, c: 6 } });
  merges.push({ s: { r: legendStartRow + 2, c: 1 }, e: { r: legendStartRow + 2, c: 6 } });
  merges.push({ s: { r: legendStartRow + 3, c: 1 }, e: { r: legendStartRow + 3, c: 6 } });
  merges.push({ s: { r: legendStartRow + 4, c: 0 }, e: { r: legendStartRow + 4, c: 6 } });

  ws['!merges'] = merges;
  const range = XLSX.utils.decode_range(ws['!ref']);
  const dataEndRow = 2 + driverEmails.length;

  for (let R = range.s.r; R <= range.e.r; ++R) {
    let driverEmail = null;
    if (R >= 2 && R < dataEndRow) driverEmail = driverEmails[R - 2];
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
      if (!ws[cellRef]) ws[cellRef] = { t: 's', v: '' };
      const cell = ws[cellRef];

      if (R < dataEndRow) {
        let cellFill = null;
        let currentFontStyle = dataStyle.font;
        let borderTop = { style: 'none' };
        let borderBottom = { style: 'none' };
        let borderLeft = { style: 'none' };
        let borderRight = { style: 'none' };

        if (R === 0 || R === 1) {
          cell.s = { ...headerStyle };
          if (C === 2) cell.s.border.right = BORDERS.medium;
          else if (C > 2 && (C - 3) % 7 === 6) cell.s.border.right = BORDERS.medium;

          if (C <= 2) {
            cellFill = { patternType: 'solid', fgColor: COLORS.dry };
          } else {
            const dateIdx = Math.floor((C - 3) / 7);
            if (dateKeys[dateIdx]) {
              const dObj = new Date(dateKeys[dateIdx].str);
              if (dObj.getUTCDay() === 0) cellFill = FILL_STYLES.red;
              else {
                if (R === 0) cellFill = { patternType: 'solid', fgColor: COLORS.frozen };
                if (R === 1) cellFill = { patternType: 'solid', fgColor: COLORS.dry };
              }
            }
          }
        } else {
          if (C <= 2) {
            borderLeft = BORDERS.thin;
            borderRight = BORDERS.thin;
            if (C === 2) borderRight = BORDERS.medium;
            cell.s = {
              ...dataStyle,
              alignment: { horizontal: 'left', vertical: 'center', indent: 1 },
            };
          } else {
            const dateIdx = Math.floor((C - 3) / 7);
            const relativeIdx = (C - 3) % 7;

            borderLeft = { style: 'none' };
            borderRight = { style: 'none' };
            if (relativeIdx === 0) borderLeft = BORDERS.medium;
            if (relativeIdx === 6) borderRight = BORDERS.medium;

            if (dateKeys[dateIdx]) {
              const dateStr = dateKeys[dateIdx].str;
              const dObj = new Date(dateStr);
              const metrics = dataMatrix[dateStr][driverEmail];

              if (dObj.getUTCDay() === 0) cellFill = FILL_STYLES.red;

              if (metrics && metrics.outlets > 0) {
                let errStyle = null;
                if (metrics.hasManualError && metrics.hasBedaHariError)
                  errStyle = ERROR_STYLES.both;
                else if (metrics.hasManualError) errStyle = ERROR_STYLES.manual;
                else if (metrics.hasBedaHariError) errStyle = ERROR_STYLES.date;

                if (errStyle) {
                  cellFill = errStyle.fill;
                  currentFontStyle = errStyle.font;
                }
              }
            }

            if ([0, 1, 6].includes(relativeIdx)) {
              cell.t = 'n';
              cell.s = { ...dataStyle, numFmt: '0.0%' };
            } else if ([2, 3, 4].includes(relativeIdx)) {
              cell.t = 'n';
              cell.s = { ...dataStyle, numFmt: '#,##0' };
            } else {
              cell.s = { ...dataStyle };
            }
          }
          cell.s.border = {
            top: borderTop,
            bottom: borderBottom,
            left: borderLeft,
            right: borderRight,
          };
          cell.s.font = currentFontStyle;
        }
        if (cellFill) cell.s.fill = cellFill;
      } else if (R >= legendStartRow) {
        const relR = R - legendStartRow;
        if (relR === 0 && C === 0) {
          cell.s = { font: { bold: true, underline: true } };
        } else if (relR >= 1 && relR <= 3) {
          if (C === 0) {
            cell.s = { border: BORDERS.thin };
            if (relR === 1) cell.s.fill = ERROR_STYLES.manual.fill;
            if (relR === 2) cell.s.fill = ERROR_STYLES.date.fill;
            if (relR === 3) cell.s.fill = ERROR_STYLES.both.fill;
          } else if (C === 1) {
            cell.s = { alignment: { horizontal: 'left', vertical: 'center' } };
          }
        } else if (relR === 4 && C === 0) {
          cell.s = { font: { italic: true } };
        }
      }
    }
  }
  const cols = [{ wch: 12 }, { wch: 15 }, { wch: 30 }];
  for (let i = 0; i < dateKeys.length * 7; i++) cols.push({ wch: 12 });
  ws['!cols'] = cols;
  XLSX.utils.book_append_sheet(wb, ws, translate('summary.tabs.truck_detail.title'));
}
