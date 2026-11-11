import { formatDateUniversal } from '@/lib/utils';
import * as XLSX from 'xlsx-js-style';
import { computeKpiMetrics } from './sections';
import { generateSheetDataKPI, generateSheetPendingSO } from './sheets';

export function generateKpiWorkbook({
  kpiRecords = [],
  tasksData = [],
  driverData = [],
  fallbackDate = null,
}) {
  const { ws: wsPendingSO, incompleteDates } = generateSheetPendingSO(
    tasksData,
    driverData,
    fallbackDate
  );

  const annotatedRecords = kpiRecords.map((rec) => {
    const recDate = formatDateUniversal(rec.date, 'YYYY-MM-DD');
    return {
      ...rec,
      hasIncompletePendingDetail:
        Boolean(rec.hasIncompletePendingDetail) || incompleteDates.has(recDate),
    };
  });

  const wb = XLSX.utils.book_new();

  if (annotatedRecords.length > 0) {
    const wsKPI = generateSheetDataKPI(annotatedRecords);
    XLSX.utils.book_append_sheet(wb, wsKPI, 'Data KPI');
  }

  if (wsPendingSO) {
    XLSX.utils.book_append_sheet(wb, wsPendingSO, 'Faktur Pending');
  }

  return {
    wb,
    hasKpiRows: annotatedRecords.length > 0,
    hasIncompletePending: Boolean(wsPendingSO),
  };
}

export function generateManualKpiWorkbook({
  selectedDate,
  locationName,
  driverData,
  resultsData,
  tasksData,
  historiesData,
}) {
  const dateIso = formatDateUniversal(selectedDate, 'YYYY-MM-DD');
  const dateFileName = formatDateUniversal(selectedDate, 'DD.MM.YYYY');

  const { g1, kpiDataPayload } = computeKpiMetrics({
    resultsData,
    taskList: tasksData,
    historiesData,
    driverData,
  });

  const manualRecord = {
    ...kpiDataPayload,
    date: dateIso,
    hasIncompletePendingDetail: Boolean(g1.hasIncompletePendingDetail),
  };

  const { wb, hasIncompletePending } = generateKpiWorkbook({
    kpiRecords: [manualRecord],
    tasksData,
    driverData,
    fallbackDate: dateIso,
  });

  const fileName = locationName
    ? `Manual KPI - ${dateFileName} - ${locationName}.xlsx`
    : `Manual KPI - ${dateFileName}.xlsx`;

  return { wb, fileName, hasIncompletePending };
}
