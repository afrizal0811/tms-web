// File: src/lib/reportGenerators/rangkumanSheets/averageKmSheet.js
import * as XLSX from 'xlsx-js-style';
import { formatDate } from '@/lib/utils';
import { BORDERS, BASE_STYLES, HEADER_STYLES, FILL_STYLES, FONT_STYLES } from './reportStyles';

function formatLongDate(dateObj) {
  return dateObj.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatMonthRange(startDateStr, endDateStr) {
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  const monthYear = start.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
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
 * BAGIAN 1: LOGIKA PERHITUNGAN (Sama seperti sebelumnya)
 */
export function calculateAverageKmData(resultsData, startDateStr, endDateStr) {
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
    range: formatMonthRange(startDateStr, endDateStr),
    dryKm: 0,
    frozenKm: 0,
    totalKm: 0,
    totalVehicle: 0,
    avgKm: 0,
  };

  while (currentIterDate <= endDateObj) {
    const currentDateString = formatDate(currentIterDate);
    const displayDate = formatLongDate(currentIterDate);
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
    };

    if (!isSunday) {
      const vehiclesMap = dailyVehicleMap[currentDateString];
      if (vehiclesMap) {
        vehiclesMap.forEach((route) => {
          const hasTrips = route.trips && route.trips.length > 0;
          if (hasTrips) {
            const tags = route.vehicleTags || [];
            const distMeter = route.totalDistance || 0;
            const isFrozen = tags.some(
              (t) => typeof t === 'string' && t.toUpperCase().includes('FROZEN')
            );

            if (isFrozen) {
              rowData.frozenCount++;
              rowData.frozenKm += distMeter / 1000;
            } else {
              rowData.dryCount++;
              rowData.dryKm += distMeter / 1000;
            }
          }
        });
      }
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
 * BAGIAN 2: GENERATOR EXCEL (Updated Styling)
 */
export function generateAverageKmSheet(wb, resultsData, startDateStr, endDateStr) {
  const { summaryData, monthTotals } = calculateAverageKmData(
    resultsData,
    startDateStr,
    endDateStr
  );

  // --- CONTENT ---
  const monthHeader1 = [
    'Date (Month)',
    'KM Routing (Month)',
    '',
    'Total KM Routing (Month)',
    'Average KM (Month)',
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
    'Date',
    'Total Vehicle',
    '',
    'KM Routing',
    '',
    'Total KM Routing',
    'Average KM',
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

  // Gunakan variable lokal agar tidak conflict
  
  // *Note: Di atas saya push ke excelRows yg sebenarnya reference ke excelData array yg sama.

  const ws = XLSX.utils.aoa_to_sheet(excelRows);

  // --- MERGING ---
  ws['!merges'] = [
    // Table 1
    { s: { r: 0, c: 0 }, e: { r: 1, c: 0 } },
    { s: { r: 0, c: 1 }, e: { r: 0, c: 2 } },
    { s: { r: 0, c: 3 }, e: { r: 1, c: 3 } },
    { s: { r: 0, c: 4 }, e: { r: 1, c: 4 } },
    // Table 2 (Start Row 4)
    { s: { r: 4, c: 0 }, e: { r: 5, c: 0 } },
    { s: { r: 4, c: 1 }, e: { r: 4, c: 2 } },
    { s: { r: 4, c: 3 }, e: { r: 4, c: 4 } },
    { s: { r: 4, c: 5 }, e: { r: 5, c: 5 } },
    { s: { r: 4, c: 6 }, e: { r: 5, c: 6 } },
  ];

  // --- STYLING (USING REPORTSTYLES) ---
  const range = XLSX.utils.decode_range(ws['!ref']);
  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
      if (!ws[cellRef]) ws[cellRef] = { t: 's', v: '' };
      const cell = ws[cellRef];

      // 1. TABLE 1 (MONTHLY) - Rows 0-2
      if (R < 3) {
        cell.s = { ...BASE_STYLES.cellCenter }; // Default Border

        if (R === 0 || R === 1) {
          cell.s = { ...HEADER_STYLES.main };
        }

        // Data Row (Row 2)
        if (R === 2 && C >= 1) {
          cell.t = 'n';
          cell.s = { ...cell.s, numFmt: '#,##0.000' };

          // Konsistensi warna: Dry (Col 1), Frozen (Col 2)
          if (C === 1) cell.s.fill = FILL_STYLES.dry;
          if (C === 2) cell.s.fill = FILL_STYLES.frozen;
        }
      }

      // 2. TABLE 2 (DAILY) - Rows 4+
      else if (R >= 4) {
        // Headers (Row 4 & 5)
        if (R === 4 || R === 5) {
          cell.s = { ...HEADER_STYLES.main };
        }
        // Data Rows (Row 6+)
        else {
          const dataIndex = R - 6;
          const rowData = summaryData[dataIndex];

          cell.s = { ...BASE_STYLES.cellCenter }; // Base style

          if (rowData && rowData.isSunday) {
            cell.s.fill = FILL_STYLES.red; // Minggu
          } else {
            // Format Angka
            if (C >= 1) {
              cell.t = 'n';
              // Count (Col 1, 2) -> Int
              if (C === 1 || C === 2) {
                cell.s.numFmt = '0';
              } else {
                // KM (Col 3+) -> Decimal
                cell.s.numFmt = '#,##0.000';
              }

              // Warna Kolom Spesifik (Agar sama dengan Truck Usage)
              // Col 3 = Dry KM -> Peach
              if (C === 3) cell.s.fill = FILL_STYLES.dry;
              // Col 4 = Frozen KM -> Blue
              if (C === 4) cell.s.fill = FILL_STYLES.frozen;
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
  XLSX.utils.book_append_sheet(wb, ws, 'Average KM of Routing');
}
