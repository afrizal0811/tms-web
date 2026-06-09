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
  buildDistanceSummarySheet,
  buildDriverMaps,
  buildNormalizedMappings,
  buildTruckDetailSheet,
  buildTruckUsageSheet,
  getRoutingHeaders,
  getRoutingSheetNames,
  reportColumns,
  reportStyles,
} from './help';

function formatSimpleTime(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return '-';
  return timeStr.substring(0, 5);
}

function parseApiRoute(route, emailMap, platMap) {
  const initialTotalWeight = route.totalWeight || 0;
  const initialTotalVolume = route.totalVolume || 0;
  const initialTotalDistance = route.totalDistance || 0;
  const initialTotalTravelTime = route.totalTravelTime || 0;
  const initialTotalVisitTime = route.totalVisitTime || 0;
  const initialTotalWaitingTime = route.totalWaitingTime || 0;

  const hasTrips = Array.isArray(route.trips) && route.trips.length > 0;
  let etdHubVal = '-';
  let etaFirstStoreVal = '-';

  if (hasTrips) {
    const hubTrip = route.trips.find((t) => t.isHub);
    if (hubTrip?.etd) {
      etdHubVal = formatSimpleTime(hubTrip.etd);
    } else if (route.trips[0]?.etd) {
      etdHubVal = formatSimpleTime(route.trips[0].etd);
    }

    const firstStoreTrip = route.trips.find((t) => !t.isHub);
    if (firstStoreTrip?.eta) {
      etaFirstStoreVal = formatSimpleTime(firstStoreTrip.eta);
    }
  }

  const needsWeight = hasTrips && Math.floor(initialTotalWeight) <= 0;
  const needsVolume = hasTrips && Math.floor(initialTotalVolume) <= 0;
  const needsDistance = hasTrips && Math.floor(initialTotalDistance) <= 0;
  const needsTravelTime = hasTrips && Math.floor(initialTotalTravelTime) <= 0;
  const needsVisitTime = hasTrips && Math.floor(initialTotalVisitTime) <= 0;
  const needsWaitingTime = hasTrips && Math.floor(initialTotalWaitingTime) <= 0;

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
    (needsWeight ||
      needsVolume ||
      needsDistance ||
      needsTravelTime ||
      needsVisitTime ||
      needsWaitingTime)
  ) {
    manualCalcs = route.trips.reduce((acc, trip) => {
      if (!trip.isHub) {
        if (needsWeight && (trip.weight || 0) > 0) acc.weight += trip.weight;
        if (needsVolume && (trip.volume || 0) > 0) acc.volume += trip.volume;
        if (needsDistance) acc.distance += trip.distance || 0;
        if (needsTravelTime) acc.travelTime += trip.travelTime || 0;
        if (needsVisitTime) acc.visitTime += trip.visitTime || 0;
        if (needsWaitingTime) acc.waitingTime += trip.waitingTime || 0;
      }
      return acc;
    }, manualCalcs);
  }

  const finalWeight = needsWeight ? manualCalcs.weight : initialTotalWeight;
  const finalVolume = needsVolume ? manualCalcs.volume : initialTotalVolume;
  const finalDistance = needsDistance ? manualCalcs.distance : initialTotalDistance;
  const finalTravelTime = needsTravelTime ? manualCalcs.travelTime : initialTotalTravelTime;
  const finalVisitTime = needsVisitTime ? manualCalcs.visitTime : initialTotalVisitTime;
  const finalWaitingTime = needsWaitingTime ? manualCalcs.waitingTime : initialTotalWaitingTime;

  const assigneeEmail = route.assignee ? String(route.assignee).trim().toLowerCase() : '';
  const vehiclePlatNorm = route.vehicleName
    ? String(route.vehicleName).replace(/\s+/g, '').toLowerCase()
    : '';

  const driverInfo = emailMap.get(assigneeEmail) || platMap.get(vehiclePlatNorm);
  const driverName = driverInfo ? driverInfo.name : route.assignee || route.vehicleName;

  const maxWeight = route.vehicleMaxWeight || 0;
  const maxVolume = route.vehicleMaxVolume || 0;
  const weightPct = maxWeight > 0 ? ((finalWeight / maxWeight) * 100).toFixed(1) : 0;
  const volumePct = maxVolume > 0 ? ((finalVolume / maxVolume) * 100).toFixed(1) : 0;
  const spentTime = finalTravelTime + finalVisitTime + finalWaitingTime;

  return {
    plat: driverInfo?.plat ?? null,
    driver: driverName,
    weightPercentage: weightPct,
    volumePercentage: volumePct,
    totalDistance: finalDistance || 0,
    totalVisits: null,
    totalDelivered: null,
    shipDurationRaw: spentTime || route.totalSpentTime || 0,
    etaFirstStore: etaFirstStoreVal,
    etdHub: etdHubVal,
    hasTrips,
    totalTravelTime: finalTravelTime,
    totalVisitTime: finalVisitTime,
    tags: driverInfo?.type ? [driverInfo.type] : route.vehicleTags || [],
    vehiclePlat: driverInfo?.plat || 'N/A',
    vehicleNameRaw: route.vehicleName || '',
    storage: driverInfo?.storage || 'DRY',
  };
}

