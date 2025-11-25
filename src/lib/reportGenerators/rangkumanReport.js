// File: lib/reportGenerators/rangkumanReport.js
'use client';

import * as XLSX from 'xlsx-js-style';
import { formatYYYYMMDDToDDMMYYYY } from '@/lib/utils';

import { generateAverageKmSheet, calculateAverageKmData } from './rangkumanSheets/averageKmSheet';
import {
  generateTruckUsageSheet,
  calculateTruckUsageData,
} from './rangkumanSheets/truckUsageSheet';
import {
  generateTruckDetailSheet,
  calculateTruckDetailData,
} from './rangkumanSheets/truckDetailSheet';
import {
  generateTimeDriverSheet,
  calculateTimeDriverData,
} from './rangkumanSheets/timeDriverSheet';

// IMPORT BARU
import {
  generatePendingReasonSheet,
  calculatePendingReasonData,
} from './rangkumanSheets/pendingReasonSheet';

import {
  generateTaskSummarySheet,
  // generatePendingReasonsSheet, // <-- HAPUS/COMMENT IMPORT LAMA
} from './rangkumanSheets/otherSheets';

export function generateRangkumanDataPreview(
  driverData,
  allTasks,
  resultsData,
  locationHistoryData,
  startDateStr,
  endDateStr,
  hubId
) {
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

  // 5. Pending Reason (NEW)
  const pendingReasonData = calculatePendingReasonData(driverData, allTasks);

  return {
    averageKmData: summaryData,
    monthTotals: monthTotals,
    truckUsageData: truckUsageData,
    truckDetailData: { ...truckDetailRaw, driverMap: Object.fromEntries(truckDetailRaw.driverMap) },
    timeDriverData: { ...timeDriverRaw, driverMap: Object.fromEntries(timeDriverRaw.driverMap) },

    pendingReasonsData: pendingReasonData, // <-- Data Baru

    taskSummaryData: [],
  };
}

export function generateRangkumanWorkbook(
  driverData,
  allTasks,
  resultsData,
  locationHistoryData,
  startDateStr,
  endDateStr,
  hubName,
  hubId
) {
  const wb = XLSX.utils.book_new();

  generateTaskSummarySheet(wb);

  // GANTI PLACEHOLDER DENGAN SHEET BARU
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
