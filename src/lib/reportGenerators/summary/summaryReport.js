// File: src/lib/reportGenerators/rangkumanReport.js
'use client';

import { getCachedHubs } from '@/lib/localStorageHandler';
import { formatDateUniversal } from '@/lib/utils';
import * as XLSX from 'xlsx-js-style';
import { getLocalStorage } from '../../localStorageHandler';
import {
  calculateDistanceSummaryData,
  calculatePendingReasonData,
  calculateTimeDriverData,
  calculateTruckDetailData,
  calculateTruckUsageData,
  generateDistanceSummarySheet,
  generatePendingReasonSheet,
  generateRoutingTimeSheet,
  generateTaskSummarySheet,
  generateTimeDriverSheet,
  generateTruckDetailSheet,
  generateTruckUsageSheet,
} from './sheets';
export async function generateSummaryDataPreview(
  driverData,
  taskData,
  resultsData,
  locationHistoryData,
  startDateStr,
  endDateStr,
  hubId,
  localeCode,
  activeHubCoords
) {
  const { summaryData, monthTotals } = calculateDistanceSummaryData(
    resultsData,
    startDateStr,
    endDateStr,
    localeCode,
    driverData,
    taskData,
    locationHistoryData
  );

  const truckUsageData = await calculateTruckUsageData(
    resultsData,
    startDateStr,
    endDateStr,
    hubId,
    taskData
  );

  const truckDetailRaw = calculateTruckDetailData(
    driverData,
    resultsData,
    taskData,
    startDateStr,
    endDateStr,
    localeCode,
    activeHubCoords
  );

  const timeDriverRaw = calculateTimeDriverData(
    driverData,
    locationHistoryData,
    startDateStr,
    endDateStr,
    localeCode,
    taskData,
    resultsData
  );

  const pendingReasonData = calculatePendingReasonData(
    driverData,
    taskData,
    startDateStr,
    endDateStr
  );

  return {
    distanceSummaryData: summaryData,
    monthTotals: monthTotals,
    truckUsageData: truckUsageData,
    truckDetailData: { ...truckDetailRaw, driverMap: Object.fromEntries(truckDetailRaw.driverMap) },
    timeDriverData: { ...timeDriverRaw, driverMap: Object.fromEntries(timeDriverRaw.driverMap) },
    pendingReasonsData: pendingReasonData,
  };
}

export async function generateSummaryWorkbook(
  driverData,
  taskData,
  resultsData,
  locationHistoryData,
  startDateStr,
  endDateStr,
  hubName,
  hubId,
  taskSummaryMetrics,
  masterTruckData,
  translate,
  localeCode,
  hasPendingGR,
  pendingDetails
) {
  const wb = XLSX.utils.book_new();
  const hubsList = getCachedHubs() || [];
  const activeHub = hubsList.find((h) => h._id === hubId || h.id === hubId);
  activeHub?.lat && activeHub?.lng ? `${activeHub.lat},${activeHub.lng}` : null;
  generateRoutingTimeSheet(wb, taskData, startDateStr, endDateStr, translate, localeCode);
  generateTaskSummarySheet(
    wb,
    taskSummaryMetrics,
    startDateStr,
    endDateStr,
    masterTruckData,
    translate
  );

  generatePendingReasonSheet(
    wb,
    driverData,
    taskData,
    translate,
    startDateStr,
    endDateStr,
    hasPendingGR,
    pendingDetails // <-- Diteruskan
  );

  generateTimeDriverSheet(
    wb,
    driverData,
    locationHistoryData,
    startDateStr,
    endDateStr,
    translate,
    localeCode,
    taskData,
    resultsData
  );

  generateTruckDetailSheet(
    wb,
    driverData,
    resultsData,
    taskData,
    startDateStr,
    endDateStr,
    translate,
    localeCode,
  );

  await generateTruckUsageSheet(
    wb,
    resultsData,
    startDateStr,
    endDateStr,
    hubId,
    translate,
    localeCode,
    taskData
  );
  generateDistanceSummarySheet(
    wb,
    resultsData,
    startDateStr,
    endDateStr,
    translate,
    localeCode,
    driverData,
    taskData,
    locationHistoryData
  );
  const formattedStart = formatDateUniversal(startDateStr, 'DD.MM.YYYY');
  const formattedEnd = formatDateUniversal(endDateStr, 'DD.MM.YYYY');
  const { storedLocationAcronym: locationName } = getLocalStorage() || '-';
  const excelFileName = `${translate('summary.title')} - (${formattedStart} - ${formattedEnd}) - ${locationName}.xlsx`;

  return { wb, excelFileName };
}