function accumulateApiDistanceAndUsage(row, normalizedMappings, truckUsageCount, distanceTotals) {
  if (!row.hasTrips) return;

  const tags = row.tags || [];
  if (!Array.isArray(tags) || tags.length === 0) return;

  const firstTag = String(tags[0]);
  const parts = firstTag.split('-');
  if (parts.length < 1) return;

  let generalType = parts[0].toUpperCase();
  if (!['DRY', 'FROZEN'].includes(generalType)) generalType = 'DRY';

  const distance = row.totalDistance || 0;
  if (generalType === 'FROZEN') distanceTotals.frozen += distance;
  else distanceTotals.dry += distance;

  let specificType = parts.length > 1 ? parts[1].toUpperCase() : firstTag.toUpperCase();
  if (parts.length > 2 && parts[2].toUpperCase() === 'LONG') {
    if (['CDE', 'CDD', 'FUSO'].includes(specificType)) {
      specificType = `${specificType}-LONG`;
    }
  }

  let searchPlat = '';
  if (row.vehiclePlat !== 'N/A') {
    searchPlat = String(row.vehiclePlat).replace(/\s+/g, '').toLowerCase();
  } else if (row.vehicleNameRaw) {
    searchPlat = String(row.vehicleNameRaw).replace(/\s+/g, '').toLowerCase();
  }

  const category =
    searchPlat && normalizedMappings[searchPlat]
      ? String(normalizedMappings[searchPlat]).toUpperCase()
      : specificType;

  if (!truckUsageCount[category]) {
    truckUsageCount[category] = { Dry: 0, Frozen: 0 };
  }
  if (generalType === 'FROZEN') truckUsageCount[category]['Frozen'] += 1;
  else truckUsageCount[category]['Dry'] += 1;
}

