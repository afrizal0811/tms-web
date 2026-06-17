// File: src/lib/reportGenerators/rangkumanSheets/averageKmSheet.js
import { getUnifiedVehicleMap } from '@/lib/unifiedRouting';
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

export function calculateAverageKmData(
  resultsData,
  startDateStr,
  endDateStr,
  localeCode,
  driverData
) {
  const unifiedMap = getUnifiedVehicleMap(resultsData, driverData);
  const summaryData = [];

  const [sY, sM, sD] = startDateStr.split('-').map(Number);
  const [eY, eM, eD] = endDateStr.split('-').map(Number);

  const currentIterDate = new Date(Date.UTC(sY, sM - 1, sD));
  const endDateObj = new Date(Date.UTC(eY, eM - 1, eD));

  let monthTotals = {
    range: formatMonthRange(startDateStr, endDateStr, localeCode),
    dryKm: 0,
    frozenKm: 0,
    totalKm: 0,
    totalVehicle: 0,
    avgKm: 0,
  };

  while (currentIterDate <= endDateObj) {
    const y = currentIterDate.getUTCFullYear();
    const m = String(currentIterDate.getUTCMonth() + 1).padStart(2, '0');
    const d = String(currentIterDate.getUTCDate()).padStart(2, '0');
    const currentDateString = `${y}-${m}-${d}`;

    const safeDate = new Date(y, currentIterDate.getUTCMonth(), currentIterDate.getUTCDate());
    const displayDate = formatLongDate(safeDate, localeCode);
    const isSunday = currentIterDate.getUTCDay() === 0;

    let rowData = {
      date: displayDate,
      isSunday: isSunday,
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
      const vehiclesMap = unifiedMap[currentDateString];
      if (vehiclesMap) {
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
      }

      rowData.dryDetails.sort((a, b) => (a.driverName || '').localeCompare(b.driverName || ''));
      rowData.frozenDetails.sort((a, b) => (a.driverName || '').localeCompare(b.driverName || ''));

      rowData.totalKm = rowData.dryKm + rowData.frozenKm;
      const dailyTotalVehicle = rowData.dryCount + rowData.frozenCount;
      rowData.avgKm = dailyTotalVehicle > 0 ? rowData.totalKm / dailyTotalVehicle : 0;

      monthTotals.dryKm += rowData.dryKm;
      monthTotals.frozenKm += rowData.frozenKm;
      monthTotals.totalVehicle += dailyTotalVehicle;
    }

    summaryData.push(rowData);
    currentIterDate.setUTCDate(currentIterDate.getUTCDate() + 1);
  }

  monthTotals.totalKm = monthTotals.dryKm + monthTotals.frozenKm;
  monthTotals.avgKm =
    monthTotals.totalVehicle > 0 ? monthTotals.totalKm / monthTotals.totalVehicle : 0;

  return { summaryData, monthTotals };
}

export function generateAverageKmSheet(
  wb,
  resultsData,
  startDateStr,
  endDateStr,
  translate,
  localeCode
) {
  const { summaryData, monthTotals } = calculateAverageKmData(
    resultsData,
    startDateStr,
    endDateStr,
    localeCode,
    []
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

  const excelData = [monthHeader1, monthHeader2, monthDataRow, [''], dailyHeader1, dailyHeader2];

  const excelRows = excelData;
  summaryData.forEach((row) => {
    if (row.isSunday) {
      excelRows.push([row.date, null, null, null, null, null, null]);
    } else {
      excelRows.push([
        row.date,
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
  if (!ws['!merges']) ws['!merges'] = [];

  summaryData.forEach((row, idx) => {
    if (row.isSunday) {
      const rowIndex = 6 + idx;
      ws['!merges'].push({
        s: { r: rowIndex, c: 1 },
        e: { r: rowIndex, c: 6 },
      });
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
        v: translate('summary.tabs.average_km.holiday'),
        s: {
          ...BASE_STYLES.cellCenter,
          fill: FILL_STYLES.red,
          font: { bold: true },
          alignment: { horizontal: 'center', vertical: 'center' },
        },
      };
      for (let c = 2; c <= 6; c++) {
        const emptyRef = XLSX.utils.encode_cell({ r: rowIndex, c });
        ws[emptyRef] = {
          t: 's',
          v: '',
          s: { ...BASE_STYLES.cellCenter, fill: FILL_STYLES.red },
        };
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
        if (R === 4 || R === 5) {
          cell.s = { ...HEADER_STYLES.main };
        } else {
          const dataIndex = R - 6;
          const rowData = summaryData[dataIndex];
          if (rowData && rowData.isSunday) {
            if (C === 0) {
              cell.s = {
                ...((ws[cellRef] && ws[cellRef].s) || BASE_STYLES.cellCenter),
                fill: FILL_STYLES.red,
                font: { bold: true },
                alignment: { horizontal: 'center', vertical: 'center' },
              };
              cell.t = 's';
            } else if (C === 1) {
              const existing = (ws[cellRef] && ws[cellRef].s) || BASE_STYLES.cellCenter;
              cell.s = {
                ...existing,
                fill: FILL_STYLES.red,
                font: { bold: true },
                alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
              };
              cell.t = 's';
            } else {
              cell.s = { ...BASE_STYLES.cellCenter, fill: FILL_STYLES.red };
              cell.t = 's';
            }
            continue;
          }
          cell.s = { ...BASE_STYLES.cellCenter };
          if (rowData) {
            if (C >= 1) {
              cell.t = 'n';
              if (C === 1 || C === 2) {
                cell.s.numFmt = '0';
              } else {
                cell.s.numFmt = '#,##0.000';
              }
              if (C === 3) cell.s.fill = FILL_STYLES.dry;
              if (C === 4) cell.s.fill = FILL_STYLES.frozen;
            } else {
              cell.t = 's';
            }
          }
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
