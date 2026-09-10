import { getTasks } from '@/lib/api/mileapp';
import {
  buildDriverMap,
  extractBreadRows,
  generateBreadWorkbook,
} from '@/lib/reportGenerators/reports';
import { toastError, toastSuccess } from '@/lib/toast';
import { formatDateUniversal, isEmpty, toApiDateString } from '@/lib/utils';
import * as XLSX from 'xlsx-js-style';
import { getDatesInRange } from './help';

const getDateParams = (date) => {
  const localStart = new Date(date);
  localStart.setHours(0, 0, 0, 0);
  const localEnd = new Date(date);
  localEnd.setHours(23, 59, 59, 999);
  return {
    timeFrom: toApiDateString(localStart),
    timeTo: toApiDateString(localEnd),
  };
};

export const handleBreadDownload = async ({
  isBulkMode,
  startDate,
  endDate,
  singleDate,
  driverData,
  hubId,
  hubAcronym,
  hubName,
  t,
  setIsLoading,
}) => {
  if (isEmpty(driverData)) {
    toastError(t('common.no_driver'));
    return;
  }
  setIsLoading(true);
  try {
    const driverMap = buildDriverMap(driverData);

    const datesToProcess = isBulkMode
      ? getDatesInRange(startDate, endDate || startDate)
      : [singleDate];
    const allRows = [];

    for (const date of datesToProcess) {
      const { timeFrom, timeTo } = getDateParams(date);

      const tasks = await getTasks({
        hubId: hubId,
        status: 'DONE,ONGOING',
        timeFrom,
        timeTo,
        timeBy: 'startTime',
      });

      const tasksData = !isEmpty(tasks) && Array.isArray(tasks) ? tasks : tasks?.data || [];
      if (isEmpty(tasksData)) continue;

      const dateStr = formatDateUniversal(date, 'DD-MM-YYYY');
      const rows = extractBreadRows(tasksData, driverMap, dateStr);
      allRows.push(...rows);
    }

    if (allRows.length === 0) {
      throw new Error(t('common.no_data'));
    }

    const wb = generateBreadWorkbook(allRows, t);
    let dateLabel = '';
    if (isBulkMode) {
      const startStr = formatDateUniversal(startDate, 'DD.MM.YYYY');
      const endStr = endDate ? formatDateUniversal(endDate, 'DD.MM.YYYY') : startStr;
      dateLabel = startStr === endStr ? startStr : `${startStr} - ${endStr}`;
    } else {
      dateLabel = formatDateUniversal(singleDate, 'DD.MM.YYYY');
    }

    const locationName = hubAcronym || hubName;
    const fileName = `${t('report.bread_report')} - ${dateLabel} - ${locationName}.xlsx`;

    XLSX.writeFile(wb, fileName);
    toastSuccess(t('common.toast.success'));
  } catch (error) {
    toastError(t('common.toast.error', { err: error.message }));
  } finally {
    setIsLoading(false);
  }
};
