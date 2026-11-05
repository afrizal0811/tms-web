import { formatDateUniversal, normalizeEmail } from '@/lib/utils';
import * as XLSX from 'xlsx-js-style';
import {
  calculateDistanceSummary,
  calculateLoadingCapacity,
  calculateRouteReview,
  calculateRoutingTime,
  calculateVolumeSummary,
} from './sections';
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

  const volumeSummary = calculateVolumeSummary(resultsData, tasksData, driverMap, driverData);
  const routingTime = calculateRoutingTime(resultsData, driverMap, driverData, tasksData);
  const distanceSummary = calculateDistanceSummary(
    resultsData,
    historiesData,
    driverMap,
    driverData,
    tasksData
  );
  const loadingCapacity = calculateLoadingCapacity(
    resultsData,
    historiesData,
    driverData,
    tasksData,
    driverMap
  );
  const routeReview = calculateRouteReview(
    tasksData,
    driverData,
    historiesData,
    routingTime.detailRows
  );

  const wb = XLSX.utils.book_new();

  const { wsRR, sumOvertime } = generateSheetRouteReview(
    routeReview.routeReviewRows,
    routeReview.startFinishRows,
    routingTime.detailRows
  );

  const wsKPI = generateSheetDataKPI(
    formattedDate,
    volumeSummary,
    routingTime,
    distanceSummary,
    loadingCapacity,
    routeReview,
    sumOvertime
  );
  XLSX.utils.book_append_sheet(wb, wsKPI, 'Data KPI');

  const wsPendingSO = generateSheetPendingSO(tasksData, driverData);
  XLSX.utils.book_append_sheet(wb, wsPendingSO, 'Faktur Pending');

  if (routingTime.dataRoutingExists) {
    const wsRouting = generateSheetDataRouting(routingTime);
    XLSX.utils.book_append_sheet(wb, wsRouting, 'Data Routing');
  }

  const wsSF = generateSheetStartFinish(routeReview.startFinishRows, routeReview.routeReviewRows);
  XLSX.utils.book_append_sheet(wb, wsSF, 'Start & Finish');

  XLSX.utils.book_append_sheet(wb, wsRR, 'Route Review');

  return { wb, fileName: `KPI - ${dateFileName} - ${locationName}.xlsx`, hasError: false };
}
