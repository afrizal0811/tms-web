import { convertLocationHistories } from '@/lib/reportGenerators/helper';
import {
  formatDateUniversal,
  formatLongDate,
  getDeliveryDateFromRouting,
  getUTC7DateString,
  isPastDate,
} from '@/lib/utils';
import * as XLSX from 'xlsx-js-style';
import { BASE_STYLES, FILL_STYLES, HEADER_STYLES } from './reportStyles';

function formatMonthRange(startDateStr, endDateStr, localeCode) {
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  const monthYear = start.toLocaleDateString(localeCode, {
    month: 'long',
    year: 'numeric',
  });
  return `${start.getDate()}-${end.getDate()} ${monthYear}`;
}

function createDriverMap(driverData) {
  const emailMap = new Map();
  const platMap = new Map();
  (driverData || []).forEach((d) => {
    let rawTags = d.tags || d.vehicleTags || d.userTags || [];
    if (typeof rawTags === 'string') rawTags = rawTags.split(',');

    let gType = 'DRY';
    if (Array.isArray(rawTags)) {
      const isFrz = rawTags.some(
        (t) =>
          typeof t === 'string' &&
          (t.toUpperCase().includes('FROZEN') || t.toUpperCase().includes('FRZ'))
      );
      if (isFrz) gType = 'FROZEN';
    }

    const payload = {
      name: d.name,
      plat: d.plat,
      type: gType,
    };
    if (d.email) {
      emailMap.set(d.email.toLowerCase().trim(), payload);
    }
    if (d.plat) {
      platMap.set(d.plat.replace(/\s+/g, '').toLowerCase(), payload);
    }
  });
  return { emailMap, platMap };
}

