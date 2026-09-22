import { getLocationHistories, getResult, getResultHistories, getTasks } from '@/lib/api/mileapp';
import { getCachedHubs, getLocalStorage } from '@/lib/localStorageHandler';
import { convertLocationHistories } from '@/lib/reportGenerators/helper';
import {
  buildRoutingMap,
  buildSyncTimeMap,
  generateTaskDetailWorkbook,
  generateTaskManualDetailWorkbook,
  groupTasksByDriver,
} from '@/lib/reportGenerators/reports';
import { toastError, toastSuccess } from '@/lib/toast';
import {
  calculateMinuteDifference,
  calculateStartFinishDates,
  formatDateUniversal,
  formatUTC7,
  getBasePlate,
  isEmpty,
  normalizeEmail,
  parseCustomerString,
  toApiDateString,
} from '@/lib/utils';
import * as XLSX from 'xlsx-js-style';
import {
  serviceLevelHeaders,
  taskHeaders,
  taskKeyMapping,
  taskManualHeaders,
  taskManualKeyMapping,
  tripActivityHeaders,
} from './constants';
import { bulkExcelDownloader, bulkZipDownloader, getDatesInRange } from './help';

const normalizeTasksData = (tasks) =>
  !isEmpty(tasks) && Array.isArray(tasks) ? tasks : tasks?.data || [];

const getReportDates = (start, end) => {
  const localStart = new Date(start);
  localStart.setHours(0, 0, 0, 0);

  const validEndDate = end ? new Date(end) : new Date(start);
  validEndDate.setHours(23, 59, 59, 999);

  const timeFromUtc = toApiDateString(localStart);
  const timeToUtc = toApiDateString(validEndDate);

  const startString = formatDateUniversal(localStart);
  const endString = formatDateUniversal(validEndDate);

  const { timeFrom: locTimeFrom } = calculateStartFinishDates(startString);
  const { timeTo: locTimeTo } = calculateStartFinishDates(endString);

  return { timeFromUtc, timeToUtc, locTimeFrom, locTimeTo, selectedDateString: startString };
};

export const handleCustomDownload = async ({
  isBulkMode,
  bulkFormat = 'zip',
  startDate,
  endDate,
  singleDate,
  driverData,
  hubId,
  hubAcronym,
  hubName,
  t,
  setIsLoading,
  reportType,
}) => {
  if (isEmpty(driverData)) {
    toastError(t('common.no_driver'));
    return;
  }
  setIsLoading(true);
  try {
    const locationName = hubAcronym || hubName;

    const reportTypeConfig = {
      detail: { process: processTaskRoutingReport, title: t('report.custom.task_routing') },
      manual: { process: processTaskManualReport, title: t('report.custom.task_manual') },
      service_level: {
        process: processServiceLevelReport,
        title: t('report.custom.service_level'),
      },
      trip_activity: {
        process: processTripActivityReport,
        title: t('report.custom.trip_activity'),
      },
    };

    const config = reportTypeConfig[reportType];
    if (!config) throw new Error('Invalid report type');

    if (isBulkMode) {
      if (!startDate || !endDate) throw new Error(t('common.invalid_date'));
      if (endDate < startDate)
        throw new Error('Tanggal akhir tidak boleh kurang dari tanggal awal.');

      if (bulkFormat === 'xls') {
        await bulkExcelDownloader({
          startDate,
          endDate,
          locationName,
          title: config.title,
          setIsLoading,
          t,
          fetchFilesCallback: async () => {
            const datesToProcess = getDatesInRange(startDate, endDate || startDate);
            return await config.process({ hubId, datesToProcess, locationName, t, driverData });
          },
        });
      } else {
        await bulkZipDownloader({
          startDate,
          endDate,
          driverData,
          zipPrefix: `${config.title} (${t('common.bulk')})`,
          setIsLoading,
          processDateCallback: async ({ dateObj }) => {
            const files = await config.process({
              hubId,
              datesToProcess: [dateObj],
              locationName,
              t,
              driverData,
            });
            if (files.length === 0) return { error: true };
            return { wb: files[0].wb, excelFileName: files[0].fileName };
          },
          t,
        });
      }
    } else {
      const files = await config.process({
        hubId,
        datesToProcess: [singleDate],
        locationName,
        t,
        driverData,
      });
      if (files.length === 0) throw new Error(t('common.no_data'));
      XLSX.writeFile(files[0].wb, files[0].fileName);
      toastSuccess(t('common.toast.success'));
    }
  } catch (error) {
    toastError(t('common.toast.error', { err: error.message }), error);
  } finally {
    if (!isBulkMode) setIsLoading(false);
  }
};

