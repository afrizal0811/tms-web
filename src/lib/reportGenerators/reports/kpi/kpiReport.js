import { formatDateUniversal, normalizeEmail } from '@/lib/utils';
import * as XLSX from 'xlsx-js-style';
import {
  calculateGroupFive,
  calculateGroupFour,
  calculateGroupOne,
  calculateGroupThree,
  calculateGroupTwo,
} from './groups';
import {
  generateSheetDataKPI,
  generateSheetDataRouting,
  generateSheetPendingSO,
  generateSheetRouteReview,
  generateSheetStartFinish,
} from './sheets';

export function generateKpiWorkbook(
  selectedDate,
  locationName,
  driverData,
  resultsData,
  tasksData,
  historiesData
) {
  const formattedDate = formatDateUniversal(selectedDate, 'DD-MM-YYYY');
  const dateFileName = formatDateUniversal(selectedDate, 'DD.MM.YYYY');

  const driverMap = {};
  if (Array.isArray(driverData)) {
    driverData.forEach((driver) => {
      const email = normalizeEmail(driver.email);
      if (email) {
        driverMap[email] = (driver.name || '').toUpperCase();
      }
    });
  }

  const g1 = calculateGroupOne(resultsData, tasksData, driverMap);
  const g2 = calculateGroupTwo(resultsData, driverMap, driverData);
  const g3 = calculateGroupThree(resultsData, historiesData, driverMap);
  const g4 = calculateGroupFour(resultsData, historiesData, driverData);
  const g5 = calculateGroupFive(tasksData, driverData, historiesData, g2.detailRows);

  const wb = XLSX.utils.book_new();

  const { wsRR, sumOvertime } = generateSheetRouteReview(
    g5.routeReviewRows,
    g5.startFinishRows,
    g2.detailRows
  );

  const wsKPI = generateSheetDataKPI(formattedDate, g1, g2, g3, g4, g5, sumOvertime);
  XLSX.utils.book_append_sheet(wb, wsKPI, 'Data KPI');

  const wsPendingSO = generateSheetPendingSO(tasksData, driverData);
  XLSX.utils.book_append_sheet(wb, wsPendingSO, 'Pending SO');

  if (g2.dataRoutingExists) {
    const wsRouting = generateSheetDataRouting(g2);
    XLSX.utils.book_append_sheet(wb, wsRouting, 'Data Routing');
  }

  const wsSF = generateSheetStartFinish(g5.startFinishRows, g5.routeReviewRows);
  XLSX.utils.book_append_sheet(wb, wsSF, 'Start & Finish');

  XLSX.utils.book_append_sheet(wb, wsRR, 'Route Review');

  return { wb, fileName: `KPI - ${dateFileName} - ${locationName}.xlsx`, hasError: false };
}
