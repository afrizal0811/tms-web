'use client';

import * as XLSX from 'xlsx-js-style';
import { formatYYYYMMDDToDDMMYYYY } from '@/lib/utils';

// Import Generators per-Sheet
import { generateAverageKmSheet, calculateAverageKmData } from './rangkumanSheets/averageKmSheet';
import {
  generateTruckUsageSheet,
  calculateTruckUsageData,
} from './rangkumanSheets/truckUsageSheet';
// (PENTING) Import logika Truck Detail yang akan kita buat selanjutnya
import {
  generateTruckDetailSheet,
  calculateTruckDetailData,
} from './rangkumanSheets/truckDetailSheet';

import {
  generateTaskSummarySheet,
  generatePendingReasonsSheet,
  generateTimeDriverSheet,
} from './rangkumanSheets/otherSheets';

/**
 * Fungsi untuk menyiapkan Data Preview di Web
 */
export function generateRangkumanDataPreview(
  driverData,
  allTasks,
  resultsData,
  locationHistoryData,
  startDateStr,
  endDateStr,
  hubId
) {
  // 1. Hitung Average KM
  const { summaryData, monthTotals } = calculateAverageKmData(
    resultsData,
    startDateStr,
    endDateStr
  );

  // 2. Hitung Truck Usage
  const truckUsageData = calculateTruckUsageData(resultsData, startDateStr, endDateStr, hubId);

  // 3. Hitung Truck Detail (NEW)
  const truckDetailRaw = calculateTruckDetailData(
    driverData,
    resultsData,
    allTasks,
    startDateStr,
    endDateStr
  );

  // Konversi Map ke Object agar bisa disimpan di State React (Map tidak serializable)
  const truckDetailData = {
    ...truckDetailRaw,
    driverMap: Object.fromEntries(truckDetailRaw.driverMap),
  };

  return {
    averageKmData: summaryData,
    monthTotals: monthTotals,
    truckUsageData: truckUsageData,
    truckDetailData: truckDetailData, // <-- Data baru dikirim ke UI

    // Placeholder untuk tab lain
    taskSummaryData: [],
    pendingReasonsData: [],
    timeDriverData: [],
  };
}

/**
 * Fungsi untuk Generate File Excel
 */
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

  // 1. Sheet-sheet Placeholder
  generateTaskSummarySheet(wb);
  generatePendingReasonsSheet(wb);
  generateTimeDriverSheet(wb);

  // 2. Sheet Truck Detail (NEW)
  generateTruckDetailSheet(wb, driverData, resultsData, allTasks, startDateStr, endDateStr);

  // 3. Sheet Truck Usage
  generateTruckUsageSheet(wb, resultsData, startDateStr, endDateStr, hubId);

  // 4. Sheet Average KM
  generateAverageKmSheet(wb, resultsData, startDateStr, endDateStr);

  const formattedStart = formatYYYYMMDDToDDMMYYYY(startDateStr);
  const formattedEnd = formatYYYYMMDDToDDMMYYYY(endDateStr);
  const excelFileName = `Rangkuman TMS - ${hubName} - ${formattedStart} sd ${formattedEnd}.xlsx`;

  return { wb, excelFileName };
}
