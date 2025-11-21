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

import {
  generateTaskSummarySheet,
  generatePendingReasonsSheet,
} from './rangkumanSheets/otherSheets';

/**
 * Fungsi untuk menyiapkan Data Preview di Web
 */
export function generateRangkumanDataPreview(
  driverData,
  allTasks,
  resultsData,
  locationHistoryData, // Pastikan ini digunakan
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

  // 4. Time Driver (MENGGUNAKAN LOCATION HISTORY)
  const timeDriverRaw = calculateTimeDriverData(
    driverData,
    locationHistoryData, // <-- Menggunakan Data Location
    startDateStr,
    endDateStr
  );

  const truckDetailData = {
    ...truckDetailRaw,
    driverMap: Object.fromEntries(truckDetailRaw.driverMap),
  };

  const timeDriverData = {
    ...timeDriverRaw,
    driverMap: Object.fromEntries(timeDriverRaw.driverMap),
  };

  return {
    averageKmData: summaryData,
    monthTotals: monthTotals,
    truckUsageData: truckUsageData,
    truckDetailData: truckDetailData,
    timeDriverData: timeDriverData,

    taskSummaryData: [],
    pendingReasonsData: [],
  };
}

/**
 * Fungsi untuk Generate File Excel
 */
export function generateRangkumanWorkbook(
  driverData,
  allTasks,
  resultsData,
  locationHistoryData, // Pastikan ini digunakan
  startDateStr,
  endDateStr,
  hubName,
  hubId
) {
  const wb = XLSX.utils.book_new();

  generateTaskSummarySheet(wb);
  generatePendingReasonsSheet(wb);

  // MENGGUNAKAN LOCATION HISTORY
  generateTimeDriverSheet(wb, driverData, locationHistoryData, startDateStr, endDateStr);

  generateTruckDetailSheet(wb, driverData, resultsData, allTasks, startDateStr, endDateStr);
  generateTruckUsageSheet(wb, resultsData, startDateStr, endDateStr, hubId);
  generateAverageKmSheet(wb, resultsData, startDateStr, endDateStr);

  const formattedStart = formatYYYYMMDDToDDMMYYYY(startDateStr);
  const formattedEnd = formatYYYYMMDDToDDMMYYYY(endDateStr);
  const excelFileName = `Rangkuman TMS - ${hubName} - ${formattedStart} sd ${formattedEnd}.xlsx`;

  return { wb, excelFileName };
}
