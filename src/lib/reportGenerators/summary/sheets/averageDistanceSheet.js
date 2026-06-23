import { formatLongDate } from '@/lib/utils';
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
  const driverMapHash = new Map();
  (driverData || []).forEach((d) => {
    if (d.email) {
      let rawTags = d.tags || d.vehicleTags || d.userTags || [];
      if (typeof rawTags === 'string') rawTags = rawTags.split(',');
      let mTag = '';
      if (Array.isArray(rawTags) && rawTags.length > 0) {
        mTag =
          rawTags.find(
            (t) =>
              typeof t === 'string' &&
              (t.toUpperCase().includes('DRY') ||
                t.toUpperCase().includes('FROZEN') ||
                t.toUpperCase().includes('FRZ'))
          ) || rawTags[0];
      }
      driverMapHash.set(d.email.toLowerCase().trim(), {
        name: d.name,
        storage: (d.storage || 'DRY').toUpperCase(),
        plat: d.plat,
        masterTag: mTag,
      });
    }
  });
  return driverMapHash;
}

function getRoutingDateWIB(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  const wib = new Date(d.getTime() + 7 * 60 * 60 * 1000);
  return `${wib.getUTCFullYear()}-${String(wib.getUTCMonth() + 1).padStart(2, '0')}-${String(wib.getUTCDate()).padStart(2, '0')}`;
}

function isPastDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const currentMidnight = new Date(y, m - 1, d);
  currentMidnight.setHours(0, 0, 0, 0);
  return currentMidnight < new Date().setHours(0, 0, 0, 0);
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
    dateMap[dateStr] = { routingNames: new Set(), vehicles: new Map() };
    currentIterDate.setUTCDate(currentIterDate.getUTCDate() + 1);
  }
  return dateMap;
}

