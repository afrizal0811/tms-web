import { formatDateUniversal, normalizeEmail } from '@/lib/utils';
import * as XLSX from 'xlsx-js-style';

// Import Logic Groups
import { calculateGroupFive } from './groups/groupFive';
import { calculateGroupFour } from './groups/groupFour';
import { calculateGroupOne } from './groups/groupOne';
import { calculateGroupThree } from './groups/groupThree';
import { calculateGroupTwo } from './groups/groupTwo';

// Import Sheet Generators
import { generateSheetDataKPI } from './sheets/sheetDataKPI';
import { generateSheetDataRouting } from './sheets/sheetDataRouting';
import { generateSheetHelp } from './sheets/sheetHelp';
import { generateSheetPendingSO } from './sheets/sheetPendingSO';
import { generateSheetRouteReview } from './sheets/sheetRouteReview';
import { generateSheetStartFinish } from './sheets/sheetStartFinish';

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

  // --- CALCULATE GROUPS ---
  const g1 = calculateGroupOne(resultsData, tasksData, driverMap);
  const g2 = calculateGroupTwo(resultsData, driverMap, driverData);
  const g3 = calculateGroupThree(resultsData, historiesData, driverMap);
  const g4 = calculateGroupFour(resultsData, historiesData, driverData);

  // Mengirim g2.detailRows ke groupFive agar sinkron dengan Sheet Route Review
  const g5 = calculateGroupFive(tasksData, driverData, historiesData, g2.detailRows);

  // --- CREATE WORKBOOK ---
  const wb = XLSX.utils.book_new();

  const { wsRR, sumOvertime } = generateSheetRouteReview(
    g5.routeReviewRows,
    g5.totals,
    g5.startFinishRows,
    g2.detailRows
  );

  // 1. SHEET: Data KPI
  const wsKPI = generateSheetDataKPI(formattedDate, g1, g2, g3, g4, g5, sumOvertime);
  XLSX.utils.book_append_sheet(wb, wsKPI, 'Data KPI');

  // SHEET: Pending SO
  const wsPendingSO = generateSheetPendingSO(tasksData, driverData);
  XLSX.utils.book_append_sheet(wb, wsPendingSO, 'Pending SO');

  // 2. SHEET: Data Routing
  if (g2.dataRoutingExists) {
    const wsRouting = generateSheetDataRouting(g2);
    XLSX.utils.book_append_sheet(wb, wsRouting, 'Data Routing');
  }

  // 3. SHEET: Start & Finish
  const wsSF = generateSheetStartFinish(
    g5.startFinishRows,
    g5.totalDurationStr,
    g5.routeReviewRows
  );
  XLSX.utils.book_append_sheet(wb, wsSF, 'Start & Finish');

  // 4. SHEET: Route Review
  XLSX.utils.book_append_sheet(wb, wsRR, 'Route Review');

  // 5. SHEET: Help
  const wsHelp = generateSheetHelp();
  XLSX.utils.book_append_sheet(wb, wsHelp, 'Help');

  return { wb, fileName: `Data KPI - ${dateFileName} - ${locationName}.xlsx`, hasError: false };
}
