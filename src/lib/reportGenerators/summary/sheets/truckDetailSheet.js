import {
  formatDateUniversal,
  formatMinutesToHHMM,
  formatUTC7,
  getBasePlate,
  getDeliveryDateFromRouting,
  getDistance,
  getStorageType,
  heatMap,
  isEmpty,
  isPastDate,
  parseApiDateString,
  parseCustomerString,
} from '@/lib/utils';
import * as XLSX from 'xlsx-js-style';
import { BASE_STYLES, BORDERS, COLORS, FILL_STYLES, FONT_STYLES } from './reportStyles';

const FAILED_STATUSES = new Set(['PENDING', 'BATAL', 'TERIMA SEBAGIAN']);

const ERROR_STYLES = {
  split: {
    fill: { patternType: 'solid', fgColor: { rgb: 'ff8904' } },
    font: { color: { rgb: 'FFFFFF' }, bold: true, name: 'Calibri', sz: 11 },
  },
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

function formatDateTimeWIB(isoString) {
  if (!isoString) return '-';
  try {
    const d = new Date(isoString);
    const dateStr = formatDateUniversal(d, 'DD/MM/YYYY');
    const timeStr = formatDateUniversal(d, 'HH:mm');
    return `${dateStr} ${timeStr}`;
  } catch {
    return '-';
  }
}

export function calculateTruckDetailData(
  driverData,
  resultsData,
  allTasks,
  startDateStr,
  endDateStr,
  localeCode,
  activeHubCoords
) {
  const driverMap = new Map();
  const driverEmails = [];

  if (driverData && Array.isArray(driverData)) {
    driverData.forEach((d) => {
      const plat = d.plat || '-';
      if (isEmpty(plat) || plat.toUpperCase().includes('DEMO')) return;
      const email = d.email ? d.email.toLowerCase().trim() : null;
      if (email && !driverMap.has(email)) {
        driverMap.set(email, {
          name: d.name,
          plat: plat,
          type: getStorageType(d),
          maxWeight: Number(d.maxWeight) || 0,
          maxVolume: Number(d.maxVolume) || 0,
        });
        driverEmails.push(email);
      }
    });
  }

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

    const safeDate = new Date(y, currentIterDate.getUTCMonth(), currentIterDate.getUTCDate());
    const dayNum = safeDate.getDate();
    const monthName = safeDate.toLocaleDateString(localeCode, { month: 'long' });
    const yearShort = safeDate.toLocaleDateString(localeCode, { year: '2-digit' });

    dateKeys.push({
      str: dateStr,
      display: `${dayNum}-${monthName} ${yearShort}`,
      routingNames: [],
    });
    dataMatrix[dateStr] = {};
    currentIterDate.setUTCDate(currentIterDate.getUTCDate() + 1);
  }

  if (resultsData && Array.isArray(resultsData)) {
    resultsData.forEach((dispatch) => {
      const isDone = dispatch.dispatchStatus && dispatch.dispatchStatus.toLowerCase() === 'done';
      if (isDone && dispatch.result && Array.isArray(dispatch.result.routing)) {
        const dateKey = getDeliveryDateFromRouting(dispatch.createdTime);

        if (dateKey) {
          if (!dataMatrix[dateKey]) dataMatrix[dateKey] = {};

          const dkObj = dateKeys.find((dk) => dk.str === dateKey);
          if (dkObj && dispatch.name) {
            dkObj.routingNames.push(dispatch.name);
          }

          dispatch.result.routing.forEach((route) => {
            const email = route.assignee ? route.assignee.toLowerCase().trim() : null;
            if (!email || !driverMap.has(email)) return;
            if (!dataMatrix[dateKey][email]) {
              const driverMasterInfo = driverMap.get(email);
              dataMatrix[dateKey][email] = {
                delivered: 0,
                dist: 0,
                taskDist: 0,
                duration: 0,
                hasDateDiffError: false,
                hasManualError: false,
                isDistFallback: false,
                maxWeight: driverMasterInfo?.maxWeight || route.vehicleMaxWeight || 0,
                maxVolume: driverMasterInfo?.maxVolume || route.vehicleMaxVolume || 0,
                outlets: 0,
                realVolume: 0,
                realWeight: 0,
                taskList: [],
                volume: 0,
                weight: 0,
                seenInvoices: new Set(),
              };
            }
            const entry = dataMatrix[dateKey][email];

            let manualTravel = 0,
              manualVisit = 0,
              manualWait = 0,
              manualDistance = 0;
            if (Array.isArray(route.trips)) {
              const hubTrips = route.trips.filter((t) => t.isHub);
              manualWait = hubTrips.length
                ? Math.max(...hubTrips.map((t) => t.waitingTime || 0))
                : 0;

              route.trips.forEach((trip) => {
                if (!trip.isHub) {
                  manualVisit += trip.visitTime || 0;
                  manualWait += trip.waitingTime || 0;
                }
                manualTravel += trip.travelTime || 0;
                manualDistance += Number(trip.distance) || 0;
              });
            }
            const manualSum = manualTravel + manualVisit + manualWait;
            let durationVal = manualSum || Number(route.totalSpentTime) || 0;
            let distVal = manualDistance || Number(route.totalDistance) || 0;

            entry.maxWeight = Math.max(entry.maxWeight, route.vehicleMaxWeight || 0);
            entry.maxVolume = Math.max(entry.maxVolume, route.vehicleMaxVolume || 0);
            entry.duration = Math.max(entry.duration, durationVal);
            entry.dist = Math.max(entry.dist, distVal);
          });
        }
      }
    });
  }

  const uniqueTasksMap = new Map();
  if (allTasks && Array.isArray(allTasks)) {
    allTasks.forEach((task) => {
      const id = task._id || task.id || task.taskId;
      if (id) {
        uniqueTasksMap.set(id, task);
      } else {
        const fallbackKey = `${task.customerOrder || task.content || ''}_${task.flow || ''}_${task.doneTime || task.startTime || ''}`;
        uniqueTasksMap.set(fallbackKey, task);
      }
    });
  }
  const cleanTasks = Array.from(uniqueTasksMap.values());

  cleanTasks.forEach((task) => {
    const dateKey =
      formatUTC7(task.startTime, 'YYYY-MM-DD') || formatUTC7(task.doneTime, 'YYYY-MM-DD');
    if (!dateKey) return;

    let rawEmail = null;
    if (Array.isArray(task.assignee) && task.assignee.length > 0) {
      rawEmail = task.assignee[0];
    } else if (typeof task.assignee === 'string') {
      rawEmail = task.assignee;
    } else if (task.assignedTo && task.assignedTo.email) {
      rawEmail = task.assignedTo.email;
    } else if (task.doneBy) {
      rawEmail = task.doneBy;
    }
    const email = rawEmail ? rawEmail.toLowerCase().trim() : null;

    if (email && driverMap.has(email)) {
      if (!dataMatrix[dateKey]) dataMatrix[dateKey] = {};

      if (!dataMatrix[dateKey][email]) {
        const masterDriver = driverMap.get(email);
        dataMatrix[dateKey][email] = {
          delivered: 0,
          dist: 0,
          taskDist: 0,
          duration: 0,
          hasDateDiffError: false,
          hasManualError: false,
          hasSplitTask: false,
          isDistFallback: false,
          maxVolume: masterDriver?.maxVolume || 0,
          maxWeight: masterDriver?.maxWeight || 0,
          outlets: 0,
          realVolume: 0,
          realWeight: 0,
          taskList: [],
          volume: 0,
          weight: 0,
        };
      }
      const entry = dataMatrix[dateKey][email];
      entry.outlets += 1;
      const flow = task.flow || '-';
      let statusDelivery = '';
      if (flow !== 'Pickup') {
        if (task.statusDelivery && task.statusDelivery.length > 0) {
          statusDelivery = task.statusDelivery[0].toUpperCase();
        } else if (flow.includes('GR')) {
          if (task.statusGr && task.statusGr.length > 0) {
            statusDelivery = task.statusGr[0].toUpperCase();
          }
        }
      } else {
        statusDelivery = task.status && task.status.toUpperCase();
      }
      statusDelivery = task.status !== 'ONGOING' ? statusDelivery : 'ONGOING';
      if (!FAILED_STATUSES.has(statusDelivery) && task.status !== 'ONGOING') entry.delivered += 1;

      const isManual = !task.eta || !task.etd || !task.routePlannedOrder;
      const hasSplitTask = task.isSplitTask === 'true';
      const startD = formatUTC7(task.startTime, 'YYYY-MM-DD');
      const doneD = formatUTC7(task.doneTime, 'YYYY-MM-DD');

      let isDateDiff = false;
      let dayDiffCount = 0;
      if (startD && doneD && startD !== doneD && doneD > startD) {
        isDateDiff = true;
        const d1 = new Date(startD);
        const d2 = new Date(doneD);
        const diffTime = Math.abs(d2 - d1);
        dayDiffCount = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }
      if (isManual) {
        entry.hasManualError = true;
      }
      if (hasSplitTask) {
        entry.hasSplitTask = true;
      }
      const taskWeight = Math.abs(Number(task.weightKg || task.weight)) || 0;
      const taskVolume = Math.abs(Number(task.volumeCbm || task.volume)) || 0;
      const taskDist = Number(task.distance) || 0;

      entry.weight += taskWeight;
      entry.volume += taskVolume;
      entry.taskDist += taskDist;
      if (!isManual) {
        entry.realWeight += taskWeight;
        entry.realVolume += taskVolume;
      }
      if (isDateDiff) entry.hasDateDiffError = true;

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

      const customerData = parseCustomerString(task.customerOrder || '');
      const finalCustomerName =
        task.customerName || customerData.name || customerData.fullCustomerName;
      const pickupCustomerName = `${task.title} (${finalCustomerName})`;

      let finalSO = customerData.invoiceNumber || task.content || '-';
      finalSO = finalSO.replace(/,/g, ', ');

      entry.taskList.push({
        _tempId: Math.random().toString(36).substr(2, 9),
        customerName: flow === 'Pickup' ? pickupCustomerName : finalCustomerName,
        soNumber: finalSO,
        flow: flow,
        status: statusDelivery,
        isManual: isManual,
        isDateDiff: isDateDiff,
        dayDiff: dayDiffCount,
        startTimeStr: realStartTimeStr,
        roSequence: task.routePlannedOrder,
        arrivalTimestamp: arrivalTimestamp,
        doneCoord: task.doneCoordinate || null,
        expectedCoord: task.expectedCoordinate || null,
        doneTime: task.doneTime || null,
        weight: Math.abs(Number(task.weightKg || task.weight)) || 0,
        volume: Math.abs(Number(task.volumeCbm || task.volume)) || 0,
        isSplitTask: task.isSplitTask === 'true' || false,
      });
    }
  });

  Object.keys(dataMatrix).forEach((dateKey) => {
    Object.keys(dataMatrix[dateKey]).forEach((email) => {
      const entry = dataMatrix[dateKey][email];
      if (entry && (!entry.dist || entry.dist === 0) && entry.taskDist > 0) {
        entry.dist = entry.taskDist;
        entry.isDistFallback = true;
      }
    });
  });

  const LOOKBACK_LIMIT = 3;

  dateKeys.forEach(({ str: currDateKey }) => {
    driverEmails.forEach((email) => {
      const currData = dataMatrix[currDateKey][email];
      if (!currData) return;

      const hasTasks = currData.outlets > 0;
      const hasRouting = currData.duration > 0 || currData.maxWeight > 0 || currData.maxVolume > 0;

      if (hasTasks && !hasRouting) {
        let foundRouting = false;

        for (let back = 1; back <= LOOKBACK_LIMIT; back++) {
          const d = new Date(currDateKey);
          d.setUTCDate(d.getUTCDate() - back);
          const prevDateKey = d.toISOString().split('T')[0];

          const prevData = dataMatrix[prevDateKey]?.[email];

          if (prevData) {
            const prevHasRouting = prevData.dist > 0 || prevData.weight > 0 || prevData.volume > 0;
            const prevHasTasks = (prevData.outlets || 0) > 0;

            if (prevHasRouting && !prevHasTasks) {
              currData.dist = prevData.dist;
              currData.weight = prevData.weight;
              currData.realWeight = prevData.realWeight;
              currData.maxWeight = prevData.maxWeight;
              currData.volume = prevData.volume;
              currData.realVolume = prevData.realVolume;
              currData.maxVolume = prevData.maxVolume;
              currData.dist = prevData.dist;
              currData.duration = prevData.duration;
              prevData.dist = 0;
              prevData.weight = 0;
              prevData.realWeight = 0;
              prevData.maxWeight = 0;
              prevData.volume = 0;
              prevData.realVolume = 0;
              prevData.maxVolume = 0;
              prevData.dist = 0;
              prevData.duration = 0;

              const prevDkObj = dateKeys.find((dk) => dk.str === prevDateKey);
              const currDkObj = dateKeys.find((dk) => dk.str === currDateKey);
              if (prevDkObj && currDkObj && prevDkObj.routingNames) {
                prevDkObj.routingNames.forEach((name) => currDkObj.routingNames.push(name));
              }

              foundRouting = true;
              break;
            }
          }
        }

        if (!foundRouting) {
          currData.outlets = 0;
          currData.delivered = 0;
          currData.taskList = [];
          currData.hasManualError = false;
          currData.hasDateDiffError = false;
          currData.hasSplitTask = false;
        }
      }
    });
  });

  Object.keys(dataMatrix).forEach((dateKey) => {
    Object.keys(dataMatrix[dateKey]).forEach((email) => {
      const entry = dataMatrix[dateKey][email];
      if (entry.taskList && entry.taskList.length > 0) {
        const sortedByTime = [...entry.taskList].sort((a, b) => {
          return a.arrivalTimestamp - b.arrivalTimestamp;
        });
        const realRankMap = new Map();
        let rankCounter = 1;

        sortedByTime.forEach((item) => {
          if (item.arrivalTimestamp === 9999999999999) {
            realRankMap.set(item._tempId, null);
          } else {
            realRankMap.set(item._tempId, rankCounter);
            rankCounter++;
          }
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

        if (activeHubCoords && entry.taskList.length > 0) {
          const lastTask = entry.taskList[entry.taskList.length - 1];
          const doneCoord = lastTask.expectedCoord;
          if (doneCoord) {
            const rawDistance = getDistance(doneCoord, activeHubCoords);
            if (rawDistance !== null) {
              const returnHubDistanceMeters = Math.round(rawDistance * 1.3);
              entry.taskDist += returnHubDistanceMeters;
            }
          }
        }
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
  localeCode,
  activeHubCoords
) {
  const { driverMap, driverEmails, dateKeys, dataMatrix } = calculateTruckDetailData(
    driverData,
    resultsData,
    allTasks,
    startDateStr,
    endDateStr,
    localeCode,
    activeHubCoords
  );

  const isDayEmpty = (dateStr) => {
    if (!dataMatrix || !dataMatrix[dateStr]) return true;
    return driverEmails.every((email) => {
      const metrics = dataMatrix[dateStr][email];
      return !metrics || (metrics.outlets || 0) === 0;
    });
  };

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
    translate('common.license_number'),
    translate('common.driver'),
  ];
  const row2 = ['', '', ''];
  dateKeys.forEach((d) => {
    row1.push(d.display, '', '', '', '', '', '');
    row2.push(
      translate('common.weight'),
      translate('common.volume'),
      translate('common.distance'),
      translate('summary.tabs.truck_detail.total_outlet'),
      translate('summary.tabs.truck_detail.total_delivery'),
      translate('summary.tabs.truck_detail.ship_duration'),
      translate('summary.tabs.truck_detail.delivered')
    );
  });
  const excelData = [row1, row2];
  driverEmails.forEach((email, rowIndex) => {
    const driver = driverMap.get(email);
    const row = [driver.type, getBasePlate(driver.plat), driver.name];
    dateKeys.forEach((d) => {
      const metrics = dataMatrix[d.str][email];
      const isSun = new Date(d.str).getDay() === 0;
      const dayIsEmpty = isDayEmpty(d.str);
      const isPast = isPastDate(d.str);
      const isDynamic = !isSun && isPast && dayIsEmpty;
      const isHoliday = isSun || isDynamic;
      const shouldMergeHoliday = isHoliday && dayIsEmpty;

      if (shouldMergeHoliday) {
        if (rowIndex === 0) {
          const text = isSun ? translate('common.holiday_sunday') : translate('common.holiday');
          row.push(text, null, null, null, null, null, null);
        } else {
          row.push(null, null, null, null, null, null, null);
        }
      } else if (metrics && metrics.outlets > 0) {
        const weightPct = metrics.maxWeight > 0 ? metrics.weight / metrics.maxWeight : '-';
        const volPct = metrics.maxVolume > 0 ? metrics.volume / metrics.maxVolume : '-';
        const delPct = metrics.outlets > 0 ? metrics.delivered / metrics.outlets : '-';
        const distKm = metrics.dist > 0 ? Number((metrics.dist / 1000).toFixed(2)) : '-';
        const duration = metrics.duration > 0 ? formatMinutesToHHMM(metrics.duration) : '-';
        row.push(weightPct, volPct, distKm, metrics.outlets, metrics.delivered, duration, delPct);
      } else {
        row.push(null, null, null, null, null, null, null);
      }
    });
    excelData.push(row);
  });

  excelData.push([]);
  const legendStartRow = excelData.length;
  excelData.push([translate('summary.tabs.truck_detail.color_exp')]);
  excelData.push(['', translate('summary.tabs.truck_detail.orange')]);
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
  dateKeys.forEach((d) => {
    merges.push({ s: { r: 0, c: colIdx }, e: { r: 0, c: colIdx + 6 } });
    const isSun = new Date(d.str).getDay() === 0;
    const dayIsEmpty = isDayEmpty(d.str);
    const isPast = isPastDate(d.str);
    const isDynamic = !isSun && isPast && dayIsEmpty;
    const isHoliday = isSun || isDynamic;
    if (isHoliday && dayIsEmpty && driverEmails.length > 0) {
      merges.push({
        s: { r: 2, c: colIdx },
        e: { r: 2 + driverEmails.length - 1, c: colIdx + 6 },
      });
    }

    colIdx += 7;
  });
  merges.push({ s: { r: legendStartRow, c: 0 }, e: { r: legendStartRow, c: 5 } });
  merges.push({ s: { r: legendStartRow + 1, c: 1 }, e: { r: legendStartRow + 1, c: 6 } });
  merges.push({ s: { r: legendStartRow + 2, c: 1 }, e: { r: legendStartRow + 2, c: 6 } });
  merges.push({ s: { r: legendStartRow + 3, c: 1 }, e: { r: legendStartRow + 3, c: 6 } });
  merges.push({ s: { r: legendStartRow + 4, c: 1 }, e: { r: legendStartRow + 4, c: 6 } });
  merges.push({ s: { r: legendStartRow + 5, c: 0 }, e: { r: legendStartRow + 5, c: 6 } });

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
              const dateStr = dateKeys[dateIdx].str;
              const [y, m, day] = dateStr.split('-').map(Number);
              const safeDate = new Date(y, m - 1, day);

              const isSun = safeDate.getDay() === 0;
              const isDynamic = !isSun && isPastDate(dateStr) && isDayEmpty(dateStr);

              if (isSun || isDynamic) {
                cellFill = FILL_STYLES.red;
              } else {
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

            let shouldMergeHoliday = false;
            let metrics = null;

            if (dateKeys[dateIdx]) {
              const dateStr = dateKeys[dateIdx].str;
              const [y, m, day] = dateStr.split('-').map(Number);
              const safeDate = new Date(y, m - 1, day);
              metrics = dataMatrix[dateStr][driverEmail];
              const isSun = safeDate.getDay() === 0;
              const dayIsEmpty = isDayEmpty(dateStr);
              const isDynamic = !isSun && isPastDate(dateStr) && dayIsEmpty;
              const isHoliday = isSun || isDynamic;

              shouldMergeHoliday = isHoliday && dayIsEmpty;

              if (isHoliday) cellFill = FILL_STYLES.red;

              if (metrics && metrics.outlets > 0) {
                let errStyle = null;
                if (metrics.hasManualError && metrics.hasDateDiffError)
                  errStyle = ERROR_STYLES.both;
                else if (metrics.hasManualError) errStyle = ERROR_STYLES.manual;
                else if (metrics.hasDateDiffError) errStyle = ERROR_STYLES.date;
                if (errStyle) {
                  cellFill = errStyle.fill;
                  currentFontStyle = errStyle.font;
                }
                if (metrics.hasManualError && (relativeIdx === 2 || relativeIdx === 5)) {
                  currentFontStyle = { ...currentFontStyle, bold: true, color: { rgb: 'FFB3B3' } };
                }
              }
            }
            if (shouldMergeHoliday && R === 2 && relativeIdx === 0) {
              cell.t = 's';
              cell.s = { ...dataStyle, alignment: { horizontal: 'center', vertical: 'center' } };
              currentFontStyle = { ...FONT_STYLES.bold, color: { rgb: '9C0006' } };
            } else if ([0, 1].includes(relativeIdx)) {
              cell.t = 'n';
              cell.s = { ...dataStyle, numFmt: '0.0%;;"-"' };
            } else if (relativeIdx === 6) {
              cell.t = 'n';
              cell.s = { ...dataStyle, numFmt: '0.0%' };
              if (metrics && metrics.outlets > 0) {
                const pct = Math.min(Math.max(metrics.delivered / metrics.outlets, 0), 1);
                const hexColor = heatMap(pct);
                cellFill = { patternType: 'solid', fgColor: { rgb: hexColor } };
                currentFontStyle = dataStyle.font;
              }
            } else if (relativeIdx === 2) {
              cell.t = 'n';
              cell.s = { ...dataStyle, numFmt: '#,##0.00;(#,##0.00);"-"' };
            } else if ([3, 4].includes(relativeIdx)) {
              cell.t = 'n';
              cell.s = { ...dataStyle, numFmt: '#,##0' };
            } else {
              cell.s = { ...dataStyle };
            }
            if (relativeIdx === 3 && metrics && metrics.hasSplitTask) {
              const splitBorder = { style: 'medium', color: { rgb: 'ff8904' } };
              borderTop = splitBorder;
              borderBottom = splitBorder;
              borderLeft = splitBorder;
              borderRight = splitBorder;
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
        } else if (relR >= 1 && relR <= 4) {
          if (C === 0) {
            cell.s = { border: BORDERS.thin };
            if (relR === 1) cell.s.fill = ERROR_STYLES.split.fill;
            if (relR === 2) cell.s.fill = ERROR_STYLES.manual.fill;
            if (relR === 3) cell.s.fill = ERROR_STYLES.date.fill;
            if (relR === 4) cell.s.fill = ERROR_STYLES.both.fill;
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
