// File: src/lib/reportGenerators/rangkumanReport.js
'use client';

import { formatDateUniversal } from '@/lib/utils';
import * as XLSX from 'xlsx-js-style';
import { getLocalStorage } from '../../localStorageHandler';
import {
  calculateAverageKmData,
  calculatePendingReasonData,
  calculateTimeDriverData,
  calculateTruckDetailData,
  calculateTruckUsageData,
  generateAverageKmSheet,
  generatePendingReasonSheet,
  generateTaskSummarySheet,
  generateTimeDriverSheet,
  generateTimeROSheet,
  generateTruckDetailSheet,
  generateTruckUsageSheet,
} from './sheets';

export async function generateRangkumanDataPreview(
  driverData,
  taskData,
  resultsData,
  locationHistoryData,
  startDateStr,
  endDateStr,
  hubId,
  localeCode
) {
  const { summaryData, monthTotals } = calculateAverageKmData(
    resultsData,
    startDateStr,
    endDateStr,
    localeCode,
    driverData
  );

  const truckUsageData = await calculateTruckUsageData(
    resultsData,
    startDateStr,
    endDateStr,
    hubId
  );

  const truckDetailRaw = calculateTruckDetailData(
    driverData,
    resultsData,
    taskData,
    startDateStr,
    endDateStr
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
    averageKmData: summaryData,
    monthTotals: monthTotals,
    truckUsageData: truckUsageData,
    truckDetailData: { ...truckDetailRaw, driverMap: Object.fromEntries(truckDetailRaw.driverMap) },
    timeDriverData: { ...timeDriverRaw, driverMap: Object.fromEntries(timeDriverRaw.driverMap) },
    pendingReasonsData: pendingReasonData,
  };
}

export async function generateRangkumanWorkbook(
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
  pendingDetails // <-- Parameter Baru
) {
  const wb = XLSX.utils.book_new();
  generateTimeROSheet(wb, taskData, startDateStr, endDateStr, translate, localeCode);
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
    localeCode
  );

  await generateTruckUsageSheet(
    wb,
    resultsData,
    startDateStr,
    endDateStr,
    hubId,
    translate,
    localeCode
  );
  generateAverageKmSheet(wb, resultsData, startDateStr, endDateStr, translate, localeCode);

  const formattedStart = formatDateUniversal(startDateStr, 'DD.MM.YYYY');
  const formattedEnd = formatDateUniversal(endDateStr, 'DD.MM.YYYY');
  const { storedLocationAcronym: locationName } = getLocalStorage() || '-';
  const excelFileName = `${translate('summary.title')} - (${formattedStart} - ${formattedEnd}) - ${locationName}.xlsx`;

  return { wb, excelFileName };
}
