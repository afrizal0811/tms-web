import { formatDateUniversal } from '@/lib/utils';
import * as XLSX from 'xlsx-js-style';
import {
  buildHelpSheet,
  buildMergedDetailSheet,
  buildPendingSOSheet,
  buildRekapPerjalananSheet,
  buildRoVsRealSheet,
  buildStartFinishSheet,
  buildTanggalRoutingSheet,
  buildTruckUsageSheet,
  buildUpdateLonglatSheet,
} from './builders';
import { parseDeliveryData, parseRoutingData, parseTimeData } from './parsers';

export async function generateAutoReportWorkbook({
  driverData,
  filteredResults,
  allTasks,
  allApiData,
  mappingsObj,
  vehicleTypes,
  targetRoutingStr,
  selectedDateString,
  hubLabel,
  hasPendingGR,
  t,
}) {
  const wb = XLSX.utils.book_new();

  // 1. Ekstraksi dan Pengolahan Data Paralel
  const { routingMap, distanceTotals, truckUsageCount } = parseRoutingData(
    filteredResults || [],
    driverData,
    mappingsObj,
    vehicleTypes
  );

  const { deliveryMap, hubTimesMap, allTaskDataForSequence, updateLonglatData, pendingSOData } =
    parseDeliveryData(
      allTasks || [],
      driverData,
      filteredResults,
      hasPendingGR,
      selectedDateString
    );

  const { timeDataObjects } = parseTimeData(allApiData || [], driverData, selectedDateString);

  buildTanggalRoutingSheet(wb, targetRoutingStr, t);
  buildStartFinishSheet(wb, timeDataObjects, t);
  buildMergedDetailSheet(wb, driverData, routingMap, deliveryMap);
  buildRoVsRealSheet(wb, allTaskDataForSequence, hubTimesMap, driverData, hasPendingGR, t);
  buildTruckUsageSheet(wb, truckUsageCount, vehicleTypes, t);
  buildRekapPerjalananSheet(wb, driverData, routingMap, timeDataObjects);
  buildPendingSOSheet(wb, pendingSOData, hasPendingGR, t);
  buildUpdateLonglatSheet(wb, updateLonglatData, t);
  buildHelpSheet(wb, filteredResults || [], t);

  const formattedDate = formatDateUniversal(selectedDateString, 'DD.MM.YYYY');
  const excelFileName = `${t('common.report')} - ${formattedDate} - ${hubLabel}.xlsx`;

  return { wb, excelFileName };
}
