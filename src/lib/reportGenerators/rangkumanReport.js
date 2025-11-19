// File: src/lib/reportGenerators/rangkumanReport.js
'use client';

import * as XLSX from 'xlsx-js-style';
import { formatYYYYMMDDToDDMMYYYY } from '@/lib/utils';

// Import Generators
import { generateAverageKmSheet, calculateAverageKmData } from './rangkumanSheets/averageKmSheet';
import {
  generateTaskSummarySheet,
  generatePendingReasonsSheet,
  generateTimeDriverSheet,
  generateTruckDetailSheet,
  generateTruckUsageSheet,
} from './rangkumanSheets/otherSheets';

/**
 * Fungsi untuk Preview Web & Debugging
 */
export function generateRangkumanDataPreview(
  driverData,
  allTasks,
  resultsData,
  locationHistoryData,
  startDateStr,
  endDateStr
) {
  // Panggil kalkulator Average KM
  const { summaryData, filteredRawData } = calculateAverageKmData(
    resultsData,
    startDateStr,
    endDateStr
  );

  return {
    // Data tabel
    averageKmData: summaryData,
    // Data mentah hasil filter (untuk Save JSON)
    filteredRawResults: filteredRawData,

    // Placeholder sheet lain
    taskSummaryData: [],
    pendingReasonsData: [],
    timeDriverData: [],
    truckDetailData: [],
    truckUsageData: [],
  };
}

/**
 * Generator Excel (Tidak Berubah, hanya import yg menyesuaikan)
 */
export function generateRangkumanWorkbook(
  driverData,
  allTasks,
  resultsData,
  locationHistoryData,
  startDateStr,
  endDateStr,
  hubName
) {
  const wb = XLSX.utils.book_new();

  generateTaskSummarySheet(wb);
  generatePendingReasonsSheet(wb);
  generateTimeDriverSheet(wb);
  generateTruckDetailSheet(wb);
  generateTruckUsageSheet(wb);
  generateAverageKmSheet(wb, resultsData, startDateStr, endDateStr);

  const formattedStart = formatYYYYMMDDToDDMMYYYY(startDateStr);
  const formattedEnd = formatYYYYMMDDToDDMMYYYY(endDateStr);
  const excelFileName = `Rangkuman TMS - ${hubName} - ${formattedStart} sd ${formattedEnd}.xlsx`;

  return { wb, excelFileName };
}
