// File: src/lib/reportGenerators/rangkumanReport.js
'use client';

import { formatYYYYMMDDToDDMMYYYY } from '@/lib/utils';
import * as XLSX from 'xlsx-js-style';

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

export function generateRangkumanDataPreview(
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
  // 2. Truck Usage
  const truckUsageData = calculateTruckUsageData(resultsData, startDateStr, endDateStr, hubId);
  // 3. Truck Detail
  const truckDetailRaw = calculateTruckDetailData(
    driverData,
    resultsData,
    taskData,
    startDateStr,
    endDateStr
  );
  // 4. Time Driver
  const timeDriverRaw = calculateTimeDriverData(
    driverData,
    locationHistoryData,
    startDateStr,
    endDateStr,
    isIndo,
    taskData,
    resultsData
  );
  // 5. Pending Reason (UPDATE: Pass Dates)
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

export function generateRangkumanWorkbook(
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
  // UPDATE: Pass Dates ke Sheet Generator
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
  generateTruckUsageSheet(wb, resultsData, startDateStr, endDateStr, hubId, translate);
  generateAverageKmSheet(wb, resultsData, startDateStr, endDateStr, translate, isIndo);

  const formattedStart = formatYYYYMMDDToDDMMYYYY(startDateStr);
  const formattedEnd = formatYYYYMMDDToDDMMYYYY(endDateStr);
  const excelFileName = `${translate('summary.title')} - ${hubName} - ${formattedStart} sd ${formattedEnd}.xlsx`;

  return { wb, excelFileName };
}