function getSortGroup(platStr) {
  if (!platStr) return 1;
  const upper = platStr.toUpperCase();
  if (upper.includes('DM')) return 3;
  if (upper.includes('SEWA')) return 2;
  return 1;
}
function buildHelpSheet(wb, filteredResults, headers, sheetNames, translate) {
  const helpDataRows = [];

  const sortedItems = filteredResults
    .filter((r) => r.dispatchStatus && String(r.dispatchStatus).toLowerCase() === 'done')
    .sort((a, b) => {
      const tA = a.createdTime ? new Date(a.createdTime).getTime() : 0;
      const tB = b.createdTime ? new Date(b.createdTime).getTime() : 0;
      return tA - tB;
    });

  sortedItems.forEach((item) => {
    const routingId = item._id || '-';
    const routingName = item.name || '-';
    const createdBy = item.user?.name || '-';

    let routingTime = '-';
    if (item.createdTime) {
      try {
        routingTime = formatDateWIB(new Date(item.createdTime), 'DD/MM/YYYY HH:mm:ss');
      } catch {
        routingTime = item.createdTime;
      }
    }

    const droppedVisits = item?.summary?.droppedVisits || 0;
    const totalVisits = item?.summary?.totalVisits || 0;
    const successVisits = item?.summary?.routedVisits || totalVisits - droppedVisits || 0;
    let routingResult = '-';
    if (!isNaN(droppedVisits) && !isNaN(totalVisits)) {
      routingResult = translate('excel.routing.data.dispatch_message', {
        success: successVisits,
        total: totalVisits,
      });
    }

    helpDataRows.push([routingId, routingName, createdBy, routingTime, routingResult]);
  });

  const finalData = [headers.help, ...helpDataRows];
  const ws = XLSX.utils.aoa_to_sheet(finalData);

  ['A1', 'B1', 'C1', 'D1', 'E1'].forEach((ref) => {
    if (ws[ref]) ws[ref].s = reportStyles.distanceHeaderStyle;
  });

  helpDataRows.forEach((_, idx) => {
    const row = idx + 2;
    ['A', 'B', 'C', 'D', 'E'].forEach((col) => {
      if (ws[`${col}${row}`]) ws[`${col}${row}`].s = reportStyles.helpDataStyle;
    });
  });

  ws['!cols'] = reportColumns.help;
  XLSX.utils.book_append_sheet(wb, ws, sheetNames.help);
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

  const { emailMap, platMap } = buildDriverMaps(driverData);
  const normalizedMappings = buildNormalizedMappings(mappingsObj);
  const truckUsageCount = {};
  vehicleTypes.forEach((v) => {
    const typeName = typeof v === 'string' ? v : v.name;
    truckUsageCount[String(typeName).toUpperCase()] = { Dry: 0, Frozen: 0 };
  });
  const distanceTotals = { dry: 0, frozen: 0 };

  // --- Parse all API routes ---
  const processedRows = [];
  filteredResults.forEach((resultItem) => {
    if (!resultItem.result || !Array.isArray(resultItem.result.routing)) return;
    resultItem.result.routing.forEach((route) => {
      const row = parseApiRoute(route, emailMap, platMap);
      processedRows.push(row);
      accumulateApiDistanceAndUsage(row, normalizedMappings, truckUsageCount, distanceTotals);
    });
  });

  const mergedMap = new Map();
  for (const row of processedRows) {
    const key = row.driver;
    if (!mergedMap.has(key)) {
      mergedMap.set(key, { ...row });
    } else {
      const existing = mergedMap.get(key);
      mergedMap.set(key, {
        ...existing,
        plat: existing.plat || row.plat,
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
    const cleanPlat = getBasePlate(driver.plat);
    const merged = mergedMap.get(driver.name);

    if (merged?.hasTrips) {
      return {
        Plat: cleanPlat,
        Driver: driver.name,
        WeightPercentage: merged.weightPercentage > 0 ? `${merged.weightPercentage}%` : null,
        VolumePercentage: merged.volumePercentage > 0 ? `${merged.volumePercentage}%` : null,
        TotalDistance: merged.totalDistance > 0 ? merged.totalDistance : null,
        TotalVisits: null,
        TotalDelivered: null,
        ShipDuration: formatMinutesToHHMM(merged.shipDurationRaw),
        ETAFirstStore: merged.etaFirstStore,
        ETDHub: merged.etdHub,
      };
    }
    return {
      Plat: cleanPlat,
      Driver: driver.name,
      WeightPercentage: null,
      VolumePercentage: null,
      TotalDistance: null,
      TotalVisits: null,
      TotalDelivered: null,
      ShipDuration: null,
      ETAFirstStore: null,
      ETDHub: null,
    };
  });

  excelDataRows.sort((a, b) => {
    const gA = getSortGroup(a.Plat);
    const gB = getSortGroup(b.Plat);
    if (gA !== gB) return gA - gB;
    return (a.Driver || '').localeCompare(b.Driver || '');
  });

  const wb = XLSX.utils.book_new();

  const finalSheetData = [
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

  buildTruckDetailSheet(wb, finalSheetData, headers, sheetNames);
  buildDistanceSummarySheet(
    wb,
    distanceTotals.dry / 1000,
    distanceTotals.frozen / 1000,
    headers,
    sheetNames
  );
  buildTruckUsageSheet(wb, truckUsageCount, vehicleTypes, headers, sheetNames);
  buildHelpSheet(wb, filteredResults, headers, sheetNames, translate);

  const formattedDate = formatDateUniversal(dateForFile, 'DD.MM.YYYY');
  const excelFileName = `${translate('excel.routing.filename')} - ${formattedDate} - ${hubName}.xlsx`;

  return { wb, excelFileName };
}
