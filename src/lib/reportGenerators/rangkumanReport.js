// File: src/lib/reportGenerators/rangkumanReport.js
'use client';

import { formatYYYYMMDDToDDMMYYYY } from '@/lib/utils';
import * as XLSX from 'xlsx-js-style';

// Import Generators
import { calculateAverageKmData, generateAverageKmSheet } from './rangkumanSheets/averageKmSheet';
import {
  generatePendingReasonsSheet,
  generateTaskSummarySheet,
  generateTimeDriverSheet,
  generateTruckDetailSheet,
} from './rangkumanSheets/otherSheets';
import {
  calculateTruckUsageData,
  generateTruckUsageSheet,
} from './rangkumanSheets/truckUsageSheet'; // <-- Import Baru

export function generateRangkumanDataPreview(
  driverData,
  allTasks,
  resultsData,
  locationHistoryData,
  startDateStr,
  endDateStr,
  hubId // <-- Tambahkan Parameter Hub ID
) {
  const { summaryData, monthTotals } = calculateAverageKmData(
    resultsData,
    startDateStr,
    endDateStr
  );

  // Hitung data Truck Usage untuk preview web
  const truckUsageData = calculateTruckUsageData(resultsData, startDateStr, endDateStr, hubId);

  return {
    averageKmData: summaryData,
    monthTotals: monthTotals,
    truckUsageData: truckUsageData, // <-- Kirim ke UI

    // Placeholder
    taskSummaryData: [],
    pendingReasonsData: [],
    timeDriverData: [],
    truckDetailData: [],
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
  hubId // <-- Tambahkan Parameter Hub ID
) {
  const wb = XLSX.utils.book_new();

  generateTaskSummarySheet(wb);
  generatePendingReasonsSheet(wb);
  generateTimeDriverSheet(wb);
  generateTruckDetailSheet(wb);

  // Panggil Generator Truck Usage yang baru
  generateTruckUsageSheet(wb, resultsData, startDateStr, endDateStr, hubId);

  generateAverageKmSheet(wb, resultsData, startDateStr, endDateStr);

  const formattedStart = formatYYYYMMDDToDDMMYYYY(startDateStr);
  const formattedEnd = formatYYYYMMDDToDDMMYYYY(endDateStr);
  const excelFileName = `Rangkuman TMS - ${hubName} - ${formattedStart} sd ${formattedEnd}.xlsx`;

  return { wb, excelFileName };
}
