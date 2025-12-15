'use client';

// (PERHATIKAN PATH: Sesuaikan path ke 'constants' dan 'utils' jika perlu)
import { TAG_MAP_KEY, VEHICLE_TYPES } from '@/lib/constants';
import { formatMinutesToHHMM, formatYYYYMMDDToDDMMYYYY } from '@/lib/utils';
import * as XLSX from 'xlsx-js-style';

// Helper kecil untuk memformat jam (HH:mm:ss -> HH:mm)
function formatSimpleTime(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return '-';
  // Ambil 5 karakter pertama (HH:mm)
  return timeStr.substring(0, 5);
}

export function generateRoutingWorkbook(driverData, filteredResults, tagMap, dateForFile, hubName) {
  const driverMap = driverData.reduce((acc, driver) => {
    if (driver.email) acc[driver.email] = { name: driver.name, plat: driver.plat };
    return acc;
  }, {});

  let processedDataRows = [];
  let totalDryDistance = 0;
  let totalFrozenDistance = 0;
  let truckUsageCount = {};
  [...VEHICLE_TYPES, 'Lainnya'].forEach((type) => {
    truckUsageCount[type] = { Dry: 0, Frozen: 0 };
  });

  filteredResults.forEach((resultItem) => {
    if (resultItem.result && Array.isArray(resultItem.result.routing)) {
      resultItem.result.routing.forEach((route) => {
        let initialTotalWeight = route.totalWeight || 0;
        let initialTotalVolume = route.totalVolume || 0;
        let initialTotalDistance = route.totalDistance || 0;
        let initialTotalTravelTime = route.totalTravelTime || 0;
        let initialTotalVisitTime = route.totalVisitTime || 0;
        let initialTotalWaitingTime = route.totalWaitingTime || 0;

        const hasTrips = Array.isArray(route.trips) && route.trips.length > 0;

        // --- 1. LOGIKA BARU: Ambil ETD Hub & ETA First Store ---
        let etdHubVal = '-';
        let etaFirstStoreVal = '-';

        if (hasTrips) {
          // Cari Hub (biasanya trip pertama atau yang flag isHub=true)
          const hubTrip = route.trips.find((t) => t.isHub);
          if (hubTrip && hubTrip.etd) {
            etdHubVal = formatSimpleTime(hubTrip.etd);
          } else if (route.trips[0] && route.trips[0].etd) {
            // Fallback: ambil trip pertama jika tidak ada flag isHub
            etdHubVal = formatSimpleTime(route.trips[0].etd);
          }

          // Cari First Store (trip pertama yang BUKAN hub)
          const firstStoreTrip = route.trips.find((t) => !t.isHub);
          if (firstStoreTrip && firstStoreTrip.eta) {
            etaFirstStoreVal = formatSimpleTime(firstStoreTrip.eta);
          }
        }
        // --------------------------------------------------------

        const needsManualWeight = hasTrips && initialTotalWeight === 0;
        const needsManualVolume = hasTrips && initialTotalVolume === 0;
        const needsManualDistance = hasTrips && initialTotalDistance === 0;
        const needsManualTravelTime = hasTrips && initialTotalTravelTime === 0;
        const needsManualVisitTime = hasTrips && initialTotalVisitTime === 0;
        const needsManualWaitingTime = hasTrips && initialTotalWaitingTime === 0;

        let manualCalcs = {
          weight: 0,
          volume: 0,
          distance: 0,
          travelTime: 0,
          visitTime: 0,
          waitingTime: 0,
        };

        if (
          hasTrips &&
          (needsManualWeight ||
            needsManualVolume ||
            needsManualDistance ||
            needsManualTravelTime ||
            needsManualVisitTime ||
            needsManualWaitingTime)
        ) {
          manualCalcs = route.trips.reduce((acc, trip) => {
            if (!trip.isHub) {
              if (needsManualWeight) acc.weight += trip.weight || 0;
              if (needsManualVolume) acc.volume += trip.volume || 0;
              if (needsManualDistance) acc.distance += trip.distance || 0;
              if (needsManualTravelTime) acc.travelTime += trip.travelTime || 0;
              if (needsManualVisitTime) acc.visitTime += trip.visitTime || 0;
              if (needsManualWaitingTime) acc.waitingTime += trip.waitingTime || 0;
            }
            return acc;
          }, manualCalcs);
        }

        const finalTotalWeight = needsManualWeight ? manualCalcs.weight : initialTotalWeight;
        const finalTotalVolume = needsManualVolume ? manualCalcs.volume : initialTotalVolume;
        const finalTotalDistance = needsManualDistance
          ? manualCalcs.distance
          : initialTotalDistance;
        const finalTotalTravelTime = needsManualTravelTime
          ? manualCalcs.travelTime
          : initialTotalTravelTime;
        const finalTotalVisitTime = needsManualVisitTime
          ? manualCalcs.visitTime
          : initialTotalVisitTime;
        const finalTotalWaitingTime = needsManualWaitingTime
          ? manualCalcs.waitingTime
          : initialTotalWaitingTime;

        const assigneeEmail = route.assignee;
        const driverInfo = driverMap[assigneeEmail];
        const driverName = driverInfo ? driverInfo.name : assigneeEmail;

        const manualWeightPercentage = ((finalTotalWeight / route.vehicleMaxWeight) * 100).toFixed(
          1
        );
        const manualVolumePercentage = ((finalTotalVolume / route.vehicleMaxVolume) * 100).toFixed(
          1
        );

        const totalTravelTime = finalTotalTravelTime;
        const totalVisitTime = finalTotalVisitTime;
        const totalWaitingTime = finalTotalWaitingTime;
        const manualSpentTime = totalTravelTime + totalVisitTime + totalWaitingTime;

        processedDataRows.push({
          plat: driverInfo ? driverInfo.plat : null,
          driver: driverName,
          weightPercentage: manualWeightPercentage || 0,
          volumePercentage: manualVolumePercentage || 0,
          totalDistance: finalTotalDistance || 0,
          totalVisits: null,
          totalDelivered: null,
          shipDurationRaw: manualSpentTime || route.totalSpentTime || 0,
          // Simpan data baru
          etaFirstStore: etaFirstStoreVal,
          etdHub: etdHubVal,

          hasTrips: hasTrips,
          totalTravelTime: totalTravelTime,
          totalVisitTime: totalVisitTime,
        });

        const tags = route.vehicleTags;
        const distance = finalTotalDistance || 0;
        const vehiclePlat = driverInfo && driverInfo.plat ? driverInfo.plat : 'N/A';
        if (hasTrips && Array.isArray(tags) && tags.length > 0) {
          const firstTag = String(tags[0]);
          const parts = firstTag.split('-');
          if (parts.length >= 2) {
            const generalType = parts[0].toUpperCase();
            if (generalType === 'FROZEN') totalFrozenDistance += distance;
            else if (generalType === 'DRY') totalDryDistance += distance;
            let specificType = parts[1].toUpperCase();
            if (parts.length > 2 && parts[2].toUpperCase() === 'LONG') {
              if (['CDE', 'CDD', 'FUSO'].includes(specificType)) {
                specificType = `${specificType}-LONG`;
              }
            }
            let category = 'Lainnya';
            if (VEHICLE_TYPES.includes(specificType)) {
              category = specificType;
            } else if (tagMap[vehiclePlat] && tagMap[vehiclePlat][specificType]) {
              category = tagMap[vehiclePlat][specificType];
            }
            if (generalType === 'FROZEN') truckUsageCount[category]['Frozen'] += 1;
            else if (generalType === 'DRY') truckUsageCount[category]['Dry'] += 1;
          }
        }
      });
    }
  });

  // --- Logic Merge & Sort ---
  const mergedTruckDetailMap = new Map();
  for (const row of processedDataRows) {
    const key = row.driver;
    if (!mergedTruckDetailMap.has(key)) {
      mergedTruckDetailMap.set(key, { ...row });
    } else {
      const existing = mergedTruckDetailMap.get(key);
      mergedTruckDetailMap.set(key, {
        plat: existing.plat || row.plat,
        driver: existing.driver,
        weightPercentage: Math.max(existing.weightPercentage, row.weightPercentage),
        volumePercentage: Math.max(existing.volumePercentage, row.volumePercentage),
        totalDistance: Math.max(existing.totalDistance, row.totalDistance),
        shipDurationRaw: Math.max(existing.shipDurationRaw, row.shipDurationRaw),
        // Untuk ETA/ETD, kita pertahankan yg sudah ada (asumsi 1 driver 1 route utama), atau overwrite jika perlu.
        // Di sini kita biarkan yg pertama ditemukan.
        etaFirstStore: existing.etaFirstStore !== '-' ? existing.etaFirstStore : row.etaFirstStore,
        etdHub: existing.etdHub !== '-' ? existing.etdHub : row.etdHub,

        hasTrips: existing.hasTrips || row.hasTrips,
        totalTravelTime: existing.totalTravelTime && row.totalTravelTime,
        totalVisitTime: existing.totalVisitTime && row.totalVisitTime,
      });
    }
  }

  const wb = XLSX.utils.book_new();

  // --- STYLING DEFINITIONS ---
  const defaultHeaderStyle = {
    font: { bold: true },
    alignment: { horizontal: 'center', vertical: 'center' },
  };

  // 2. LOGIKA BARU: Style Warna Hijau (#84fa92)
  const greenHeaderStyle = {
    font: { bold: true },
    alignment: { horizontal: 'center', vertical: 'center' },
    fill: { patternType: 'solid', fgColor: { rgb: '84FA92' } },
  };

  const centerStyle = { alignment: { horizontal: 'center', vertical: 'center' } };
  const redFillStyle = {
    fill: { patternType: 'solid', fgColor: { rgb: 'FF0000' } },
    alignment: { horizontal: 'center', vertical: 'center' },
  };

  // 3. LOGIKA BARU: Tambah Header
  const headers1 = [
    'Plat',
    'Driver',
    'Weight Percentage',
    'Volume Percentage',
    'Total Distance (m)',
    'Total Visits',
    'Total Delivered',
    'Ship Duration',
    'ETA First Store', // Baru
    'ETD Hub', // Baru
  ];

  const validDriverData = driverData.filter((driver) => {
    const plat = driver.plat || '';
    if (plat === '') return false;
    if (plat.toUpperCase().includes('DEMO')) return false;
    return true;
  });

  const excelDataRows = validDriverData.map((driver) => {
    const driverName = driver.name;
    const driverPlat = driver.plat;
    const mergedRow = mergedTruckDetailMap.get(driverName);

    if (mergedRow && mergedRow.hasTrips) {
      const hasMissingTimes = mergedRow.totalTravelTime === 0 || mergedRow.totalVisitTime === 0;
      return {
        Plat: mergedRow.plat,
        Driver: mergedRow.driver,
        WeightPercentage: mergedRow.weightPercentage > 0 ? `${mergedRow.weightPercentage}%` : null,
        VolumePercentage: mergedRow.volumePercentage > 0 ? `${mergedRow.volumePercentage}%` : null,
        TotalDistance: mergedRow.totalDistance > 0 ? mergedRow.totalDistance : null,
        TotalVisits: null,
        TotalDelivered: null,
        ShipDuration: formatMinutesToHHMM(mergedRow.shipDurationRaw),
        // Map Data Baru
        ETAFirstStore: mergedRow.etaFirstStore,
        ETDHub: mergedRow.etdHub,

        hasMissingTimes: hasMissingTimes,
      };
    } else {
      return {
        Plat: driverPlat,
        Driver: driverName,
        WeightPercentage: null,
        VolumePercentage: null,
        TotalDistance: null,
        TotalVisits: null,
        TotalDelivered: null,
        ShipDuration: null,
        ETAFirstStore: null,
        ETDHub: null,
        hasMissingTimes: false,
      };
    }
  });

  const getSortGroup = (platStr) => {
    if (!platStr) return 1;
    const platUpper = platStr.toUpperCase();
    if (platUpper.includes('DM')) return 3;
    if (platUpper.includes('SEWA')) return 2;
    return 1;
  };

  excelDataRows.sort((a, b) => {
    const platA = a.Plat || '';
    const platB = b.Plat || '';
    const driverA = a.Driver || '';
    const driverB = b.Driver || '';
    const groupA = getSortGroup(platA);
    const groupB = getSortGroup(platB);
    if (groupA !== groupB) {
      return groupA - groupB;
    }
    return driverA.localeCompare(driverB);
  });

  const missingTimesFound = excelDataRows.some((row) => row.hasMissingTimes);

  const finalSheetData1 = [
    headers1,
    ...excelDataRows.map((row) => [
      row.Plat,
      row.Driver,
      row.WeightPercentage,
      row.VolumePercentage,
      row.TotalDistance,
      row.TotalVisits,
      row.TotalDelivered,
      row.ShipDuration,
      row.ETAFirstStore, // Kolom 8
      row.ETDHub, // Kolom 9
    ]),
  ];

  const wsTruckDetail = XLSX.utils.aoa_to_sheet(finalSheetData1);
  const range1 = XLSX.utils.decode_range(wsTruckDetail['!ref']);

  // Kolom yang harus center alignment (tambah indeks 8 dan 9 untuk ETA/ETD)
  const centerAlignedDataColumns1 = [2, 3, 4, 7, 8, 9];
  const shipDurationColIndex = 7;

  // Daftar nama header yang harus berwarna hijau
  const greenHeaders = [
    'Plat',
    'Driver',
    'Weight Percentage',
    'Volume Percentage',
    'Total Distance (m)',
    'Total Visits',
    'Total Delivered',
    'Ship Duration',
  ];

  for (let R = range1.s.r; R <= range1.e.r; ++R) {
    for (let C = range1.s.c; C <= range1.e.c; ++C) {
      const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
      if (!wsTruckDetail[cellRef]) continue;

      if (R === 0) {
        // --- LOGIKA APPLY WARNA HEADER ---
        // Cek apakah kolom ini termasuk dalam daftar greenHeaders
        // Karena array headers1 urut, kita bisa cek berdasarkan nama header di data
        const headerName = finalSheetData1[0][C];

        if (greenHeaders.includes(headerName)) {
          wsTruckDetail[cellRef].s = greenHeaderStyle;
        } else {
          wsTruckDetail[cellRef].s = defaultHeaderStyle;
        }

        if (C === shipDurationColIndex && missingTimesFound) {
          if (!wsTruckDetail[cellRef].c) wsTruckDetail[cellRef].c = [];
          wsTruckDetail[cellRef].c.push({
            a: 'Info',
            t: 'Travel Time atau Visit Time tidak ada di API. Periksa manual di menu Routing!',
            h: true,
          });
        }
      } else if (centerAlignedDataColumns1.includes(C)) {
        wsTruckDetail[cellRef].s = centerStyle;
      }

      const rowData = excelDataRows[R - 1];
      if (rowData && rowData.hasMissingTimes && C === shipDurationColIndex) {
        wsTruckDetail[cellRef].s = redFillStyle;
      }
    }
  }

  const colWidths1 = headers1.map((_, i) => ({
    wch:
      finalSheetData1.reduce((max, row) => Math.max(max, row[i] ? String(row[i]).length : 0), 0) +
      2,
  }));
  wsTruckDetail['!cols'] = colWidths1;

  XLSX.utils.book_append_sheet(wb, wsTruckDetail, 'Truck Detail');

  // --- SUMMARY SHEETS (Distance & Usage) - TIDAK BERUBAH ---
  const totalDryKm = totalDryDistance / 1000;
  const totalFrozenKm = totalFrozenDistance / 1000;
  const distanceSummaryData = [
    ['DRY (km)', 'FROZEN (km)'],
    [totalDryKm, totalFrozenKm],
  ];
  const wsDistanceSummary = XLSX.utils.aoa_to_sheet(distanceSummaryData);
  const distanceHeaderStyle = {
    font: { bold: true },
    alignment: { horizontal: 'center', vertical: 'center' },
  };
  const distanceDataStyle = {
    alignment: { horizontal: 'center', vertical: 'center' },
    t: 'n',
    z: '0.00',
  };
  wsDistanceSummary['A1'] = { v: 'DRY (km)', t: 's', s: distanceHeaderStyle };
  wsDistanceSummary['B1'] = { v: 'FROZEN (km)', t: 's', s: distanceHeaderStyle };
  wsDistanceSummary['A2'] = { v: totalDryKm, t: 'n', s: distanceDataStyle };
  wsDistanceSummary['B2'] = { v: totalFrozenKm, t: 'n', s: distanceDataStyle };
  wsDistanceSummary['!cols'] = [{ wch: 15 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, wsDistanceSummary, 'Total Distance Summary');

  const usageHeader = ['Tipe Kendaraan', 'Jumlah (Dry)', 'Jumlah (Frozen)'];
  const usageDataRows = VEHICLE_TYPES.map((type) => {
    const dryCount = truckUsageCount[type]['Dry'];
    const frozenCount = truckUsageCount[type]['Frozen'];
    return [type, dryCount > 0 ? dryCount : null, frozenCount > 0 ? frozenCount : null];
  });
  const lainDryCount = truckUsageCount['Lainnya']['Dry'];
  const lainFrozenCount = truckUsageCount['Lainnya']['Frozen'];
  if (lainDryCount > 0 || lainFrozenCount > 0) {
    usageDataRows.push([
      'Lainnya',
      lainDryCount > 0 ? lainDryCount : null,
      lainFrozenCount > 0 ? lainFrozenCount : null,
    ]);
  }
  const finalUsageData = [usageHeader, ...usageDataRows];
  const wsTruckUsage = XLSX.utils.aoa_to_sheet(finalUsageData);
  const usageHeaderStyle = {
    font: { bold: true },
    alignment: { horizontal: 'center', vertical: 'center' },
  };
  const usageDataNumStyle = { alignment: { horizontal: 'center', vertical: 'center' }, t: 'n' };
  const usageDataLabelStyle = { alignment: { horizontal: 'left', vertical: 'center' } };
  wsTruckUsage['A1'].s = usageHeaderStyle;
  wsTruckUsage['B1'].s = usageHeaderStyle;
  wsTruckUsage['C1'].s = usageHeaderStyle;
  finalUsageData.forEach((row, R) => {
    if (R === 0) return;
    const aRef = `A${R + 1}`;
    const bRef = `B${R + 1}`;
    const cRef = `C${R + 1}`;
    if (wsTruckUsage[aRef]) wsTruckUsage[aRef].s = usageDataLabelStyle;
    if (wsTruckUsage[bRef]) wsTruckUsage[bRef].s = usageDataNumStyle;
    if (wsTruckUsage[cRef]) wsTruckUsage[cRef].s = usageDataNumStyle;
  });
  wsTruckUsage['!cols'] = [{ wch: 20 }, { wch: 15 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, wsTruckUsage, 'Truck Usage');

  const formattedDate = formatYYYYMMDDToDDMMYYYY(dateForFile);
  const excelFileName = `Routing Summary - ${formattedDate} - ${hubName}.xlsx`;

  return { wb, excelFileName, missingTimesFound };
}