export const processTaskRoutingReport = async ({
  hubId,
  datesToProcess,
  locationName,
  t,
  driverData,
}) => {
  const { storedLocation } = getLocalStorage();
  const hubsList = getCachedHubs() || [];
  const activeHub = hubsList.find((h) => h._id === storedLocation);
  const hubCoordsStr =
    activeHub?.lat && activeHub?.lng ? `${activeHub.lat},${activeHub.lng}` : null;

  const generatedFiles = [];

  for (const date of datesToProcess) {
    const { timeFromUtc, timeToUtc, locTimeFrom, locTimeTo, selectedDateString } = getReportDates(
      date,
      date
    );

    const [tasks, locHistories] = await Promise.all([
      getTasks({
        hubId: hubId,
        status: 'DONE,ONGOING',
        timeFrom: timeFromUtc,
        timeTo: timeToUtc,
        isNeedFields: false,
      }),
      getLocationHistories({
        timeFrom: locTimeFrom,
        timeTo: locTimeTo,
      }),
    ]);

    const tasksData = normalizeTasksData(tasks);
    if (isEmpty(tasksData)) continue;

    const uniqueRoutingIds = [
      ...new Set(tasksData.map((task) => task.routingResultId).filter(Boolean)),
    ];

    const routingResults = await Promise.all(uniqueRoutingIds.map((id) => getResult(id)));
    const routingMap = buildRoutingMap(routingResults);

    const timeMap = buildSyncTimeMap(locHistories, driverData, selectedDateString);
    const groupedData = groupTasksByDriver(tasksData);

    const wb = generateTaskDetailWorkbook(
      groupedData,
      timeMap,
      routingMap,
      hubCoordsStr,
      taskHeaders,
      taskKeyMapping
    );

    const dateStr = formatDateUniversal(date, 'DD.MM.YYYY');
    const fileName = `${t('report.custom.task_routing')} - ${dateStr} - ${locationName}.xlsx`;
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });

    generatedFiles.push({ fileName, wb, wbout });
  }

  return generatedFiles;
};

export const processTaskManualReport = async ({ hubId, datesToProcess, locationName, t }) => {
  const generatedFiles = [];

  for (const date of datesToProcess) {
    const { timeFromUtc, timeToUtc } = getReportDates(date, date);

    const tasks = await getTasks({
      hubId: hubId,
      status: 'DONE,ONGOING',
      timeFrom: timeFromUtc,
      timeTo: timeToUtc,
      isNeedFields: false,
    });

    const tasksData = normalizeTasksData(tasks);
    if (isEmpty(tasksData)) continue;

    const uniqueRoutingIds = [
      ...new Set(tasksData.map((task) => task.routingResultId).filter(Boolean)),
    ];

    const historiesRes =
      uniqueRoutingIds.length > 0 ? await getResultHistories(uniqueRoutingIds) : [];

    const overrideTaskMap = new Map();
    (historiesRes || []).forEach((item) => {
      (item.history || []).forEach((h) => {
        ['move', 'dropped', 'switch', 'change', 'manual'].forEach((key) => {
          (h[key]?.data || []).forEach((m) => {
            const ver = Number(m.version) || 0;

            let targetVisits = m.visits || [];
            if (key === 'change' && m.description) {
              if (m.description.toLowerCase().startsWith('visit ')) {
                const specific = targetVisits.filter(
                  (v) => v.visitName && m.description.includes(v.visitName)
                );
                if (specific.length > 0) targetVisits = specific;
              }
            }

            targetVisits.forEach((v) => {
              if (v.visitId && v.visitId.includes('-')) {
                const tId = v.visitId.substring(v.visitId.indexOf('-') + 1);
                if (!overrideTaskMap.has(tId)) overrideTaskMap.set(tId, []);
                overrideTaskMap.get(tId).push({
                  action: key === 'manual' ? 'manual' : (m.action || key).toLowerCase(),
                  version: ver,
                });
              }
            });
          });
        });
      });
    });

    tasksData.forEach((task) => {
      const taskId = String(task._id || task.id);
      const isUnassigned =
        (!task.eta || task.eta === '-' || task.eta === '') &&
        (!task.etd || task.etd === '-' || task.etd === '') &&
        (!task.routePlannedOrder ||
          task.routePlannedOrder === '-' ||
          task.routePlannedOrder === '');

      if (overrideTaskMap.has(taskId)) {
        task.isManual = true;
        task.manualType = 'Forced Assign';
        const sortedActions = overrideTaskMap
          .get(taskId)
          .sort((a, b) => a.version - b.version)
          .map((item) => item.action);
        task.action = [...new Set(sortedActions)].join(', ');
      } else if (isUnassigned) {
        task.isManual = true;
        task.manualType = 'Manual Assign';
        task.action = '-';
      } else {
        task.isManual = false;
        task.manualType = null;
        task.action = null;
      }
    });

    const groupedData = groupTasksByDriver(tasksData);

    const wb = generateTaskManualDetailWorkbook(
      groupedData,
      taskManualHeaders,
      taskManualKeyMapping,
      historiesRes
    );

    const dateStr = formatDateUniversal(date, 'DD.MM.YYYY');
    const fileName = `${t('report.custom.task_manual')} - ${dateStr} - ${locationName}.xlsx`;
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });

    generatedFiles.push({ fileName, wb, wbout });
  }

  return generatedFiles;
};

