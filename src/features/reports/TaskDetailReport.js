'use client';

import Button from '@/components/Button';
import CustomDatePicker from '@/components/CustomDatePicker';
import ConfirmModal from '@/components/modal/ConfirmModal';
import { useLanguage } from '@/context/LanguageContext';
import { getLocationHistories, getResult, getTasks } from '@/lib/api';
import { getOrFetchDriverData } from '@/lib/driverDataHelper';
import { getCachedHubs, getLocalStorage } from '@/lib/localStorageHandler';
import { toastError, toastSuccess } from '@/lib/toastHelper';
import {
  calculateHaversineDistance,
  calculateStartFinishDates,
  formatDateUniversal,
  formatTimestampToDDMMYYYY_UTC7,
  formatTimestampToQuotedHHMM_UTC7,
  formatToApiUtc,
  isEmpty,
  normalizeEmail,
  tomorrowDate,
} from '@/lib/utils';
import JSZip from 'jszip';
import { useState } from 'react';
import * as XLSX from 'xlsx-js-style';
import { taskDetailHeaders, taskDetailKeyMapping } from './helper/constants';
import { getDatesInRange } from './helper/help';

const getNameValue = (val) => {
  if (!val) return '';
  if (Array.isArray(val)) {
    return val
      .map((v) => (v && typeof v === 'object' ? v.name : String(v)))
      .filter(Boolean)
      .join(', ');
  }
  if (typeof val === 'object') {
    return val.name || '';
  }
  return String(val);
};

const sanitizeCell = (val) => {
  if (val === undefined || val === null || val === '') return '-';
  let strVal = typeof val === 'string' ? val : String(val);
  strVal = strVal.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F-\x9F]/g, '');
  if (strVal.length > 32000) {
    return strVal.substring(0, 32000) + '...';
  }
  return strVal;
};

const getVal = (obj, header) => {
  if (header === 'List Product') return '-';

  const key = taskDetailKeyMapping[header];
  let val = obj[key];

  if (header === 'hub') val = obj.hub?.name || obj.hub;
  else if (header === 'assignedTo') val = obj.assignedTo?.name || obj.assignedTo;
  else if (header === 'assignedVehicle') val = obj.assignedVehicle?.name || obj.assignedVehicle;

  if (val === undefined || val === null || val === '') return '-';

  if (header === 'doneTime' && val !== '-') {
    return formatDateUniversal(val, 'DD/MM/YYYY HH:mm');
  }

  if (Array.isArray(val)) {
    if (val.length === 0) return '-';
    val = val
      .map((v) => (v && typeof v === 'object' ? v.name || JSON.stringify(v) : String(v)))
      .join(', ');
  } else if (typeof val === 'object') {
    val = val.name || JSON.stringify(val);
  }

  return sanitizeCell(val);
};

const getReportDates = (start, end) => {
  const localStart = new Date(start);
  localStart.setHours(0, 0, 0, 0);

  const validEndDate = end ? new Date(end) : new Date(start);
  validEndDate.setHours(23, 59, 59, 999);

  const timeFromUtc = formatToApiUtc(localStart);
  const timeToUtc = formatToApiUtc(validEndDate);

  const startString = formatDateUniversal(localStart);
  const endString = formatDateUniversal(validEndDate);

  const { timeFrom: locTimeFrom } = calculateStartFinishDates(startString);
  const { timeTo: locTimeTo } = calculateStartFinishDates(endString);

  return { timeFromUtc, timeToUtc, locTimeFrom, locTimeTo, selectedDateString: startString };
};

const buildRoutingMap = (routingResults) => {
  const routingMap = {};
  routingResults.forEach((res) => {
    const routingData = res?.data?.result?.routing || res?.result?.routing || [];
    routingData.forEach((route) => {
      const assigneeEmail = normalizeEmail(route.assignee);
      if (!assigneeEmail) return;

      const hubTrips = (route.trips || []).filter((trip) => trip.isHub === true);

      if (hubTrips.length > 0) {
        routingMap[assigneeEmail] = {
          startHub: hubTrips[0],
          endHub: hubTrips[hubTrips.length - 1],
        };
      }
    });
  });
  return routingMap;
};