export function calculateAverageDistanceData(
  resultsData,
  startDateStr,
  endDateStr,
  localeCode,
  driverData
) {
  const driverMapHash = createDriverMap(driverData);
  const dateMap = initializeDateMap(startDateStr, endDateStr);

  if (resultsData && Array.isArray(resultsData)) {
    const usedVehiclesPerDay = new Map();

    resultsData.forEach((res) => {
      if (res.dispatchStatus?.toLowerCase() !== 'done') return;
      if (!res.result?.routing) return;

      const dateKey = getRoutingDateWIB(res.createdTime);
      if (!dateKey || !dateMap[dateKey]) return;

      if (res.name) dateMap[dateKey].routingNames.add(res.name);

      if (!usedVehiclesPerDay.has(dateKey)) usedVehiclesPerDay.set(dateKey, new Map());
      const dailyVehicles = usedVehiclesPerDay.get(dateKey);

      res.result.routing.forEach((route) => {
        const validTrips = (route.trips || []).filter((t) => !t.isHub);
        if (validTrips.length === 0) return;

        const rawEmail = (route.assignee || route.email || '').toLowerCase().trim();
        const rawPlate = route.vehicleName || route.vehicleId || route.licensePlate || '';
        const strictBasePlate = rawPlate.replace(/\s*\([^)]*\)/g, '').trim();
        const canonicalPlate =
          strictBasePlate.replace(/\s+/g, '').toLowerCase() || `unknown-${Math.random()}`;

        let driverInfo = driverMapHash.get(rawEmail);
        const storage = driverInfo ? driverInfo.storage : 'DRY';
        const routingTag =
          route.vehicleTags && route.vehicleTags.length > 0 ? String(route.vehicleTags[0]) : '';
        const firstTag = driverInfo && driverInfo.masterTag ? driverInfo.masterTag : routingTag;

        const isFrozen =
          storage.includes('FROZEN') ||
          firstTag.toUpperCase().includes('FROZEN') ||
          firstTag.toUpperCase().includes('FRZ');
        const type = isFrozen ? 'Frozen' : 'Dry';

        const finalPlate = driverInfo
          ? (driverInfo.plat || '').replace(/\s*\([^)]*\)/g, '').trim()
          : strictBasePlate;
        const driverName = driverInfo ? driverInfo.name : route.assignee || '-';

        let distMeters = route.totalDistance || 0;
        if (distMeters === 0)
          distMeters = validTrips.reduce((acc, t) => acc + (t.distance || 0), 0);
        const distKm = distMeters / 1000;

        if (!dailyVehicles.has(canonicalPlate)) {
          dailyVehicles.set(canonicalPlate, {
            storageType: type,
            plate: finalPlate,
            driverName,
            distanceKm: distKm,
            visits: validTrips.length,
          });
        } else {
          const existing = dailyVehicles.get(canonicalPlate);
          existing.distanceKm += distKm;
          existing.visits += validTrips.length;
        }
      });
    });

    usedVehiclesPerDay.forEach((dailyVehicles, dateKey) => {
      dailyVehicles.forEach((vh, canonicalPlate) => {
        dateMap[dateKey].vehicles.set(canonicalPlate, vh);
      });
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
  };

  Object.keys(dateMap)
    .sort()
    .forEach((currentDateString) => {
      const [y, m, d] = currentDateString.split('-').map(Number);
      const safeDate = new Date(y, m - 1, d);
      const isSunday = safeDate.getDay() === 0;
      const vehiclesMap = dateMap[currentDateString].vehicles;
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
      };

      if (!isSunday) {
        if (vehiclesMap.size > 0) {
          vehiclesMap.forEach((vh) => {
            const detailItem = {
              plate: vh.plate,
              driverName: vh.driverName,
              distance: vh.distanceKm,
              visit: vh.visits,
            };
            if (vh.storageType === 'Frozen') {
              rowData.frozenCount++;
              rowData.frozenKm += vh.distanceKm;
              rowData.frozenDetails.push(detailItem);
            } else {
              rowData.dryCount++;
              rowData.dryKm += vh.distanceKm;
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
      }
      summaryData.push(rowData);
    });

  monthTotals.totalKm = monthTotals.dryKm + monthTotals.frozenKm;
  monthTotals.avgKm =
    monthTotals.totalVehicle > 0 ? monthTotals.totalKm / monthTotals.totalVehicle : 0;

  return { summaryData, monthTotals };
}

export function generateAverageDistanceSheet(
  wb,
  resultsData,
  startDateStr,
  endDateStr,
  translate,
  localeCode,
  driverData
) {
  const { summaryData, monthTotals } = calculateAverageDistanceData(
    resultsData,
    startDateStr,
    endDateStr,
    localeCode,
    driverData || []
  );

  const monthHeader1 = [
    `${translate('common.date') || 'Routing Date'} (${translate('summary.tabs.average_km.month')})`,
    translate('summary.tabs.average_km.km_routing'),
    '',
    translate('summary.tabs.average_km.total_km_routing'),
    translate('summary.tabs.average_km.avg_km_routing'),
  ];
  const monthHeader2 = ['', 'Dry', 'Frozen', '', ''];
  const monthDataRow = [
    monthTotals.range,
    monthTotals.dryKm,
    monthTotals.frozenKm,
    monthTotals.totalKm,
    monthTotals.avgKm,
  ];
  const dailyHeader1 = [
    translate('common.date') || 'Routing Date',
    translate('summary.tabs.average_km.total_vehicle'),
    '',
    translate('summary.tabs.average_km.km_routing'),
    '',
    translate('summary.tabs.average_km.total_km_routing'),
    translate('summary.tabs.average_km.avg_km_routing'),
  ];
  const dailyHeader2 = ['', 'Dry', 'Frozen', 'Dry', 'Frozen', '', ''];

  const excelRows = [monthHeader1, monthHeader2, monthDataRow, [''], dailyHeader1, dailyHeader2];

  summaryData.forEach((row) => {
    const [y, m, d] = row.date.split('-').map(Number);
    const displayDate = formatLongDate(new Date(y, m - 1, d), localeCode);
    if (row.isSunday || row.isDynamicHoliday) {
      excelRows.push([displayDate, null, null, null, null, null, null]);
    } else {
      excelRows.push([
        displayDate,
        row.dryCount,
        row.frozenCount,
        row.dryKm,
        row.frozenKm,
        row.totalKm,
        row.avgKm,
      ]);
    }
  });

  const ws = XLSX.utils.aoa_to_sheet(excelRows);
  const staticMerges = [
    { s: { r: 0, c: 0 }, e: { r: 1, c: 0 } },
    { s: { r: 0, c: 1 }, e: { r: 0, c: 2 } },
    { s: { r: 0, c: 3 }, e: { r: 1, c: 3 } },
    { s: { r: 0, c: 4 }, e: { r: 1, c: 4 } },
    { s: { r: 4, c: 0 }, e: { r: 5, c: 0 } },
    { s: { r: 4, c: 1 }, e: { r: 4, c: 2 } },
    { s: { r: 4, c: 3 }, e: { r: 4, c: 4 } },
    { s: { r: 4, c: 5 }, e: { r: 5, c: 5 } },
    { s: { r: 4, c: 6 }, e: { r: 5, c: 6 } },
  ];

  ws['!merges'] = staticMerges.slice();
  summaryData.forEach((row, idx) => {
    if (row.isSunday || row.isDynamicHoliday) {
      const rowIndex = 6 + idx;
      ws['!merges'].push({ s: { r: rowIndex, c: 1 }, e: { r: rowIndex, c: 6 } });
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
      for (let c = 2; c <= 6; c++) {
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
      if (R < 3) {
        if (C > 4) continue;
        cell.s = { ...BASE_STYLES.cellCenter };
        if (R === 0 || R === 1) cell.s = { ...HEADER_STYLES.main };
        if (R === 2 && C >= 1) {
          cell.t = 'n';
          cell.s = { ...cell.s, numFmt: '#,##0.000' };
          if (C === 1) cell.s.fill = FILL_STYLES.dry;
          if (C === 2) cell.s.fill = FILL_STYLES.frozen;
        }
      } else if (R >= 4) {
        if (R === 4 || R === 5) cell.s = { ...HEADER_STYLES.main };
        else {
          const rowData = summaryData[R - 6];
          if (rowData && (rowData.isSunday || rowData.isDynamicHoliday)) {
            cell.s = {
              ...((ws[cellRef] && ws[cellRef].s) || BASE_STYLES.cellCenter),
              fill: FILL_STYLES.red,
              font: { bold: true },
              alignment: { horizontal: 'center', vertical: 'center' },
            };
            if (C === 0) cell.t = 's';
            else if (C === 1) cell.s.alignment = { ...cell.s.alignment, wrapText: true };
            else cell.s = { ...BASE_STYLES.cellCenter, fill: FILL_STYLES.red };
            continue;
          }
          cell.s = { ...BASE_STYLES.cellCenter };
          if (rowData && C >= 1) {
            cell.t = 'n';
            cell.s.numFmt = C === 1 || C === 2 ? '0' : '#,##0.000';
            if (C === 3) cell.s.fill = FILL_STYLES.dry;
            if (C === 4) cell.s.fill = FILL_STYLES.frozen;
          } else cell.t = 's';
        }
      }
    }
  }
  ws['!cols'] = [
    { wch: 20 },
    { wch: 10 },
    { wch: 10 },
    { wch: 15 },
    { wch: 15 },
    { wch: 18 },
    { wch: 15 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, translate('summary.tabs.average_km.title'));
}