function initializeDateMap(startDateStr, endDateStr) {
  const dateMap = {};
  const [sY, sM, sD] = startDateStr.split('-').map(Number);
  const [eY, eM, eD] = endDateStr.split('-').map(Number);
  const currentIterDate = new Date(Date.UTC(sY, sM - 1, sD));
  const endDateObj = new Date(Date.UTC(eY, eM - 1, eD));

  while (currentIterDate <= endDateObj) {
    const y = currentIterDate.getUTCFullYear();
    const m = String(currentIterDate.getUTCMonth() + 1).padStart(2, '0');
    const d = String(currentIterDate.getUTCDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;
    dateMap[dateStr] = { routingNames: new Set(), vehicles: new Map(), actVehicles: new Map() };
    currentIterDate.setUTCDate(currentIterDate.getUTCDate() + 1);
  }
  return dateMap;
}

export function calculateDistanceSummaryData(
  resultsData,
  startDateStr,
  endDateStr,
  localeCode,
  driverData,
  taskData,
  locationHistoryData
) {
  const taskPresence = {};
  if (taskData && Array.isArray(taskData)) {
    taskData.forEach((t) => {
      const d = getUTC7DateString(t.startTime) || getUTC7DateString(t.doneTime);
      if (d) taskPresence[d] = true;
    });
  }
  const { emailMap, platMap } = createDriverMap(driverData);
  const dateMap = initializeDateMap(startDateStr, endDateStr);

  if (resultsData && Array.isArray(resultsData)) {
    const usedVehiclesPerDay = new Map();

    resultsData.forEach((res) => {
      if (res.dispatchStatus?.toLowerCase() !== 'done') return;
      if (!res.result?.routing) return;

      const dateKey = getDeliveryDateFromRouting(res.createdTime);
      if (!dateKey || !dateMap[dateKey]) return;

      if (res.name) dateMap[dateKey].routingNames.add(res.name);

      if (!usedVehiclesPerDay.has(dateKey)) usedVehiclesPerDay.set(dateKey, new Map());
      const dailyVehicles = usedVehiclesPerDay.get(dateKey);

      res.result.routing.forEach((route) => {
        const validTrips = (route.trips || []).filter((t) => !t.isHub);
        if (validTrips.length === 0) return;

        const assigneeEmail = route.assignee ? String(route.assignee).trim().toLowerCase() : '';
        const vehiclePlatNorm = route.vehicleName
          ? String(route.vehicleName).replace(/\s+/g, '').toLowerCase()
          : '';
        const driverInfo = emailMap.get(assigneeEmail) || platMap.get(vehiclePlatNorm);
        const driverName = driverInfo ? driverInfo.name : route.assignee || route.vehicleName;

        if (!driverName) return;

        let generalType = 'DRY';
        if (route.vehicleTags && route.vehicleTags.length > 0) {
          generalType = String(route.vehicleTags[0]).split('-')[0].toUpperCase();
        } else if (driverInfo && driverInfo.type) {
          generalType = String(driverInfo.type).split('-')[0].toUpperCase();
        }
        if (!['DRY', 'FROZEN'].includes(generalType)) generalType = 'DRY';

        const type = generalType === 'FROZEN' ? 'Frozen' : 'Dry';

        const manualDistMeters = (route.trips || []).reduce(
          (acc, t) => acc + (Number(t.distance) || 0),
          0
        );
        const distMeters = manualDistMeters || route.totalDistance || 0;

        if (!dailyVehicles.has(driverName)) {
          dailyVehicles.set(driverName, {
            storageType: type,
            plate: driverInfo?.plat || route.vehicleName || '',
            driverName,
            distanceMeters: distMeters,
            visits: validTrips.length,
          });
        } else {
          const existing = dailyVehicles.get(driverName);
          existing.distanceMeters += distMeters;
          existing.visits += validTrips.length;
        }
      });
    });

    usedVehiclesPerDay.forEach((dailyVehicles, dateKey) => {
      dailyVehicles.forEach((vh, canonicalPlate) => {
        dateMap[dateKey].vehicles.set(canonicalPlate, vh);
      });
    });

    const LOOKBACK_LIMIT = 3;
    Object.keys(dateMap)
      .sort()
      .forEach((currDateKey) => {
        const currDm = dateMap[currDateKey];
        const currHasTasks = taskPresence[currDateKey];

        if (currHasTasks && currDm.vehicles.size === 0) {
          for (let back = 1; back <= LOOKBACK_LIMIT; back++) {
            const d = new Date(currDateKey);
            d.setDate(d.getDate() - back);
            const prevDateKey = formatDateUniversal(d);
            const prevDm = dateMap[prevDateKey];
            const prevHasTasks = taskPresence[prevDateKey];

            if (prevDm && prevDm.vehicles.size > 0 && !prevHasTasks) {
              prevDm.vehicles.forEach((vh, canonicalPlate) => {
                currDm.vehicles.set(canonicalPlate, vh);
              });
              prevDm.vehicles.clear();

              prevDm.routingNames.forEach((name) => currDm.routingNames.add(name));
              prevDm.routingNames.clear();
              break;
            }
          }
        }
      });
  }

  const summaryData = [];
  let monthTotals = {
    range: formatMonthRange(startDateStr, endDateStr, localeCode),
    dryKm: 0,
    frozenKm: 0,
    totalKm: 0,
    totalVehicle: 0,
    avgKm: 0,
    actDryKm: 0,
    actFrozenKm: 0,
    actTotalKm: 0,
    actTotalVehicle: 0,
    actAvgKm: 0,
  };

  Object.keys(dateMap)
    .sort()
    .forEach((currentDateString) => {
      const [y, m, d] = currentDateString.split('-').map(Number);
      const safeDate = new Date(y, m - 1, d);
      const isSunday = safeDate.getDay() === 0;
      const vehiclesMap = dateMap[currentDateString].vehicles;
      const actVehiclesMap = dateMap[currentDateString].actVehicles;
      const routingNames = Array.from(dateMap[currentDateString].routingNames);

      let rowData = {
        date: currentDateString,
        isSunday,
        isDynamicHoliday: false,
        routingNames,
        dryCount: 0,
        frozenCount: 0,
        dryKm: 0,
        frozenKm: 0,
        totalKm: 0,
        avgKm: 0,
        dryDetails: [],
        frozenDetails: [],
        actDryCount: 0,
        actFrozenCount: 0,
        actDryKm: 0,
        actFrozenKm: 0,
        actTotalKm: 0,
        actAvgKm: 0,
        actDryDetails: [],
        actFrozenDetails: [],
      };

      if (!isSunday) {
        if (vehiclesMap.size > 0) {
          vehiclesMap.forEach((vh) => {
            const distKm = vh.distanceMeters / 1000;
            const detailItem = {
              plate: vh.plate,
              driverName: vh.driverName,
              distance: distKm,
              visit: vh.visits,
            };
            if (vh.storageType === 'Frozen') {
              rowData.frozenCount++;
              rowData.frozenKm += distKm;
              rowData.frozenDetails.push(detailItem);
            } else {
              rowData.dryCount++;
              rowData.dryKm += distKm;
              rowData.dryDetails.push(detailItem);
            }
          });
          rowData.dryDetails.sort((a, b) => (a.driverName || '').localeCompare(b.driverName || ''));
          rowData.frozenDetails.sort((a, b) =>
            (a.driverName || '').localeCompare(b.driverName || '')
          );
          rowData.totalKm = rowData.dryKm + rowData.frozenKm;
          const dailyTotalVehicle = rowData.dryCount + rowData.frozenCount;
          rowData.avgKm = dailyTotalVehicle > 0 ? rowData.totalKm / dailyTotalVehicle : 0;
          monthTotals.dryKm += rowData.dryKm;
          monthTotals.frozenKm += rowData.frozenKm;
          monthTotals.totalVehicle += dailyTotalVehicle;
        } else if (isPastDate(currentDateString)) {
          rowData.isDynamicHoliday = true;
        }
        const { timeDataObjects } = convertLocationHistories(
          locationHistoryData || [],
          driverData || [],
          currentDateString
        );

        const dailyTasks = (taskData || []).filter((t) => {
          const dDate = getUTC7DateString(t.startTime) || getUTC7DateString(t.doneTime);
          return dDate === currentDateString;
        });

        timeDataObjects.forEach((tData) => {
          if (!tData.totalDistance || tData.totalDistance < 5) return;
          if (!tData.startTimeFmt || !tData.finishTimeFmt) return;

          const email = (tData.email || '').toLowerCase().trim();
          const plat = (tData.plat || '').replace(/\s+/g, '').toLowerCase();
          const dInfo = emailMap.get(email) || platMap.get(plat);

          const type = dInfo && String(dInfo.type).toUpperCase() === 'FROZEN' ? 'Frozen' : 'Dry';

          const distKm = tData.totalDistance;

          const actVisits = dailyTasks.filter((t) => {
            const tEmail = Array.isArray(t.assignee)
              ? t.assignee[0]
              : t.assignee || t.assignedTo?.email || t.doneBy;
            return String(tEmail).toLowerCase().trim() === email;
          }).length;

          if (!actVehiclesMap.has(tData.driver)) {
            actVehiclesMap.set(tData.driver, {
              storageType: type,
              plate: tData.plat || '',
              driverName: tData.driver,
              distanceKm: distKm,
              visit: actVisits,
            });
          } else {
            const existing = actVehiclesMap.get(tData.driver);
            existing.distanceKm += distKm;
          }
        });

        if (actVehiclesMap.size > 0) {
          actVehiclesMap.forEach((vh) => {
            const detailItem = {
              plate: vh.plate,
              driverName: vh.driverName,
              distance: vh.distanceKm,
              visit: vh.visit,
            };
            if (vh.storageType === 'Frozen') {
              rowData.actFrozenCount++;
              rowData.actFrozenKm += vh.distanceKm;
              rowData.actFrozenDetails.push(detailItem);
            } else {
              rowData.actDryCount++;
              rowData.actDryKm += vh.distanceKm;
              rowData.actDryDetails.push(detailItem);
            }
          });
          rowData.actDryDetails.sort((a, b) =>
            (a.driverName || '').localeCompare(b.driverName || '')
          );
          rowData.actFrozenDetails.sort((a, b) =>
            (a.driverName || '').localeCompare(b.driverName || '')
          );
          rowData.actTotalKm = rowData.actDryKm + rowData.actFrozenKm;
          const dailyActVehicle = rowData.actDryCount + rowData.actFrozenCount;
          rowData.actAvgKm = dailyActVehicle > 0 ? rowData.actTotalKm / dailyActVehicle : 0;

          monthTotals.actDryKm += rowData.actDryKm;
          monthTotals.actFrozenKm += rowData.actFrozenKm;
          monthTotals.actTotalVehicle += dailyActVehicle;
        }
      }

      summaryData.push(rowData);
    });

  monthTotals.totalKm = monthTotals.dryKm + monthTotals.frozenKm;
  monthTotals.avgKm =
    monthTotals.totalVehicle > 0 ? monthTotals.totalKm / monthTotals.totalVehicle : 0;

  monthTotals.actTotalKm = monthTotals.actDryKm + monthTotals.actFrozenKm;
  monthTotals.actAvgKm =
    monthTotals.actTotalVehicle > 0 ? monthTotals.actTotalKm / monthTotals.actTotalVehicle : 0;

  return { summaryData, monthTotals };
}

export function generateDistanceSummarySheet(
  wb,
  resultsData,
  startDateStr,
  endDateStr,
  translate,
  localeCode,
  driverData,
  taskData,
  locationHistoryData
) {
  const { summaryData, monthTotals } = calculateDistanceSummaryData(
    resultsData,
    startDateStr,
    endDateStr,
    localeCode,
    driverData || [],
    taskData,
    locationHistoryData
  );
  const monthHeader1 = [
    `${translate('common.date')} (${translate('summary.tabs.dist_summary.month')})`,
    `${translate('common.estimate')} (${translate('common.routing')})`,
    '',
    '',
    '',
    `${translate('common.actual')} (${translate('common.delivery')})`,
    '',
    '',
    '',
  ];
  const monthHeader2 = [
    '',
    translate('summary.tabs.dist_summary.km_routing'),
    '',
    translate('summary.tabs.dist_summary.total_routing'),
    translate('summary.tabs.dist_summary.average_routing'),
    translate('summary.tabs.dist_summary.km_routing'),
    '',
    translate('summary.tabs.dist_summary.total_routing'),
    translate('summary.tabs.dist_summary.average_routing'),
  ];
  const monthHeader3 = ['', 'Dry', 'Frozen', '', '', 'Dry', 'Frozen', '', ''];

  const monthDataRow = [
    monthTotals.range,
    monthTotals.dryKm,
    monthTotals.frozenKm,
    monthTotals.totalKm,
    monthTotals.avgKm,
    monthTotals.actDryKm,
    monthTotals.actFrozenKm,
    monthTotals.actTotalKm,
    monthTotals.actAvgKm,
  ];

  const dailyHeader1 = [
    translate('common.delivery_date'),
    `${translate('common.estimate')} (${translate('common.routing')})`,
    '',
    '',
    '',
    '',
    '',
    `${translate('common.actual')} (${translate('common.delivery')})`,
    '',
    '',
    '',
    '',
    '',
  ];
  const dailyHeader2 = [
    '',
    translate('summary.tabs.dist_summary.total_vehicle'),
    '',
    translate('summary.tabs.dist_summary.km_routing'),
    '',
    translate('summary.tabs.dist_summary.total_routing'),
    translate('summary.tabs.dist_summary.average_routing'),
    translate('summary.tabs.dist_summary.total_vehicle'),
    '',
    translate('summary.tabs.dist_summary.km_routing'),
    '',
    translate('summary.tabs.dist_summary.total_routing'),
    translate('summary.tabs.dist_summary.average_routing'),
  ];
  const dailyHeader3 = [
    '',
    'Dry',
    'Frozen',
    'Dry',
    'Frozen',
    '',
    '',
    'Dry',
    'Frozen',
    'Dry',
    'Frozen',
    '',
    '',
  ];

  const excelRows = [
    monthHeader1,
    monthHeader2,
    monthHeader3,
    monthDataRow,
    [''],
    dailyHeader1,
    dailyHeader2,
    dailyHeader3,
  ];
  summaryData.forEach((row) => {
    const [y, m, d] = row.date.split('-').map(Number);
    const displayDate = formatLongDate(new Date(y, m - 1, d), localeCode);
    if (row.isSunday || row.isDynamicHoliday) {
      excelRows.push([
        displayDate,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
      ]);
    } else {
      excelRows.push([
        displayDate,
        row.dryCount,
        row.frozenCount,
        row.dryKm,
        row.frozenKm,
        row.totalKm,
        row.avgKm,
        row.actDryCount,
        row.actFrozenCount,
        row.actDryKm,
        row.actFrozenKm,
        row.actTotalKm,
        row.actAvgKm,
      ]);
    }
  });

  const ws = XLSX.utils.aoa_to_sheet(excelRows);
  const staticMerges = [
    { s: { r: 0, c: 0 }, e: { r: 2, c: 0 } },
    { s: { r: 0, c: 1 }, e: { r: 0, c: 4 } },
    { s: { r: 0, c: 5 }, e: { r: 0, c: 8 } },
    { s: { r: 1, c: 1 }, e: { r: 1, c: 2 } },
    { s: { r: 1, c: 3 }, e: { r: 2, c: 3 } },
    { s: { r: 1, c: 4 }, e: { r: 2, c: 4 } },
    { s: { r: 1, c: 5 }, e: { r: 1, c: 6 } },
    { s: { r: 1, c: 7 }, e: { r: 2, c: 7 } },
    { s: { r: 1, c: 8 }, e: { r: 2, c: 8 } },
    { s: { r: 5, c: 0 }, e: { r: 7, c: 0 } },
    { s: { r: 5, c: 1 }, e: { r: 5, c: 6 } },
    { s: { r: 5, c: 7 }, e: { r: 5, c: 12 } },
    { s: { r: 6, c: 1 }, e: { r: 6, c: 2 } },
    { s: { r: 6, c: 3 }, e: { r: 6, c: 4 } },
    { s: { r: 6, c: 5 }, e: { r: 7, c: 5 } },
    { s: { r: 6, c: 6 }, e: { r: 7, c: 6 } },
    { s: { r: 6, c: 7 }, e: { r: 6, c: 8 } },
    { s: { r: 6, c: 9 }, e: { r: 6, c: 10 } },
    { s: { r: 6, c: 11 }, e: { r: 7, c: 11 } },
    { s: { r: 6, c: 12 }, e: { r: 7, c: 12 } },
  ];

  ws['!merges'] = staticMerges.slice();
  summaryData.forEach((row, idx) => {
    if (row.isSunday || row.isDynamicHoliday) {
      const rowIndex = 8 + idx;
      ws['!merges'].push({ s: { r: rowIndex, c: 1 }, e: { r: rowIndex, c: 12 } });
      const dateCellRef = XLSX.utils.encode_cell({ r: rowIndex, c: 0 });
      ws[dateCellRef].s = {
        ...BASE_STYLES.cellCenter,
        fill: FILL_STYLES.red,
        font: { bold: true },
        alignment: { horizontal: 'center', vertical: 'center' },
      };
      const mergedCellRef = XLSX.utils.encode_cell({ r: rowIndex, c: 1 });
      ws[mergedCellRef] = {
        t: 's',
        v: row.isSunday ? translate('common.holiday_sunday') : '',
        s: {
          ...BASE_STYLES.cellCenter,
          fill: FILL_STYLES.red,
          font: { bold: true },
          alignment: { horizontal: 'center', vertical: 'center' },
        },
      };
      for (let c = 2; c <= 12; c++) {
        const emptyRef = XLSX.utils.encode_cell({ r: rowIndex, c });
        ws[emptyRef] = { t: 's', v: '', s: { ...BASE_STYLES.cellCenter, fill: FILL_STYLES.red } };
      }
    }
  });
  const range = XLSX.utils.decode_range(ws['!ref']);

  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
      if (!ws[cellRef]) ws[cellRef] = { t: 's', v: '' };
      const cell = ws[cellRef];

      const greenFill = { patternType: 'solid', fgColor: { rgb: 'C6EFCE' } };
      const orangeFill = { patternType: 'solid', fgColor: { rgb: 'FCE4D6' } };
      const separatorBorder = { style: 'medium', color: { rgb: '000000' } };

      let cellStyle = { ...BASE_STYLES.cellCenter };

      if (R < 4) {
        if (C > 8) continue;
        if (R < 3) cellStyle = { ...HEADER_STYLES.main };
        if (R === 0 && C === 0) cellStyle.fill = orangeFill;
        if (R === 0 && (C === 1 || C === 5)) cellStyle.fill = greenFill;

        if (R === 3 && C > 0) {
          cell.t = 'n';
          cellStyle.numFmt = '#,##0.00';
        }
      } else if (R >= 5) {
        if (R >= 5 && R <= 7) {
          cellStyle = { ...HEADER_STYLES.main };
          if (R === 5 && C === 0) cellStyle.fill = orangeFill;
          if (R === 5 && (C === 1 || C === 7)) cellStyle.fill = greenFill;
        } else {
          const rowData = summaryData[R - 8];
          if (rowData && (rowData.isSunday || rowData.isDynamicHoliday)) {
            cellStyle.fill = FILL_STYLES.red;
          } else if (C > 0) {
            cell.t = 'n';
            cellStyle.numFmt = C === 1 || C === 2 || C === 7 || C === 8 ? '0' : '#,##0.00';
          }
        }
      }

      if ((R < 4 && C === 4) || (R >= 5 && C === 6)) {
        cellStyle.border = { ...cellStyle.border, right: separatorBorder };
      }

      if ((R === 1 || R === 2) && (C === 3 || C === 4 || C === 7 || C === 8)) {
        cellStyle.alignment = { wrapText: true, horizontal: 'center', vertical: 'center' };
      }
      if ((R === 6 || R === 7) && (C === 5 || C === 6 || C === 11 || C === 12)) {
        cellStyle.alignment = { wrapText: true, horizontal: 'center', vertical: 'center' };
      }

      cell.s = cellStyle;
    }
  }

  ws['!cols'] = [
    { wch: 20 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 15 },
    { wch: 15 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 15 },
    { wch: 15 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, translate('summary.tabs.dist_summary.title'));
}