const groupTasksByDriver = (tasksData) => {
  const groupedData = {};
  tasksData.forEach((task) => {
    const driverNameRaw = getNameValue(task.assignedTo) || getNameValue(task.assignee) || 'UNKNOWN';

    let driverName = driverNameRaw
      .replace(/[\\/?*[\]:']/g, '')
      .replace(/[\x00-\x1F\x7F-\x9F]/g, '')
      .trim()
      .toUpperCase()
      .substring(0, 31);

    if (!driverName || driverName === 'HISTORY') {
      driverName = 'UNKNOWN_DATA';
    }

    if (!groupedData[driverName]) {
      groupedData[driverName] = [];
    }
    groupedData[driverName].push(task);
  });
  return groupedData;
};

function checkShiftMidpoint(rawStart, rawFinish, shift) {
  if (!shift || !shift.startTime || !shift.endTime) return true;
  if (!rawStart || !rawFinish) return false;

  try {
    const safeStart = rawStart.replace(' ', 'T') + 'Z';
    const safeFinish = rawFinish.replace(' ', 'T') + 'Z';

    const startMs = new Date(safeStart).getTime();
    const finishMs = new Date(safeFinish).getTime();

    if (isNaN(startMs) || isNaN(finishMs)) return false;

    const durationHours = (finishMs - startMs) / (1000 * 60 * 60);
    if (durationHours >= 14) {
      return true;
    }

    const midpointMs = startMs + (finishMs - startMs) / 2;
    const midpointDate = new Date(midpointMs);

    const [sH, sM] = shift.startTime.split(':').map(Number);
    const [eH, eM] = shift.endTime.split(':').map(Number);

    const shiftStart = new Date(midpointDate);
    shiftStart.setUTCHours((sH || 0) - 7, sM || 0, 0, 0);

    const shiftEnd = new Date(midpointDate);
    shiftEnd.setUTCHours((eH || 0) - 7, eM || 0, 0, 0);

    if (shift.multiday >= 1 || shiftEnd <= shiftStart) {
      shiftEnd.setUTCDate(shiftEnd.getUTCDate() + 1);
    }

    return midpointMs >= shiftStart.getTime() && midpointMs <= shiftEnd.getTime();
  } catch (e) {
    return true;
  }
}

const buildSyncTimeMap = (locHistories, driverData, selectedDateStr) => {
  const apiDataMap = new Map();
  const allApiData = locHistories?.tasks?.data || locHistories?.data || [];
  if (!Array.isArray(allApiData) || allApiData.length === 0) return apiDataMap;

  const [y, m, d] = selectedDateStr.split('-');
  const targetDateFormatted = `${d}-${m}-${y}`;

  const emailToDriverMap = (driverData || []).reduce((acc, driver) => {
    const normalizedEmail = normalizeEmail(driver.email);
    if (normalizedEmail) {
      acc[normalizedEmail] = { workingTime: driver.workingTime };
    }
    return acc;
  }, {});

  const processed = allApiData.map((item) => {
    const email = normalizeEmail(item.email);
    const startTime = item.startTime;
    const finishTime = item.finish?.finishTime;
    const startDate = formatTimestampToDDMMYYYY_UTC7(startTime);

    return {
      email,
      trackedTime: Math.abs(item.trackedTime || 0),
      totalDistance: item.finish?.totalDistance || 0,
      startDate,
      workingTime: emailToDriverMap[email]?.workingTime || null,
      rawStartTime: startTime,
      rawFinishTime: finishTime,
    };
  });

  const filtered = processed.filter(
    (item) =>
      item.trackedTime >= 10 && item.totalDistance > 5 && item.startDate === targetDateFormatted
  );

  const grouped = {};
  filtered.forEach((item) => {
    if (!grouped[item.email]) grouped[item.email] = [];
    grouped[item.email].push(item);
  });

  for (const [email, records] of Object.entries(grouped)) {
    const uniqueRecords = records.filter(
      (value, index, self) =>
        index ===
        self.findIndex(
          (t) =>
            t.rawStartTime === value.rawStartTime &&
            t.rawFinishTime === value.rawFinishTime &&
            t.totalDistance === value.totalDistance
        )
    );

    let finalRecord = uniqueRecords[0];

    if (uniqueRecords.length > 1) {
      const filteredByShift = uniqueRecords.filter((r) =>
        checkShiftMidpoint(r.rawStartTime, r.rawFinishTime, r.workingTime)
      );

      if (filteredByShift.length > 0) {
        filteredByShift.sort((a, b) => {
          const safeA = a.rawStartTime.replace(' ', 'T');
          const safeB = b.rawStartTime.replace(' ', 'T');
          return new Date(safeA) - new Date(safeB);
        });
        finalRecord = filteredByShift[0];
      }
    }

    if (finalRecord) {
      apiDataMap.set(email, finalRecord);
    }
  }

  return apiDataMap;
};

const generateWorkbook = (groupedData, timeMap, routingMap, hubCoordsStr) => {
  const wb = XLSX.utils.book_new();
  const headerStyle = {
    font: { bold: true, color: { rgb: 'FFFFFF' } },
    fill: { patternType: 'solid', fgColor: { rgb: '0369A1' } },
    alignment: { horizontal: 'center', vertical: 'center' },
  };

  const hubCol = taskDetailHeaders.indexOf('hub');
  const assignedToCol = taskDetailHeaders.indexOf('assignedTo');
  const statusCol = taskDetailHeaders.indexOf('status');
  const doneTimeCol = taskDetailHeaders.indexOf('doneTime');
  const etaCol = taskDetailHeaders.indexOf('eta');
  const etdCol = taskDetailHeaders.indexOf('etd');
  const distanceCol = taskDetailHeaders.indexOf('distance');
  const travelDistanceCol = taskDetailHeaders.indexOf('travelDistance');

  const sheetData = [taskDetailHeaders];

  Object.keys(groupedData)
    .sort()
    .forEach((driverName) => {
      const driverTasks = groupedData[driverName];

      driverTasks.sort((a, b) => {
        const timeA = a.doneTime ? new Date(a.doneTime).getTime() : 0;
        const timeB = b.doneTime ? new Date(b.doneTime).getTime() : 0;
        return timeA - timeB;
      });

      const firstTask = driverTasks[0];
      const lastTask = driverTasks[driverTasks.length - 1];

      let driverEmail = '';
      if (firstTask.assignee) {
        driverEmail = Array.isArray(firstTask.assignee)
          ? firstTask.assignee[0]
          : firstTask.assignee;
      }

      const normalizedDriverEmail = normalizeEmail(driverEmail);
      const timeData = timeMap.get(normalizedDriverEmail);
      const routeInfo = routingMap[normalizedDriverEmail];

      const doneCoord = lastTask?.doneCoordinate;
      let returnHubDistanceMeters = '-';

      if (doneCoord && hubCoordsStr) {
        const rawDistance = calculateHaversineDistance(doneCoord, hubCoordsStr);
        if (rawDistance !== null) {
          returnHubDistanceMeters = Math.round(rawDistance * 1.3);
        }
      }

      const hubStartRow = taskDetailHeaders.map(() => null);
      const hubEndRow = taskDetailHeaders.map(() => null);
      const assignedToVal = getVal(firstTask, 'assignedTo');

      hubStartRow[hubCol] = 'HUB';
      hubStartRow[assignedToCol] = assignedToVal !== '-' ? assignedToVal : '-';
      hubStartRow[etdCol] = routeInfo?.startHub?.etd ? routeInfo.startHub.etd : '-';
      hubStartRow[statusCol] = null;

      if (timeData && timeData.rawStartTime) {
        const dateFormatted = formatTimestampToDDMMYYYY_UTC7(timeData.rawStartTime).replace(
          /-/g,
          '/'
        );
        const timeFormatted = formatTimestampToQuotedHHMM_UTC7(timeData.rawStartTime).replace(
          "'",
          ''
        );
        hubStartRow[doneTimeCol] = `${dateFormatted} ${timeFormatted}`;
      } else {
        hubStartRow[doneTimeCol] = '-';
      }

      hubEndRow[hubCol] = 'HUB';
      hubEndRow[assignedToCol] = assignedToVal !== '-' ? assignedToVal : '-';
      hubEndRow[etaCol] = routeInfo?.endHub?.eta ? routeInfo.endHub.eta : '-';
      hubEndRow[distanceCol] = routeInfo?.endHub?.distance ?? '-';
      hubEndRow[travelDistanceCol] = returnHubDistanceMeters;
      hubEndRow[statusCol] = null;

      if (timeData && timeData.rawFinishTime) {
        const dateFormatted = formatTimestampToDDMMYYYY_UTC7(timeData.rawFinishTime).replace(
          /-/g,
          '/'
        );
        const timeFormatted = formatTimestampToQuotedHHMM_UTC7(timeData.rawFinishTime).replace(
          "'",
          ''
        );

        let diffDisplay = '';
        const sDateStr = formatTimestampToDDMMYYYY_UTC7(timeData.rawStartTime);
        const fDateStr = formatTimestampToDDMMYYYY_UTC7(timeData.rawFinishTime);

        if (sDateStr !== fDateStr) {
          const sDate = new Date(timeData.rawStartTime.replace(' ', 'T') + 'Z');
          const fDate = new Date(timeData.rawFinishTime.replace(' ', 'T') + 'Z');
          sDate.setTime(sDate.getTime() + 7 * 60 * 60 * 1000);
          fDate.setTime(fDate.getTime() + 7 * 60 * 60 * 1000);

          const d1 = new Date(sDate.getUTCFullYear(), sDate.getUTCMonth(), sDate.getUTCDate());
          const d2 = new Date(fDate.getUTCFullYear(), fDate.getUTCMonth(), fDate.getUTCDate());
          const diffDays = Math.floor((d2 - d1) / (1000 * 60 * 60 * 24));

          if (diffDays > 0) {
            diffDisplay = ` (+${diffDays})`;
          }
        }

        hubEndRow[doneTimeCol] = `${dateFormatted} ${timeFormatted}${diffDisplay}`;
      } else {
        hubEndRow[doneTimeCol] = '-';
      }

      sheetData.push(hubStartRow);

      driverTasks.forEach((task) => {
        const row = taskDetailHeaders.map((header) => getVal(task, header));
        sheetData.push(row);
      });

      sheetData.push(hubEndRow);
    });

  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  const range = XLSX.utils.decode_range(ws['!ref']);

  for (let R = 0; R <= range.e.r; ++R) {
    const isHubRow = R > 0 && sheetData[R][hubCol] === 'HUB';

    for (let C = 0; C <= range.e.c; ++C) {
      const cell_address = XLSX.utils.encode_cell({ r: R, c: C });
      if (!ws[cell_address]) continue;

      if (R === 0) {
        ws[cell_address].s = headerStyle;
      } else {
        const val = ws[cell_address].v;
        let style = {};

        if (val === '-') {
          style.alignment = { horizontal: 'center', vertical: 'center' };
        }

        if (isHubRow && val !== null && val !== undefined) {
          style.font = { bold: true, color: { rgb: 'FF0000' } };
        }

        if (Object.keys(style).length > 0) {
          ws[cell_address].s = style;
        }
      }
    }
  }

  ws['!cols'] = taskDetailHeaders.map(() => ({ wch: 18 }));

  XLSX.utils.book_append_sheet(wb, ws, 'Task Detail');

  return wb;
};

export default function TaskDetailReport() {
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [isLoading, setIsLoading] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const { t } = useLanguage();

  const executeProcess = async () => {
    setIsLoading(true);
    setShowWarningModal(false);
    try {
      const { storedLocation, storedLocationName, storedLocationAcronym } = getLocalStorage();
      const driverData = await getOrFetchDriverData(storedLocation);

      const hubsList = getCachedHubs() || [];
      const activeHub = hubsList.find((h) => h._id === storedLocation);
      const hubCoordsStr =
        activeHub?.lat && activeHub?.lng ? `${activeHub.lat},${activeHub.lng}` : null;

      const datesToProcess = getDatesInRange(startDate, endDate || startDate);
      const generatedFiles = [];

      for (const date of datesToProcess) {
        const { timeFromUtc, timeToUtc, locTimeFrom, locTimeTo, selectedDateString } =
          getReportDates(date, date);

        const [tasks, locHistories] = await Promise.all([
          getTasks({
            hubId: storedLocation,
            status: 'DONE,ONGOING',
            timeFrom: timeFromUtc,
            timeTo: timeToUtc,
            timeBy: 'startTime',
            limit: 1000,
          }),
          getLocationHistories({
            timeFrom: locTimeFrom,
            timeTo: locTimeTo,
            limit: 5000,
            startFinish: 'true',
            fields: 'finish,startTime,email,trackedTime,totalDistance',
            timeBy: 'createdTime',
          }),
        ]);

        const tasksData = !isEmpty(tasks) && Array.isArray(tasks) ? tasks : tasks?.data || [];
        if (isEmpty(tasksData)) continue;

        const uniqueRoutingIds = [
          ...new Set(tasksData.map((task) => task.routingResultId).filter(Boolean)),
        ];

        const routingResults = await Promise.all(uniqueRoutingIds.map((id) => getResult(id)));
        const routingMap = buildRoutingMap(routingResults);

        const timeMap = buildSyncTimeMap(locHistories, driverData, selectedDateString);
        const groupedData = groupTasksByDriver(tasksData);

        const wb = generateWorkbook(groupedData, timeMap, routingMap, hubCoordsStr);

        const dateStr = formatDateUniversal(date, 'DD.MM.YYYY');
        const locationName = storedLocationAcronym || storedLocationName;
        const fileName = `${t('report.task_detail_report')} - ${dateStr} - ${locationName}.xlsx`;

        const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });

        generatedFiles.push({ fileName, wb, wbout });
      }

      if (generatedFiles.length === 0) {
        throw new Error(t('common.no_data'));
      }

      if (generatedFiles.length === 1) {
        XLSX.writeFile(generatedFiles[0].wb, generatedFiles[0].fileName);
      } else {
        const zip = new JSZip();
        generatedFiles.forEach((file) => {
          zip.file(file.fileName, file.wbout);
        });

        const content = await zip.generateAsync({ type: 'blob' });
        const startFormat = formatDateUniversal(startDate, 'DD-MM-YYYY');
        const endFormat = endDate ? formatDateUniversal(endDate, 'DD.MM.YYYY') : startFormat;
        const fileNameDate =
          startFormat === endFormat ? startFormat : `${startFormat} to ${endFormat}`;
        const locationName = storedLocationAcronym || storedLocationName;

        const zipUrl = URL.createObjectURL(content);
        const link = document.createElement('a');
        link.href = zipUrl;
        link.download = `${t('report.task_detail_report')} - ${fileNameDate} - ${locationName}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(zipUrl);
      }

      toastSuccess(t('common.toast.success'));
    } catch (error) {
      toastError(t('common.toast.error', { err: error.message }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleProcess = () => {
    if (!startDate) {
      toastError('Silakan pilih tanggal terlebih dahulu.');
      return;
    }

    const validEndDate = endDate || startDate;

    const diffTime = Math.abs(validEndDate - startDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > 14) {
      setShowWarningModal(true);
    } else {
      executeProcess();
    }
  };

  const handleDateChange = (dates) => {
    const [start, end] = dates;
    if (isEmpty(start) && isEmpty(start)) {
      toastError(t('report.toast.select_date'));
      return;
    }
    setStartDate(start);
    setEndDate(end);
  };

  return (
    <div className="flex flex-col items-center w-full max-w-6xl p-4">
      <h1 className="text-3xl sm:text-4xl font-bold mb-8 text-center text-slate-900 dark:text-slate-100">
        {t('report.task_detail_report')}
      </h1>

      <div className="flex flex-col sm:flex-row justify-center items-center sm:items-start gap-6 sm:gap-12 mb-10 w-full">
        <div className="flex flex-col items-center w-full max-w-xs">
          <label
            htmlFor="detailDate"
            className="text-lg mb-2 text-gray-500 dark:text-slate-400 font-medium text-center select-none"
          >
            {t('common.range_delivery')}
          </label>
          <CustomDatePicker
            className="max-w-xs cursor-pointer"
            disabled={isLoading}
            id="detailDate"
            selectsRange
            startDate={startDate}
            endDate={endDate}
            onChange={handleDateChange}
            maxDate={tomorrowDate(true)}
          />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 w-full justify-center">
        <Button
          onClick={handleProcess}
          disabled={isLoading}
          isLoading={isLoading}
          text={t('common.download')}
          width="w-full sm:w-64"
        />
      </div>

      <ConfirmModal
        isOpen={showWarningModal}
        title={t('common.modal.data_load_title')}
        message={t('common.modal.data_load_message', { days: 14 })}
        onConfirm={executeProcess}
        onCancel={() => setShowWarningModal(false)}
      />
    </div>
  );
}
