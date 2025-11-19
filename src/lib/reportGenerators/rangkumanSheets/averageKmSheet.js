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

// --- LOGIKA TANGGAL BARU (Senin Delivery = Sabtu Routing) ---
// Input: UTC String (createdTime dari API)
// Output: YYYY-MM-DD (Tanggal Delivery)
function getDeliveryDateFromRouting(isoString) {
  if (!isoString) return null;
  try {
    // 1. Ambil Waktu Asli (UTC)
    const date = new Date(isoString);

    // 2. Geser ke WIB (UTC+7) secara manual untuk pengecekan hari
    // Kita memanipulasi epoch time agar fungsi getUTCDay() mengembalikan hari sesuai WIB
    const wibTimestamp = date.getTime() + 7 * 60 * 60 * 1000;
    const dateWIB = new Date(wibTimestamp);

    // 3. Cek Hari Routing (0=Minggu, 1=Senin, ..., 6=Sabtu)
    const routingDay = dateWIB.getUTCDay();

    let offsetDays = 1; // Default H-1 (Routing Senin -> Kirim Selasa)

    // Jika Routing dilakukan hari SABTU (6), maka Pengiriman hari SENIN (+2 hari)
    if (routingDay === 6) {
      offsetDays = 2;
    }

    // 4. Hitung Tanggal Delivery
    // (WIB Timestamp + Offset Hari)
    const deliveryTimestamp = wibTimestamp + offsetDays * 24 * 60 * 60 * 1000;
    const deliveryDate = new Date(deliveryTimestamp);

    // Kembalikan YYYY-MM-DD
    return deliveryDate.toISOString().split('T')[0];
  } catch (e) {
    return null;
  }
}

export function calculateAverageKmData(resultsData, startDateStr, endDateStr) {
  const dailyVehicleMap = {};
  const filteredRawData = [];

  if (resultsData && Array.isArray(resultsData)) {
    resultsData.forEach((dispatch) => {
      // 1. Mandatory Filter
      const isDone = dispatch.dispatchStatus && dispatch.dispatchStatus.toLowerCase() === 'done';
      const hasResult = dispatch.result && Array.isArray(dispatch.result.routing);

      if (isDone && hasResult) {
        // 2. Ambil Tanggal DELIVERY (Menggunakan logika baru Sabtu->Senin)
        const dateKey = getDeliveryDateFromRouting(dispatch.createdTime);

        const dispatchTimestamp = new Date(dispatch.createdTime).getTime();

        if (dateKey) {
          filteredRawData.push({
            ...dispatch,
            _debugDeliveryDate: dateKey,
          });

          if (!dailyVehicleMap[dateKey]) {
            dailyVehicleMap[dateKey] = new Map();
          }

          dispatch.result.routing.forEach((route) => {
            const vehicleId = route.vehicleId || route.vehicleName;

            const existingEntry = dailyVehicleMap[dateKey].get(vehicleId);

            // Deduplikasi: Ambil data terbaru
            if (!existingEntry || dispatchTimestamp > existingEntry.dispatchTimestamp) {
              dailyVehicleMap[dateKey].set(vehicleId, {
                ...route,
                dispatchTimestamp: dispatchTimestamp,
                parentDispatchName: dispatch.name,
                routingCreatedTime: dispatch.createdTime,
              });
            }
          });
        }
      }
    });
  }

  const summaryData = [];
  const currentIterDate = new Date(startDateStr);
  const endDateObj = new Date(endDateStr);

  while (currentIterDate <= endDateObj) {
    const currentDateString = formatDate(currentIterDate);
    const displayDate = formatLongDate(currentIterDate);
    const isSunday = currentIterDate.getDay() === 0;

    let rowData = {
      date: displayDate,
      dateStr: currentDateString,
      isSunday: isSunday,
      dryCount: 0,
      frozenCount: 0,
      dryKm: 0,
      frozenKm: 0,
      totalKm: 0,
      avgKm: 0,
      vehicleList: [],
    };

    if (!isSunday) {
      const vehiclesMap = dailyVehicleMap[currentDateString];

      if (vehiclesMap) {
        vehiclesMap.forEach((route) => {
          // 3. Mandatory Filter: Hanya hitung jika ada TRIP
          const hasTrips = route.trips && route.trips.length > 0;

          if (hasTrips) {
            const tags = route.vehicleTags || [];
            const distMeter = route.totalDistance || 0;

            const isFrozen = tags.some(
              (t) => typeof t === 'string' && t.toUpperCase().includes('FROZEN')
            );
            const typeLabel = isFrozen ? 'FROZEN' : 'DRY';

            if (isFrozen) {
              rowData.frozenCount++;
              rowData.frozenKm += distMeter / 1000;
            } else {
              rowData.dryCount++;
              rowData.dryKm += distMeter / 1000;
            }

            const routingTimeDebug = route.routingCreatedTime
              ? route.routingCreatedTime.substring(11, 16)
              : '?';

            rowData.vehicleList.push({
              name: route.vehicleName || 'Unknown',
              type: typeLabel,
              km: distMeter / 1000,
              source: `${route.parentDispatchName} (@${routingTimeDebug} UTC)`,
            });
          }
        });
      }

      rowData.totalKm = rowData.dryKm + rowData.frozenKm;
      const totalVehicle = rowData.dryCount + rowData.frozenCount;
      rowData.avgKm = totalVehicle > 0 ? rowData.totalKm / totalVehicle : 0;
    }

    summaryData.push(rowData);
    currentIterDate.setDate(currentIterDate.getDate() + 1);
  }

  return { summaryData, filteredRawData };
}

export function generateAverageKmSheet(wb, resultsData, startDateStr, endDateStr) {
  const { summaryData } = calculateAverageKmData(resultsData, startDateStr, endDateStr);

  const avgHeader1 = [
    'Date',
    'Total Vehicle',
    '',
    'KM Routing',
    '',
    'Total KM Routing',
    'Average KM',
  ];
  const avgHeader2 = ['', 'Dry', 'Frozen', 'Dry', 'Frozen', '', ''];

  const excelRows = [avgHeader1, avgHeader2];

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

  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 1, c: 0 } },
    { s: { r: 0, c: 1 }, e: { r: 0, c: 2 } },
    { s: { r: 0, c: 3 }, e: { r: 0, c: 4 } },
    { s: { r: 0, c: 5 }, e: { r: 1, c: 5 } },
    { s: { r: 0, c: 6 }, e: { r: 1, c: 6 } },
  ];

  const range = XLSX.utils.decode_range(ws['!ref']);
  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
      if (!ws[cellRef]) ws[cellRef] = { t: 's', v: '' };
      const cell = ws[cellRef];

      if (R === 0 || R === 1) {
        cell.s = { ...styles.header };
        if (C === 3 || C === 4) {
          cell.s.fill = styles.yellowHeader;
          cell.s.font = { bold: true, color: { rgb: '000000' } };
        }
      } else {
        const dataIndex = R - 2;
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