export const processServiceLevelReport = async ({
  hubId,
  datesToProcess,
  locationName,
  t,
  driverData,
}) => {
  const generatedFiles = [];
  const driverMap = new Map();
  driverData.forEach((d) => {
    if (d.email) {
      driverMap.set(normalizeEmail(d.email), { name: d.name || '-', plat: d.plat || '-' });
    }
  });

  for (const date of datesToProcess) {
    const { timeFromUtc, timeToUtc, locTimeFrom, locTimeTo, selectedDateString } = getReportDates(
      date,
      date
    );

    const [tasks, locHistories] = await Promise.all([
      getTasks({
        hubId: hubId,
        status: 'DONE,ONGOING',
        timeFrom: timeFromUtc,
        timeTo: timeToUtc,
        isNeedFields: false,
      }),
      getLocationHistories({
        timeFrom: locTimeFrom,
        timeTo: locTimeTo,
      }),
    ]);

    const locationHistoryByDate = (locHistories || []).filter((item) => {
      return item.startTime?.startsWith(selectedDateString);
    });

    const { timeDataObjects } = convertLocationHistories(locationHistoryByDate, driverData);
    const filteredTimeData = timeDataObjects.filter(
      (item) => !isEmpty(item.startTimeFmt) && !isEmpty(item.finishTimeFmt)
    );
    const tasksData = normalizeTasksData(tasks);
    const sheetData = [serviceLevelHeaders];
    const parsedRows = tasksData.map((task) => {
      const { name, id, location, invoiceNumber } = parseCustomerString(task.customerOrder);
      const arrivalSource = task.klikJikaSudahSampai || task.klikJikaAndaSudahSampai;
      const doneSource = task.page3DoneTime || task.doneTime;
      const flow = task.flow || '-';
      const statusDelivery = task.statusDelivery || task.label || '-';
      const created = task.createdTime ? formatUTC7(task.createdTime, 'DD/MM/YYYY HH:mm') : '-';
      const arrived = arrivalSource ? formatUTC7(arrivalSource, 'DD/MM/YYYY HH:mm') : '-';
      const assigned = task.assignedTime ? formatUTC7(task.assignedTime, 'DD/MM/YYYY HH:mm') : '-';
      const completed = doneSource ? formatUTC7(doneSource, 'DD/MM/YYYY HH:mm') : '-';
      let serviceLevel = '-';
      let startTrip = null;
      let driverName = '-';
      let licenseNumber = '-';
      if (task.createdTime && doneSource) {
        const diff = calculateMinuteDifference(task.createdTime, doneSource);
        if (diff !== null) {
          const days = Math.ceil(diff / 1440) || 1;
          serviceLevel = `${days}`;
        }
      }

      const assigneeArray = task.assignee || [];
      const assigneeEmail = Array.isArray(assigneeArray) ? assigneeArray[0] : assigneeArray;

      if (assigneeEmail) {
        const driverHistory = filteredTimeData.find((item) => item.email === assigneeEmail);
        const timeDriver =
          driverHistory?.startDate && driverHistory?.startTimeFmt
            ? `${driverHistory.startDate} ${driverHistory.startTimeFmt}`
            : '-';

        startTrip = !isEmpty(timeDriver)
          ? formatDateUniversal(timeDriver.replace(/-/g, '/'), 'DD/MM/YYYY HH:mm')
          : '-';

        const d = driverMap.get(normalizeEmail(assigneeEmail));
        if (d) {
          driverName = d.name;
          licenseNumber = getBasePlate(d.plat);
        }
      }

      return {
        row: [
          flow,
          driverName,
          licenseNumber,
          name || '-',
          id || '-',
          location || '-',
          invoiceNumber || '-',
          statusDelivery || '-',
          created,
          assigned,
          startTrip,
          arrived,
          completed,
          serviceLevel,
        ],
        driverName,
        rawCompleted: task.doneTime || '',
      };
    });

    parsedRows.sort((a, b) => {
      const driverCmp = a.driverName.localeCompare(b.driverName);
      if (driverCmp !== 0) return driverCmp;
      return a.rawCompleted.localeCompare(b.rawCompleted);
    });
    parsedRows.forEach((item) => sheetData.push(item.row));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(sheetData);

    const range = XLSX.utils.decode_range(ws['!ref']);
    for (let R = 0; R <= range.e.r; ++R) {
      for (let C = 0; C <= range.e.c; ++C) {
        const cell_address = XLSX.utils.encode_cell({ r: R, c: C });
        if (ws[cell_address]) {
          if (R === 0) {
            ws[cell_address].s = {
              font: { bold: true, color: { rgb: 'FFFFFF' } },
              fill: { patternType: 'solid', fgColor: { rgb: '0369A1' } },
              alignment: { horizontal: 'center', vertical: 'center' },
            };

            if (C === 13) {
              ws[cell_address].c = [{ a: 'System', t: 'Completed Time - Created Time' }];
            }
          } else {
            const isLeft = C === 1 || C === 3 || C === 6;
            ws[cell_address].s = {
              alignment: { horizontal: isLeft ? 'left' : 'center', vertical: 'center' },
            };
          }
        }
      }
    }
    ws['!cols'] = serviceLevelHeaders.map(() => ({ wch: 20 }));

    XLSX.utils.book_append_sheet(wb, ws, 'Task Date');

    const dateStr = formatDateUniversal(date, 'DD.MM.YYYY');
    const fileName = `${t('report.custom.service_level')} - ${dateStr} - ${locationName}.xlsx`;
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });

    generatedFiles.push({ fileName, wb, wbout });
  }

  return generatedFiles;
};

