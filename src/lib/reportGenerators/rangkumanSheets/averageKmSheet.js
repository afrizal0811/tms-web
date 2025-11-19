// File: src/lib/reportGenerators/rangkumanSheets/averageKmSheet.js
import * as XLSX from 'xlsx-js-style';
import { formatDate } from '@/lib/utils';
import { styles } from './reportStyles';

function formatLongDate(dateObj) {
  return dateObj.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

// Helper: Format "1-30 November 2025"
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
 * BAGIAN 1: LOGIKA PERHITUNGAN (CLEAN)
 */
export function calculateAverageKmData(resultsData, startDateStr, endDateStr) {
  const dailyVehicleMap = {};

  // A. Processing Data
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

  // Variabel Akumulasi Bulanan
  let monthTotals = {
    range: formatMonthRange(startDateStr, endDateStr),
    dryKm: 0,
    frozenKm: 0,
    totalKm: 0,
    totalVehicle: 0,
    avgKm: 0,
  };

  // B. Looping & Calculation
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

      // Akumulasi ke Bulanan
      monthTotals.dryKm += rowData.dryKm;
      monthTotals.frozenKm += rowData.frozenKm;
      monthTotals.totalVehicle += dailyTotalVehicle;
    }

    summaryData.push(rowData);
    currentIterDate.setDate(currentIterDate.getDate() + 1);
  }

  // Hitung Total Akhir Bulan
  monthTotals.totalKm = monthTotals.dryKm + monthTotals.frozenKm;
  monthTotals.avgKm =
    monthTotals.totalVehicle > 0 ? monthTotals.totalKm / monthTotals.totalVehicle : 0;

  return { summaryData, monthTotals };
}

/**
 * BAGIAN 2: GENERATOR EXCEL (2 Tabel)
 */
export function generateAverageKmSheet(wb, resultsData, startDateStr, endDateStr) {
  const { summaryData, monthTotals } = calculateAverageKmData(
    resultsData,
    startDateStr,
    endDateStr
  );

  // --- TABEL 1: MONTH SUMMARY ---
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

  // --- TABEL 2: DAILY DETAILS ---
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

  // Gabungkan semua baris
  const excelRows = [
    monthHeader1,
    monthHeader2,
    monthDataRow,
    [''], // Spasi antar tabel
    dailyHeader1,
    dailyHeader2,
  ];

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

  // --- MERGING ---
  ws['!merges'] = [
    // Tabel Atas (Month)
    { s: { r: 0, c: 0 }, e: { r: 1, c: 0 } }, // Date
    { s: { r: 0, c: 1 }, e: { r: 0, c: 2 } }, // KM Routing Header
    { s: { r: 0, c: 3 }, e: { r: 1, c: 3 } }, // Total KM
    { s: { r: 0, c: 4 }, e: { r: 1, c: 4 } }, // Avg KM

    // Tabel Bawah (Daily) - Start Row 4 (Index 4)
    { s: { r: 4, c: 0 }, e: { r: 5, c: 0 } }, // Date
    { s: { r: 4, c: 1 }, e: { r: 4, c: 2 } }, // Total Vehicle
    { s: { r: 4, c: 3 }, e: { r: 4, c: 4 } }, // KM Routing
    { s: { r: 4, c: 5 }, e: { r: 5, c: 5 } }, // Total KM
    { s: { r: 4, c: 6 }, e: { r: 5, c: 6 } }, // Avg KM
  ];

  // --- STYLING ---
  const range = XLSX.utils.decode_range(ws['!ref']);
  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
      if (!ws[cellRef]) ws[cellRef] = { t: 's', v: '' };
      const cell = ws[cellRef];

      // === TABEL 1: MONTHLY (Row 0-2) ===
      if (R < 3) {
        cell.s = {
          border: styles.header.border,
          alignment: { vertical: 'center', horizontal: 'center' },
        };

        // Header
        if (R === 0 || R === 1) {
          cell.s = { ...cell.s, font: { bold: true } };
        }
        // Data
        if (R === 2) {
          if (C >= 1) {
            // Kolom Angka
            cell.t = 'n';
            cell.s = { ...cell.s, numFmt: '#,##0.000' }; // 3 desimal sesuai gambar
          }
        }
      }

      // === GAP (Row 3) ===
      else if (R === 3) {
        // No style
      }

      // === TABEL 2: DAILY (Row 4+) ===
      else {
        // Header Daily (Row 4 & 5)
        if (R === 4 || R === 5) {
          cell.s = { ...styles.header };
          if (C === 3 || C === 4) {
            cell.s.fill = styles.yellowHeader;
            cell.s.font = { bold: true, color: { rgb: '000000' } };
          }
        }
        // Data Daily
        else {
          const dataIndex = R - 6; // Offset row
          const rowData = summaryData[dataIndex];

          if (rowData && rowData.isSunday) {
            cell.s = { fill: styles.pinkFill, border: styles.header.border };
          } else {
            cell.s = { border: styles.header.border, alignment: { vertical: 'center' } };
            if (C >= 1) {
              cell.t = 'n';
              if (C === 1 || C === 2) {
                cell.s = { ...cell.s, alignment: styles.center.alignment, numFmt: '0' };
              } else {
                if (C === 3 || C === 4) {
                  cell.s = {
                    ...styles.numberFormat,
                    ...styles.yellowData,
                    border: styles.header.border,
                  };
                } else {
                  cell.s = { ...styles.numberFormat, border: styles.header.border };
                }
              }
            } else {
              cell.s.alignment = { horizontal: 'center', vertical: 'center' };
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
