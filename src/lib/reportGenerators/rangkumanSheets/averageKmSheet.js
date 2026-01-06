// File: src/lib/reportGenerators/rangkumanSheets/averageKmSheet.js
import { formatDateUniversal, normalizeEmail } from '@/lib/utils';
import * as XLSX from 'xlsx-js-style';
import { BASE_STYLES, FILL_STYLES, HEADER_STYLES } from './reportStyles';

function formatLongDate(dateObj, isIndo) {
  return dateObj.toLocaleDateString(isIndo ? 'id-ID' : 'en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatMonthRange(startDateStr, endDateStr, isIndo) {
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  const monthYear = start.toLocaleDateString(isIndo ? 'id-ID' : 'en-GB', {
    month: 'long',
    year: 'numeric',
  });
  return `${start.getDate()}-${end.getDate()} ${monthYear}`;
}

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

/**
 * BAGIAN 1: LOGIKA PERHITUNGAN
 */
export function calculateAverageKmData(
  resultsData,
  startDateStr,
  endDateStr,
  isIndo,
  driverData // <--- Tambahkan parameter driverData
) {
  // 1. Buat Map untuk Driver (Email -> Nama Asli)
  const driverMap = new Map();
  if (driverData && Array.isArray(driverData)) {
    driverData.forEach((d) => {
      if (d.email) {
        driverMap.set(normalizeEmail(d.email), d.name);
      }
    });
  }

  const dailyVehicleMap = {};

  if (resultsData && Array.isArray(resultsData)) {
    resultsData.forEach((dispatch) => {
      const isDone = dispatch.dispatchStatus && dispatch.dispatchStatus.toLowerCase() === 'done';
      const hasResult = dispatch.result && Array.isArray(dispatch.result.routing);

      if (isDone && hasResult) {
        const dateKey = getDeliveryDateFromRouting(dispatch.createdTime);
        const dispatchTimestamp = new Date(dispatch.createdTime).getTime();

        if (dateKey) {
          if (!dailyVehicleMap[dateKey]) {
            dailyVehicleMap[dateKey] = new Map();
          }
          dispatch.result.routing.forEach((route) => {
            const vehicleId = route.vehicleId || route.vehicleName;
            const existingEntry = dailyVehicleMap[dateKey].get(vehicleId);
            if (!existingEntry || dispatchTimestamp > existingEntry.dispatchTimestamp) {
              route.dispatchTimestamp = dispatchTimestamp;
              dailyVehicleMap[dateKey].set(vehicleId, route);
            }
          });
        }
      }
    });
  }

  const summaryData = [];
  const currentIterDate = new Date(startDateStr);
  const endDateObj = new Date(endDateStr);

  let monthTotals = {
    range: formatMonthRange(startDateStr, endDateStr, isIndo),
    dryKm: 0,
    frozenKm: 0,
    totalKm: 0,
    totalVehicle: 0,
    avgKm: 0,
  };

  while (currentIterDate <= endDateObj) {
    const currentDateString = formatDateUniversal(currentIterDate);
    const displayDate = formatLongDate(currentIterDate, isIndo);
    const isSunday = currentIterDate.getDay() === 0;

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
      const vehiclesMap = dailyVehicleMap[currentDateString];
      if (vehiclesMap) {
        vehiclesMap.forEach((route) => {
          const hasTrips = route.trips && route.trips.length > 0;
          if (hasTrips) {
            const tags = route.vehicleTags || [];
            const distMeter = route.totalDistance || 0;
            const distKm = distMeter / 1000;

            const isFrozen = tags.some(
              (t) => typeof t === 'string' && t.toUpperCase().includes('FROZEN')
            );

            // Mapping Nama Driver
            // Prioritas: 1. Map Lokal (driverData), 2. Profile dari Route, 3. Assignee (Email/Raw)
            const rawEmail = route.assignee || route.email;
            let finalDriverName = '-';

            if (rawEmail) {
              const normalized = normalizeEmail(rawEmail);
              if (driverMap.has(normalized)) {
                finalDriverName = driverMap.get(normalized);
              } else {
                finalDriverName = route.driverProfile?.name || rawEmail;
              }
            } else {
              finalDriverName = route.driverProfile?.name || '-';
            }

            const detailItem = {
              plate: route.vehicleName || route.vehicleId,
              driverName: finalDriverName,
              distance: distKm,
              visit: route.trips.length,
            };

            if (isFrozen) {
              rowData.frozenCount++;
              rowData.frozenKm += distKm;
              rowData.frozenDetails.push(detailItem);
            } else {
              rowData.dryCount++;
              rowData.dryKm += distKm;
              rowData.dryDetails.push(detailItem);
            }
          }
        });
      }

      // SORTING: Urutkan detail berdasarkan Nama Driver (A-Z)
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
    currentIterDate.setDate(currentIterDate.getDate() + 1);
  }

  monthTotals.totalKm = monthTotals.dryKm + monthTotals.frozenKm;
  monthTotals.avgKm =
    monthTotals.totalVehicle > 0 ? monthTotals.totalKm / monthTotals.totalVehicle : 0;

  return { summaryData, monthTotals };
}

/**
 * BAGIAN 2: GENERATOR EXCEL
 */
export function generateAverageKmSheet(
  wb,
  resultsData,
  startDateStr,
  endDateStr,
  translate,
  isIndo
) {
  // Karena generateAverageKmSheet untuk Excel jarang pakai driverData (kecuali mau detail di excel),
  // kita pass [] atau null jika tidak diperlukan, atau pass driverData jika tersedia di caller.
  // Untuk amannya, logic excel menggunakan data seadanya dulu.
  const { summaryData, monthTotals } = calculateAverageKmData(
    resultsData,
    startDateStr,
    endDateStr,
    isIndo,
    [] // Empty driverData untuk Excel generator jika data driver tidak di-pass ke fungsi ini
  );

  // ... (SISA KODE generateAverageKmSheet SAMA SEPERTI SEBELUMNYA) ...
  // --- CONTENT ---
  const monthHeader1 = [
    `${translate('summary.tabs.average_km.date')} (${translate('summary.tabs.average_km.month')})`,
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
    translate('summary.tabs.average_km.date'),
    translate('summary.tabs.average_km.total_vehicle'),
    '',
    translate('summary.tabs.average_km.km_routing'),
    '',
    translate('summary.tabs.average_km.total_km_routing'),
    translate('summary.tabs.average_km.avg_km_routing'),
  ];
  const dailyHeader2 = ['', 'Dry', 'Frozen', 'Dry', 'Frozen', '', ''];

  const excelData = [
    monthHeader1,
    monthHeader2,
    monthDataRow,
    [''], // Spacer
    dailyHeader1,
    dailyHeader2,
  ];

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