export const processTripActivityReport = async ({ datesToProcess, locationName, t }) => {
  const generatedFiles = [];

  for (const date of datesToProcess) {
    const { locTimeFrom, locTimeTo, selectedDateString } = getReportDates(date, date);

    const locHistories = await getLocationHistories({
      timeFrom: locTimeFrom,
      timeTo: locTimeTo,
    });

    const trips = locHistories || [];
    if (isEmpty(trips)) continue;
    const rows = [];

    trips.forEach((trip) => {
      const email = trip.email;
      const d = trips.find((driver) => driver.email === email);
      const start = formatDateUniversal(trip.startTime);
      if (isEmpty(d) || start !== selectedDateString) return;

      const startTrip = trip.startTime
        ? formatDateUniversal(trip.startTime, 'DD/MM/YYYY HH:mm:ss')
        : '-';
      const endTrip = trip.finish?.finishTime
        ? formatDateUniversal(trip.finish?.finishTime, 'DD/MM/YYYY HH:mm:ss')
        : '-';

      const assignedVehicleId = d.vehicleId || '-';
      const username = d.driverName || '-';
      const assignedVehicle = d.basePlat || '-';

      const tripId = trip.tripActivityId || '-';
      const startTripCoordinate = trip.lat && trip.lon ? `${trip.lat}, ${trip.lon}` : '-';
      const endTripCoordinate =
        trip.finish?.lat && trip.finish?.lon ? `${trip.finish.lat}, ${trip.finish.lon}` : '-';

      const totalDistance = trip.finish?.totalDistance ?? '-';
      const totalDuration = trip.durationHour ?? '-';

      rows.push({
        rowData: [
          tripId,
          assignedVehicleId,
          username,
          assignedVehicle,
          startTrip,
          startTripCoordinate,
          endTrip,
          endTripCoordinate,
          totalDistance,
          totalDuration,
        ],
        username,
        rawStartTime: trip.startTime || '',
      });
    });

    rows.sort((a, b) => {
      const userCmp = String(a.username).localeCompare(String(b.username));
      if (userCmp !== 0) return userCmp;
      return String(a.rawStartTime).localeCompare(String(b.rawStartTime));
    });

    const sheetData = [tripActivityHeaders, ...rows.map((r) => r.rowData)];

    if (sheetData.length === 1) continue;

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(sheetData);

    const range = XLSX.utils.decode_range(ws['!ref']);
    for (let C = 0; C <= range.e.c; ++C) {
      const cell_address = XLSX.utils.encode_cell({ r: 0, c: C });
      if (ws[cell_address]) {
        ws[cell_address].s = {
          font: { bold: true, color: { rgb: 'FFFFFF' } },
          fill: { patternType: 'solid', fgColor: { rgb: '0369A1' } },
          alignment: { horizontal: 'center', vertical: 'center' },
        };
      }
    }
    ws['!cols'] = tripActivityHeaders.map(() => ({ wch: 20 }));

    XLSX.utils.book_append_sheet(wb, ws, 'Trip Activity');

    const dateStr = formatDateUniversal(date, 'DD.MM.YYYY');
    const fileName = `${t('report.custom.trip_activity')} - ${dateStr} - ${locationName}.xlsx`;
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });

    generatedFiles.push({ fileName, wb, wbout });
  }

  return generatedFiles;
};
