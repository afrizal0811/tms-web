import { formatDateUniversal } from '@/lib/utils';
import * as XLSX from 'xlsx-js-style';
import { parseDeliveryData, parseRoutingData } from './parsers';
import {
  buildDistanceSummary,
  buildHelpSheet,
  buildPendingSOSheet,
  buildRoutingDateSheet,
  buildRoVsRealSheet,
  buildTimeDriverSheet,
  buildTruckDetailSheet,
  buildTruckUsageSheet,
  buildUpdateLonglatSheet,
} from './sheet';

export async function generateAutoReportWorkbook({
  driverData,
  filteredResults,
  allTasks,
  timeData,
  mappingsObj,
  vehicleTypes,
  targetRoutingStr,
  selectedDateString,
  hubLabel,
  hasPendingGR,
  t,
}) {
  const wb = XLSX.utils.book_new();

  const { routingMap, truckUsageCount } = parseRoutingData(
    filteredResults || [],
    driverData,
    mappingsObj,
    vehicleTypes,
    allTasks || [],
    selectedDateString
  );

  const { deliveryMap, hubTimesMap, allTaskDataForSequence, updateLonglatData, pendingSOData } =
    parseDeliveryData(
      allTasks || [],
      driverData,
      filteredResults,
      hasPendingGR,
      selectedDateString
    );

  buildRoutingDateSheet(wb, targetRoutingStr, t);
  buildTimeDriverSheet(wb, timeData, t, driverData);
  buildTruckDetailSheet(wb, driverData, routingMap, deliveryMap, t);
  buildRoVsRealSheet(wb, allTaskDataForSequence, hubTimesMap, t);
  buildTruckUsageSheet(wb, truckUsageCount, vehicleTypes, t);
  buildDistanceSummary(wb, driverData, routingMap, timeData, t);
  buildPendingSOSheet(wb, pendingSOData, hasPendingGR, t);
  buildUpdateLonglatSheet(wb, updateLonglatData, t);
  buildHelpSheet(wb, filteredResults || [], t);

  const formattedDate = formatDateUniversal(selectedDateString, 'DD.MM.YYYY');
  const excelFileName = `${t('report.daily_report')} - ${formattedDate} - ${hubLabel}.xlsx`;

  return { wb, excelFileName };
}
