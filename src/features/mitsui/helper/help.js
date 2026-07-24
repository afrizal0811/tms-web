import { getLocationHistories, getResult, getResultHistories, getTasks } from '@/lib/api';
import { getDriverData } from '@/lib/driverData';
import { getCachedHubs } from '@/lib/localStorageHandler';
import {
  buildRoutingMap,
  buildSyncTimeMap,
  generateTaskDetailWorkbook,
  generateTaskManualDetailWorkbook,
  groupTasksByDriver,
} from '@/lib/reportGenerators/mitsui';
import {
  calculateStartFinishDates,
  formatDateUniversal,
  isEmpty,
  toApiDateString,
} from '@/lib/utils';
import * as XLSX from 'xlsx-js-style';
import { taskHeaders, taskKeyMapping, taskManualHeaders, taskManualKeyMapping } from './constants';

export const getReportDates = (start, end) => {
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

export const processDetailReport = async (storedLocation, datesToProcess, locationName, t) => {
  const driverData = await getDriverData(storedLocation);
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

    const wb = generateTaskDetailWorkbook(
      groupedData,
      timeMap,
      routingMap,
      hubCoordsStr,
      taskHeaders,
      taskKeyMapping
    );

    const dateStr = formatDateUniversal(date, 'DD.MM.YYYY');
    const fileName = `${t('report.task_detail_report')} - ${dateStr} - ${locationName}.xlsx`;
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });

    generatedFiles.push({ fileName, wb, wbout });
  }

  return generatedFiles;
};

export const processManualReport = async (storedLocation, datesToProcess, locationName, t) => {
  const generatedFiles = [];

  for (const date of datesToProcess) {
    const { timeFromUtc, timeToUtc } = getReportDates(date, date);

    const tasks = await getTasks({
      hubId: storedLocation,
      status: 'DONE,ONGOING',
      timeFrom: timeFromUtc,
      timeTo: timeToUtc,
      timeBy: 'startTime',
      limit: 1000,
    });

    const tasksData = !isEmpty(tasks) && Array.isArray(tasks) ? tasks : tasks?.data || [];
    if (isEmpty(tasksData)) continue;

    const uniqueRoutingIds = [
      ...new Set(tasksData.map((task) => task.routingResultId).filter(Boolean)),
    ];

    const historiesRes =
      uniqueRoutingIds.length > 0 ? await getResultHistories(uniqueRoutingIds) : [];

    const overrideTaskIds = new Set();
    (historiesRes || []).forEach((item) => {
      (item.history || []).forEach((h) => {
        (h.manual?.data || []).forEach((m) => {
          (m.visits || []).forEach((v) => {
            if (v.visitId && v.visitId.includes('-')) {
              overrideTaskIds.add(v.visitId.substring(v.visitId.indexOf('-') + 1));
            }
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

      if (overrideTaskIds.has(taskId)) {
        task.isManual = true;
        task.manualType = 'Manual Override';
      } else if (isUnassigned) {
        task.isManual = true;
        task.manualType = 'Manual Assign';
      } else {
        task.isManual = false;
        task.manualType = null;
      }
    });

    const groupedData = groupTasksByDriver(tasksData);

    const wb = generateTaskManualDetailWorkbook(
      groupedData,
      taskManualHeaders,
      taskManualKeyMapping
    );

    const dateStr = formatDateUniversal(date, 'DD.MM.YYYY');
    const fileName = `${t('report.task_manual_detail_report')} - ${dateStr} - ${locationName}.xlsx`;
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });

    generatedFiles.push({ fileName, wb, wbout });
  }

  return generatedFiles;
};
