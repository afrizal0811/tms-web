'use client';

import {
  formatDateUniversal,
  formatDateWIB,
  formatMinutesToHHMM,
  getBasePlate,
  isEmpty,
} from '@/lib/utils';
import * as XLSX from 'xlsx-js-style';
import {
  getRoutingHeaders,
  getRoutingSheetNames,
  reportColumns,
  reportStyles,
} from './routingConfig';

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
  t,
  vehicleTypes
) {
  const translate = t || ((key) => key);
  const headers = getRoutingHeaders(translate);
  const sheetNames = getRoutingSheetNames(translate);

  const emailMap = {};
  const platMap = {};

  driverData.forEach((driver) => {
    let typeVal = driver.type;
    if (!typeVal && driver.tags) {
      try {
        const parsed = JSON.parse(driver.tags);
        if (Array.isArray(parsed) && parsed.length > 0) typeVal = parsed[0];
      } catch (e) {
        typeVal = driver.tags;
      }
    }

    if (driver.email) {
      emailMap[driver.email.trim().toLowerCase()] = {
        name: driver.name,
        plat: driver.plat,
        type: typeVal,
      };
    }
    if (driver.plat) {
      platMap[driver.plat.replace(/\s+/g, '').toLowerCase()] = {
        name: driver.name,
        plat: driver.plat,
        type: typeVal,
      };
    }
  });

  const normalizedMappings = {};
  if (mappingsObj) {
    Object.keys(mappingsObj).forEach((key) => {
      if (key) {
        normalizedMappings[String(key).replace(/\s+/g, '').toLowerCase()] = mappingsObj[key];
      }
    });
  }

  let processedDataRows = [];
  let totalDryDistance = 0;
  let totalFrozenDistance = 0;
  let truckUsageCount = {};

  vehicleTypes.forEach((type) => {
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

        let tags = route.vehicleTags || [];
        if (driverInfo && driverInfo.type) {
          tags = [driverInfo.type];
        }

        const distance = finalTotalDistance || 0;
        const vehiclePlat = driverInfo && driverInfo.plat ? driverInfo.plat : 'N/A';

        if (hasTrips && Array.isArray(tags) && tags.length > 0) {
          const firstTag = String(tags[0]);
          const parts = firstTag.split('-');
          if (parts.length >= 1) {
            let generalType = parts[0].toUpperCase();
            if (!['DRY', 'FROZEN'].includes(generalType)) generalType = 'DRY';

            if (generalType === 'FROZEN') totalFrozenDistance += distance;
            else if (generalType === 'DRY') totalDryDistance += distance;

            let specificType = parts.length > 1 ? parts[1].toUpperCase() : firstTag.toUpperCase();
            if (parts.length > 2 && parts[2].toUpperCase() === 'LONG') {
              if (['CDE', 'CDD', 'FUSO'].includes(specificType)) {
                specificType = `${specificType}-LONG`;
              }
            }

            let searchPlat = '';
            if (vehiclePlat !== 'N/A') {
              searchPlat = String(vehiclePlat).replace(/\s+/g, '').toLowerCase();
            } else if (route.vehicleName) {
              searchPlat = String(route.vehicleName).replace(/\s+/g, '').toLowerCase();
            }

            let category = specificType;
            if (searchPlat && normalizedMappings[searchPlat]) {
              category = normalizedMappings[searchPlat];
            }

            if (!truckUsageCount[category]) {
              truckUsageCount[category] = { Dry: 0, Frozen: 0 };
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

  const seenIdentifiers = new Set();
  const validDriverData = driverData.filter((driver) => {
    const plat = driver.plat || '';
    if (isEmpty(plat) || plat.toUpperCase().includes('DEMO')) return false;

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
    const cleanPlat = getBasePlate(driverPlat);
    const mergedRow = mergedTruckDetailMap.get(driverName);

    if (mergedRow && mergedRow.hasTrips) {
      return {
        Plat: cleanPlat,
        Driver: driverName,
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
        Plat: cleanPlat,
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
    const groupA = getSortGroup(a.Plat);
    const groupB = getSortGroup(b.Plat);
    if (groupA !== groupB) return groupA - groupB;
    return (a.Driver || '').localeCompare(b.Driver || '');
  });

  const finalSheetData1 = [
    headers.truckDetail,
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

  for (let R = range1.s.r; R <= range1.e.r; ++R) {
    for (let C = range1.s.c; C <= range1.e.c; ++C) {
      const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
      if (!wsTruckDetail[cellRef]) continue;

      if (R === 0) {
        const headerName = finalSheetData1[0][C];
        wsTruckDetail[cellRef].s = headers.truckDetailGreen.includes(headerName)
          ? reportStyles.greenHeaderStyle
          : reportStyles.defaultHeaderStyle;
      } else if (reportColumns.truckDetailCenterAligned.includes(C)) {
        wsTruckDetail[cellRef].s = reportStyles.centerStyle;
      }
    }
  }

  wsTruckDetail['!cols'] = headers.truckDetail.map((_, i) => ({
    wch:
      finalSheetData1.reduce((max, row) => Math.max(max, row[i] ? String(row[i]).length : 0), 0) +
      2,
  }));
  XLSX.utils.book_append_sheet(wb, wsTruckDetail, sheetNames.truckDetail);

  const totalDryKm = totalDryDistance / 1000;
  const totalFrozenKm = totalFrozenDistance / 1000;
  const distanceSummaryData = [headers.distanceSummary, [totalDryKm, totalFrozenKm]];

  const wsDistanceSummary = XLSX.utils.aoa_to_sheet(distanceSummaryData);

  wsDistanceSummary['A1'] = {
    v: headers.distanceSummary[0],
    t: 's',
    s: reportStyles.distanceHeaderStyle,
  };
  wsDistanceSummary['B1'] = {
    v: headers.distanceSummary[1],
    t: 's',
    s: reportStyles.distanceHeaderStyle,
  };
  wsDistanceSummary['A2'] = { v: totalDryKm, t: 'n', s: reportStyles.distanceDataStyle };
  wsDistanceSummary['B2'] = { v: totalFrozenKm, t: 'n', s: reportStyles.distanceDataStyle };
  wsDistanceSummary['!cols'] = reportColumns.distanceSummary;
  XLSX.utils.book_append_sheet(wb, wsDistanceSummary, sheetNames.distSummary);

  const dynamicTypes = Object.keys(truckUsageCount).filter((t) => !vehicleTypes.includes(t));
  const allTypes = [...vehicleTypes, ...dynamicTypes];

  const usageDataRows = allTypes.map((type) => {
    const dryCount = truckUsageCount[type]['Dry'];
    const frozenCount = truckUsageCount[type]['Frozen'];
    return [type, dryCount > 0 ? dryCount : null, frozenCount > 0 ? frozenCount : null];
  });

  const finalUsageData = [headers.truckUsage, ...usageDataRows];
  const wsTruckUsage = XLSX.utils.aoa_to_sheet(finalUsageData);

  wsTruckUsage['A1'].s = reportStyles.distanceHeaderStyle;
  wsTruckUsage['B1'].s = reportStyles.distanceHeaderStyle;
  wsTruckUsage['C1'].s = reportStyles.distanceHeaderStyle;

  finalUsageData.forEach((row, R) => {
    if (R === 0) return;
    const aRef = `A${R + 1}`;
    const bRef = `B${R + 1}`;
    const cRef = `C${R + 1}`;

    if (wsTruckUsage[aRef]) wsTruckUsage[aRef].s = reportStyles.usageDataLabelStyle;
    if (wsTruckUsage[bRef]) wsTruckUsage[bRef].s = reportStyles.usageDataNumStyle;
    if (wsTruckUsage[cRef]) wsTruckUsage[cRef].s = reportStyles.usageDataNumStyle;
  });

  wsTruckUsage['!cols'] = reportColumns.truckUsage;
  XLSX.utils.book_append_sheet(wb, wsTruckUsage, sheetNames.truckUsage);

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

    const droppedVisits = resultItem?.summary?.droppedVisits || 0;
    const totalVisits = resultItem?.summary?.totalVisits || 0;
    const successVisits = resultItem?.summary?.routedVisits || totalVisits - droppedVisits || 0;
    let routingResult = '-';

    if (!isNaN(droppedVisits) && !isNaN(totalVisits)) {
      routingResult = translate('excel.routing.data.dispatch_message', {
        success: successVisits,
        total: totalVisits,
      });
    }

    helpDataRows.push([routingId, routingName, createdBy, routingTime, routingResult]);
  });

  const finalHelpData = [headers.help, ...helpDataRows];
  const wsHelp = XLSX.utils.aoa_to_sheet(finalHelpData);

  wsHelp['A1'].s = reportStyles.distanceHeaderStyle;
  wsHelp['B1'].s = reportStyles.distanceHeaderStyle;
  wsHelp['C1'].s = reportStyles.distanceHeaderStyle;
  wsHelp['D1'].s = reportStyles.distanceHeaderStyle;
  wsHelp['E1'].s = reportStyles.distanceHeaderStyle;

  helpDataRows.forEach((row, idx) => {
    const rowNum = idx + 2;
    if (wsHelp[`A${rowNum}`]) wsHelp[`A${rowNum}`].s = reportStyles.helpDataStyle;
    if (wsHelp[`B${rowNum}`]) wsHelp[`B${rowNum}`].s = reportStyles.helpDataStyle;
    if (wsHelp[`C${rowNum}`]) wsHelp[`C${rowNum}`].s = reportStyles.helpDataStyle;
    if (wsHelp[`D${rowNum}`]) wsHelp[`D${rowNum}`].s = reportStyles.helpDataStyle;
    if (wsHelp[`E${rowNum}`]) wsHelp[`E${rowNum}`].s = reportStyles.helpDataStyle;
  });

  wsHelp['!cols'] = reportColumns.help;
  XLSX.utils.book_append_sheet(wb, wsHelp, sheetNames.help);

  const formattedDate = formatDateUniversal(dateForFile, 'DD.MM.YYYY');
  const excelFileName = `${translate('excel.routing.filename')} - ${formattedDate} - ${hubName}.xlsx`;

  return { wb, excelFileName };
}
