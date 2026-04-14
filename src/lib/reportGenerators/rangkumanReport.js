'use client';

import { formatDateUniversal } from '@/lib/utils';
import * as XLSX from 'xlsx-js-style';
import { getLocalStorage } from '../localStorageHandler';
import { calculateAverageKmData, generateAverageKmSheet } from './rangkumanSheets/averageKmSheet';
import {
  calculatePendingReasonData,
  generatePendingReasonSheet,
} from './rangkumanSheets/pendingReasonSheet';
import { generateTaskSummarySheet } from './rangkumanSheets/taskSummarySheet';
import {
  calculateTimeDriverData,
  generateTimeDriverSheet,
} from './rangkumanSheets/timeDriverSheet';
import { generateTimeROSheet } from './rangkumanSheets/timeROSheet';
import {
  calculateTruckDetailData,
  generateTruckDetailSheet,
} from './rangkumanSheets/truckDetailSheet';
import {
  calculateTruckUsageData,
  generateTruckUsageSheet,
} from './rangkumanSheets/truckUsageSheet';

export async function generateRangkumanDataPreview(
  driverData,
  taskData,
  resultsData,
  locationHistoryData,
  startDateStr,
  endDateStr,
  hubId,
  language
) {
  const isIndo = language === 'id';
  const { summaryData, monthTotals } = calculateAverageKmData(
    resultsData,
    startDateStr,
    endDateStr,
    isIndo,
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
    isIndo,
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
  language
) {
  const wb = XLSX.utils.book_new();
  const isIndo = language === 'id';

  generateTimeROSheet(wb, taskData, startDateStr, endDateStr, translate, isIndo);
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
    hubName,
    translate,
    startDateStr,
    endDateStr
  );

  generateTimeDriverSheet(
    wb,
    driverData,
    locationHistoryData,
    startDateStr,
    endDateStr,
    translate,
    isIndo,
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
    isIndo
  );

  await generateTruckUsageSheet(wb, resultsData, startDateStr, endDateStr, hubId, translate);
  generateAverageKmSheet(wb, resultsData, startDateStr, endDateStr, translate, isIndo);

  const formattedStart = formatDateUniversal(startDateStr, 'DD.MM.YYYY');
  const formattedEnd = formatDateUniversal(endDateStr, 'DD.MM.YYYY');
  const { storedLocationAcronym: locationName } = getLocalStorage() || '-';
  const excelFileName = `${translate('summary.title')} - (${formattedStart} - ${formattedEnd}) - ${locationName}.xlsx`;

  return { wb, excelFileName };
}
