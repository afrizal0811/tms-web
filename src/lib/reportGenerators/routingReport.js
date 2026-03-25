// File: lib/reportGenerators/routingReport.js
'use client';

import { getVehicleTypes } from '@/lib/api';
import { formatDateWIB, formatMinutesToHHMM, formatYYYYMMDDToDDMMYYYY, isEmpty } from '@/lib/utils';
import * as XLSX from 'xlsx-js-style';

function formatSimpleTime(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return '-';
  return timeStr.substring(0, 5);
}

export async function generateRoutingWorkbook(
  driverData,
  filteredResults,
  mappingsObj,
  dateForFile,
  hubName,
  t
) {
  const vehicleTypesObj = await getVehicleTypes();
  const vehicleTypes = vehicleTypesObj.map((v) => v.name);

  const translate = t || ((key) => key);

  const emailMap = {};
  const platMap = {};
  driverData.forEach((driver) => {
    if (driver.email)
      emailMap[driver.email.trim().toLowerCase()] = { name: driver.name, plat: driver.plat };
    if (driver.plat)
      platMap[driver.plat.replace(/\s+/g, '').toLowerCase()] = {
        name: driver.name,
        plat: driver.plat,
      };
  });

  let processedDataRows = [];
  let totalDryDistance = 0;
  let totalFrozenDistance = 0;
  let truckUsageCount = {};

  [...vehicleTypes, 'Lainnya'].forEach((type) => {
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

        let etdHubVal = '-';
        let etaFirstStoreVal = '-';

        if (hasTrips) {
          const hubTrip = route.trips.find((t) => t.isHub);
          if (hubTrip && hubTrip.etd) {
            etdHubVal = formatSimpleTime(hubTrip.etd);
          } else if (route.trips[0] && route.trips[0].etd) {
            etdHubVal = formatSimpleTime(route.trips[0].etd);
          }

          const firstStoreTrip = route.trips.find((t) => !t.isHub);
          if (firstStoreTrip && firstStoreTrip.eta) {
            etaFirstStoreVal = formatSimpleTime(firstStoreTrip.eta);
          }
        }

        const needsManualWeight = hasTrips && Math.floor(initialTotalWeight) <= 0;
        const needsManualVolume = hasTrips && Math.floor(initialTotalVolume) <= 0;
        const needsManualDistance = hasTrips && Math.floor(initialTotalDistance) <= 0;
        const needsManualTravelTime = hasTrips && Math.floor(initialTotalTravelTime) <= 0;
        const needsManualVisitTime = hasTrips && Math.floor(initialTotalVisitTime) <= 0;
        const needsManualWaitingTime = hasTrips && Math.floor(initialTotalWaitingTime) <= 0;

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
              if (needsManualWeight && (trip.weight || 0) > 0) acc.weight += trip.weight;
              if (needsManualVolume && (trip.volume || 0) > 0) acc.volume += trip.volume;

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

        const assigneeEmail = route.assignee ? String(route.assignee).trim().toLowerCase() : '';
        const vehiclePlatRaw = route.vehicleName
          ? String(route.vehicleName).replace(/\s+/g, '').toLowerCase()
          : '';

        const driverInfo = emailMap[assigneeEmail] || platMap[vehiclePlatRaw];
        const driverName = driverInfo ? driverInfo.name : route.assignee || route.vehicleName;

        const maxWeight = route.vehicleMaxWeight || 0;
        const maxVolume = route.vehicleMaxVolume || 0;

        const manualWeightPercentage =
          maxWeight > 0 ? ((finalTotalWeight / maxWeight) * 100).toFixed(1) : 0;
        const manualVolumePercentage =
          maxVolume > 0 ? ((finalTotalVolume / maxVolume) * 100).toFixed(1) : 0;

        const totalTravelTime = finalTotalTravelTime;
        const totalVisitTime = finalTotalVisitTime;
        const totalWaitingTime = finalTotalWaitingTime;
        const manualSpentTime = totalTravelTime + totalVisitTime + totalWaitingTime;

        processedDataRows.push({
          plat: driverInfo ? driverInfo.plat : null,
          driver: driverName,
          weightPercentage: manualWeightPercentage,
          volumePercentage: manualVolumePercentage,
          totalDistance: finalTotalDistance || 0,
          totalVisits: null,
          totalDelivered: null,
          shipDurationRaw: manualSpentTime || route.totalSpentTime || 0,
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
            if (mappingsObj[vehiclePlat]) {
              category = mappingsObj[vehiclePlat];
            } else if (vehicleTypes.includes(specificType)) {
              category = specificType;
            }

            if (generalType === 'FROZEN') truckUsageCount[category]['Frozen'] += 1;
            else if (generalType === 'DRY') truckUsageCount[category]['Dry'] += 1;
          }
        }
      });
    }
  });

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
        weightPercentage: Math.max(
          parseFloat(existing.weightPercentage),
          parseFloat(row.weightPercentage)
        ),
        volumePercentage: Math.max(
          parseFloat(existing.volumePercentage),
          parseFloat(row.volumePercentage)
        ),
        totalDistance: Math.max(existing.totalDistance, row.totalDistance),
        shipDurationRaw: Math.max(existing.shipDurationRaw, row.shipDurationRaw),
        etaFirstStore: !isEmpty(existing.etaFirstStore)
          ? existing.etaFirstStore
          : row.etaFirstStore,
        etdHub: !isEmpty(existing.etdHub) ? existing.etdHub : row.etdHub,

        hasTrips: existing.hasTrips || row.hasTrips,
        totalTravelTime: existing.totalTravelTime && row.totalTravelTime,
        totalVisitTime: existing.totalVisitTime && row.totalVisitTime,
      });
    }
  }

  const wb = XLSX.utils.book_new();

  const centerStyle = { alignment: { horizontal: 'center', vertical: 'center' } };
  const defaultHeaderStyle = {
    ...centerStyle,
    font: { bold: true },
  };

  const greenHeaderStyle = {
    ...centerStyle,
    font: { bold: true },
    fill: { patternType: 'solid', fgColor: { rgb: '84FA92' } },
  };

  const redFillStyle = {
    ...centerStyle,
    fill: { patternType: 'solid', fgColor: { rgb: 'FF0000' } },
  };

  const headers1 = [
    translate('common.number_plates'),
    translate('common.driver'),
    translate('excel.routing.headers.weight_pct'),
    translate('excel.routing.headers.volume_pct'),
    translate('excel.routing.headers.total_dist'),
    translate('excel.routing.headers.total_visits'),
    translate('excel.routing.headers.total_delivery'),
    translate('excel.routing.headers.ship_dur'),
    translate('excel.routing.headers.eta_first'),
    translate('excel.routing.headers.etd_hub'),
  ];

  const seenIdentifiers = new Set();
  const validDriverData = driverData.filter((driver) => {
    const plat = driver.plat || '';
    if (isEmpty(plat)) return false;
    if (plat.toUpperCase().includes('DEMO')) return false;

    const emailKey = driver.email ? driver.email.trim().toLowerCase() : '';
    const nameKey = driver.name ? driver.name.trim().toLowerCase() : '';

    if (emailKey && seenIdentifiers.has(emailKey)) return false;
    if (nameKey && seenIdentifiers.has(nameKey)) return false;

    if (emailKey) seenIdentifiers.add(emailKey);
    if (nameKey) seenIdentifiers.add(nameKey);

    return true;
  });

  const excelDataRows = validDriverData.map((driver) => {
    const driverName = driver.name;
    const driverPlat = driver.plat;
    const mergedRow = mergedTruckDetailMap.get(driverName);

    if (mergedRow && mergedRow.hasTrips) {
      return {
        Plat: mergedRow.plat,
        Driver: mergedRow.driver,
        WeightPercentage: mergedRow.weightPercentage > 0 ? `${mergedRow.weightPercentage}%` : null,
        VolumePercentage: mergedRow.volumePercentage > 0 ? `${mergedRow.volumePercentage}%` : null,
        TotalDistance: mergedRow.totalDistance > 0 ? mergedRow.totalDistance : null,
        TotalVisits: null,
        TotalDelivered: null,
        ShipDuration: formatMinutesToHHMM(mergedRow.shipDurationRaw),
        ETAFirstStore: mergedRow.etaFirstStore,
        ETDHub: mergedRow.etdHub,
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
      row.ETAFirstStore,
      row.ETDHub,
    ]),
  ];

  const wsTruckDetail = XLSX.utils.aoa_to_sheet(finalSheetData1);
  const range1 = XLSX.utils.decode_range(wsTruckDetail['!ref']);

  const centerAlignedDataColumns1 = [2, 3, 4, 7, 8, 9];
  const greenHeaders = [
    translate('excel.routing.headers.weight_pct'),
    translate('excel.routing.headers.volume_pct'),
    translate('excel.routing.headers.total_dist'),
    translate('excel.routing.headers.total_visits'),
    translate('excel.routing.headers.total_delivery'),
    translate('excel.routing.headers.ship_dur'),
  ];

  for (let R = range1.s.r; R <= range1.e.r; ++R) {
    for (let C = range1.s.c; C <= range1.e.c; ++C) {
      const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
      if (!wsTruckDetail[cellRef]) continue;

      if (R === 0) {
        const headerName = finalSheetData1[0][C];

        if (greenHeaders.includes(headerName)) {
          wsTruckDetail[cellRef].s = greenHeaderStyle;
        } else {
          wsTruckDetail[cellRef].s = defaultHeaderStyle;
        }
      } else if (centerAlignedDataColumns1.includes(C)) {
        wsTruckDetail[cellRef].s = centerStyle;
      }
    }
  }

  const colWidths1 = headers1.map((_, i) => ({
    wch:
      finalSheetData1.reduce((max, row) => Math.max(max, row[i] ? String(row[i]).length : 0), 0) +
      2,
  }));
  wsTruckDetail['!cols'] = colWidths1;

  XLSX.utils.book_append_sheet(wb, wsTruckDetail, translate('excel.routing.sheets.truck_detail'));

  const totalDryKm = totalDryDistance / 1000;
  const totalFrozenKm = totalFrozenDistance / 1000;
  const distanceSummaryData = [
    [translate('excel.routing.headers.dry_km'), translate('excel.routing.headers.frozen_km')],
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
  wsDistanceSummary['A1'] = {
    v: translate('excel.routing.headers.dry_km'),
    t: 's',
    s: distanceHeaderStyle,
  };
  wsDistanceSummary['B1'] = {
    v: translate('excel.routing.headers.frozen_km'),
    t: 's',
    s: distanceHeaderStyle,
  };
  wsDistanceSummary['A2'] = { v: totalDryKm, t: 'n', s: distanceDataStyle };
  wsDistanceSummary['B2'] = { v: totalFrozenKm, t: 'n', s: distanceDataStyle };
  wsDistanceSummary['!cols'] = [{ wch: 15 }, { wch: 15 }];

  XLSX.utils.book_append_sheet(
    wb,
    wsDistanceSummary,
    translate('excel.routing.sheets.dist_summary')
  );

  const usageHeader = [
    translate('excel.routing.headers.veh_type'),
    translate('excel.routing.headers.count_dry'),
    translate('excel.routing.headers.count_frozen'),
  ];
  const usageDataRows = vehicleTypes.map((type) => {
    const dryCount = truckUsageCount[type]['Dry'];
    const frozenCount = truckUsageCount[type]['Frozen'];
    return [type, dryCount > 0 ? dryCount : null, frozenCount > 0 ? frozenCount : null];
  });
  const lainDryCount = truckUsageCount['Lainnya']['Dry'];
  const lainFrozenCount = truckUsageCount['Lainnya']['Frozen'];
  if (lainDryCount > 0 || lainFrozenCount > 0) {
    usageDataRows.push([
      translate('excel.routing.data.other'),
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
  XLSX.utils.book_append_sheet(wb, wsTruckUsage, translate('excel.routing.sheets.truck_usage'));

  const helpHeader = [
    translate('excel.routing.headers.routing_id'),
    translate('excel.routing.headers.routing_name'),
    translate('excel.routing.headers.created_by'),
    translate('excel.routing.headers.created_at'),
    translate('excel.routing.headers.routing_result'),
  ];

  const helpDataRows = [];

  const sortedHelpItems = filteredResults
    .filter((r) => r.dispatchStatus && String(r.dispatchStatus).toLowerCase() === 'done')
    .sort((a, b) => {
      const timeA = a.createdTime ? new Date(a.createdTime).getTime() : 0;
      const timeB = b.createdTime ? new Date(b.createdTime).getTime() : 0;
      return timeA - timeB;
    });

  sortedHelpItems.forEach((resultItem) => {
    let routingId = resultItem._id || '-';
    let routingName = resultItem.name || '-';
    let createdBy = resultItem.user?.name || '-';
    let routingTime = '-';

    if (resultItem.createdTime) {
      try {
        const dateObj = new Date(resultItem.createdTime);
        routingTime = formatDateWIB(dateObj, 'DD/MM/YYYY HH:mm:ss');
      } catch (e) {
        routingTime = resultItem.createdTime;
      }
    }

    let routingResult = resultItem.dispatchMessage || '-';
    if (routingResult.includes('/')) {
      const [success, total] = routingResult.split('/');
      if (!isNaN(success) && !isNaN(total)) {
        routingResult = translate('excel.routing.data.dispatch_message', {
          success,
          total,
        });
      }
    }

    helpDataRows.push([routingId, routingName, createdBy, routingTime, routingResult]);
  });

  const finalHelpData = [helpHeader, ...helpDataRows];
  const wsHelp = XLSX.utils.aoa_to_sheet(finalHelpData);
  const helpHeaderStyle = {
    font: { bold: true },
    alignment: { horizontal: 'center', vertical: 'center' },
  };
  const helpDataStyle = {
    alignment: { horizontal: 'left', vertical: 'center' },
  };

  wsHelp['A1'].s = helpHeaderStyle;
  wsHelp['B1'].s = helpHeaderStyle;
  wsHelp['C1'].s = helpHeaderStyle;
  wsHelp['D1'].s = helpHeaderStyle;
  wsHelp['E1'].s = helpHeaderStyle;

  helpDataRows.forEach((row, idx) => {
    const rowNum = idx + 2;
    if (wsHelp[`A${rowNum}`]) wsHelp[`A${rowNum}`].s = helpDataStyle;
    if (wsHelp[`B${rowNum}`]) wsHelp[`B${rowNum}`].s = helpDataStyle;
    if (wsHelp[`C${rowNum}`]) wsHelp[`C${rowNum}`].s = helpDataStyle;
    if (wsHelp[`D${rowNum}`]) wsHelp[`D${rowNum}`].s = helpDataStyle;
    if (wsHelp[`E${rowNum}`]) wsHelp[`E${rowNum}`].s = helpDataStyle;
  });

  wsHelp['!cols'] = [{ wch: 28 }, { wch: 30 }, { wch: 20 }, { wch: 22 }, { wch: 45 }];
  XLSX.utils.book_append_sheet(wb, wsHelp, translate('excel.routing.sheets.help'));

  const formattedDate = formatYYYYMMDDToDDMMYYYY(dateForFile);
  const excelFileName = `${translate('excel.routing.filename')} - ${formattedDate} - ${hubName}.xlsx`;

  return { wb, excelFileName };
}
