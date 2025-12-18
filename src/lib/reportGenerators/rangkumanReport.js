// File: lib/reportGenerators/rangkumanReport.js
'use client';

import { formatYYYYMMDDToDDMMYYYY } from '@/lib/utils';
import * as XLSX from 'xlsx-js-style';

import { calculateAverageKmData, generateAverageKmSheet } from './rangkumanSheets/averageKmSheet';
import {
  calculatePendingReasonData,
  generatePendingReasonSheet,
} from './rangkumanSheets/pendingReasonSheet';
import {
  calculateTimeDriverData,
  generateTimeDriverSheet,
} from './rangkumanSheets/timeDriverSheet';
import {
  calculateTruckDetailData,
  generateTruckDetailSheet,
} from './rangkumanSheets/truckDetailSheet';
import {
  calculateTruckUsageData,
  generateTruckUsageSheet,
} from './rangkumanSheets/truckUsageSheet';
import { generateTimeROSheet } from './rangkumanSheets/timeROSheet';
// --- IMPORT TASK SUMMARY SHEET ---
import { generateTaskSummarySheet } from './rangkumanSheets/taskSummarySheet';

export function generateRangkumanDataPreview(
  driverData,
  allTasks,
  resultsData,
  locationHistoryData,
  startDateStr,
  endDateStr,
  hubId
) {
  // ... (Bagian preview ini TIDAK BERUBAH) ...
  // 1. Average KM
  const { summaryData, monthTotals } = calculateAverageKmData(
    resultsData,
    startDateStr,
    endDateStr
  );
  // 2. Truck Usage
  const truckUsageData = calculateTruckUsageData(resultsData, startDateStr, endDateStr, hubId);
  // 3. Truck Detail
  const truckDetailRaw = calculateTruckDetailData(
    driverData,
    resultsData,
    allTasks,
    startDateStr,
    endDateStr
  );
  // 4. Time Driver
  const timeDriverRaw = calculateTimeDriverData(
    driverData,
    locationHistoryData,
    startDateStr,
    endDateStr
  );
  // 5. Pending Reason
  const pendingReasonData = calculatePendingReasonData(driverData, allTasks);

  return {
    averageKmData: summaryData,
    monthTotals: monthTotals,
    truckUsageData: truckUsageData,
    truckDetailData: { ...truckDetailRaw, driverMap: Object.fromEntries(truckDetailRaw.driverMap) },
    timeDriverData: { ...timeDriverRaw, driverMap: Object.fromEntries(timeDriverRaw.driverMap) },
    pendingReasonsData: pendingReasonData,
    taskSummaryData: [],
  };
}

// --- UPDATE FUNGSI INI: Tambahkan parameter taskSummaryMetrics & masterTruckData ---
export function generateRangkumanWorkbook(
  driverData,
  allTasks,
  resultsData,
  locationHistoryData,
  startDateStr,
  endDateStr,
  hubName,
  hubId,
  taskSummaryMetrics, // <--- Parameter Baru
  masterTruckData // <--- Parameter Baru
) {
  const wb = XLSX.utils.book_new();

  generateTimeROSheet(wb, allTasks, startDateStr, endDateStr);
  generateTaskSummarySheet(wb, taskSummaryMetrics, startDateStr, endDateStr, masterTruckData);
  generatePendingReasonSheet(wb, driverData, allTasks, hubName);
  generateTimeDriverSheet(wb, driverData, locationHistoryData, startDateStr, endDateStr);
  generateTruckDetailSheet(wb, driverData, resultsData, allTasks, startDateStr, endDateStr);
  generateTruckUsageSheet(wb, resultsData, startDateStr, endDateStr, hubId);
  generateAverageKmSheet(wb, resultsData, startDateStr, endDateStr);

  const formattedStart = formatYYYYMMDDToDDMMYYYY(startDateStr);
  const formattedEnd = formatYYYYMMDDToDDMMYYYY(endDateStr);
  const excelFileName = `Rangkuman TMS - ${hubName} - ${formattedStart} sd ${formattedEnd}.xlsx`;

  return { wb, excelFileName };
}
