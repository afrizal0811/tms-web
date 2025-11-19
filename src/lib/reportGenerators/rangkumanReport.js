// File: src/lib/reportGenerators/rangkumanReport.js
'use client';

import * as XLSX from 'xlsx-js-style';
import { formatYYYYMMDDToDDMMYYYY } from '@/lib/utils';
import { generateAverageKmSheet, calculateAverageKmData } from './rangkumanSheets/averageKmSheet';
import {
  generateTaskSummarySheet,
  generatePendingReasonsSheet,
  generateTimeDriverSheet,
  generateTruckDetailSheet,
  generateTruckUsageSheet,
} from './rangkumanSheets/otherSheets';

export function generateRangkumanDataPreview(
  driverData,
  allTasks,
  resultsData,
  locationHistoryData,
  startDateStr,
  endDateStr
) {
  // Ambil data lengkap (summary + monthTotals)
  const { summaryData, monthTotals } = calculateAverageKmData(
    resultsData,
    startDateStr,
    endDateStr
  );

  return {
    averageKmData: summaryData,
    monthTotals: monthTotals, // <-- Return data bulanan untuk UI

    // Placeholder
    taskSummaryData: [],
    pendingReasonsData: [],
    timeDriverData: [],
    truckDetailData: [],
    truckUsageData: [],
  };
}

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

  // Sheet Average KM (Updated with Month Summary Table)
  generateAverageKmSheet(wb, resultsData, startDateStr, endDateStr);

  const formattedStart = formatYYYYMMDDToDDMMYYYY(startDateStr);
  const formattedEnd = formatYYYYMMDDToDDMMYYYY(endDateStr);
  const excelFileName = `Rangkuman TMS - ${hubName} - ${formattedStart} sd ${formattedEnd}.xlsx`;

  return { wb, excelFileName };
}
