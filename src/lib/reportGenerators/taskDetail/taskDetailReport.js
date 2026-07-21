import { formatDateUniversal, formatUTC7, getDistance, normalizeEmail } from '@/lib/utils';
import * as XLSX from 'xlsx-js-style';
import { isTripInShift } from '../helper';

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

const getVal = (obj, header, taskDetailKeyMapping) => {
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

export const buildRoutingMap = (routingResults) => {
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

export const groupTasksByDriver = (tasksData) => {
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

export const buildSyncTimeMap = (locHistories, driverData, selectedDateStr) => {
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
    const startDate = formatUTC7(startTime, 'DD-MM-YYYY');

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
        isTripInShift(r.rawStartTime, r.rawFinishTime, r.workingTime)
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

export const generateTaskDetailWorkbook = (
  groupedData,
  timeMap,
  routingMap,
  hubCoordsStr,
  taskDetailHeaders,
  taskDetailKeyMapping
) => {
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
        const rawDistance = getDistance(doneCoord, hubCoordsStr);
        if (rawDistance !== null) {
          returnHubDistanceMeters = Math.round(rawDistance * 1.3);
        }
      }

      const hubStartRow = taskDetailHeaders.map(() => null);
      const hubEndRow = taskDetailHeaders.map(() => null);
      const assignedToVal = getVal(firstTask, 'assignedTo', taskDetailKeyMapping);

      hubStartRow[hubCol] = 'HUB';
      hubStartRow[assignedToCol] = assignedToVal !== '-' ? assignedToVal : '-';
      hubStartRow[etdCol] = routeInfo?.startHub?.etd ? routeInfo.startHub.etd : '-';
      hubStartRow[statusCol] = null;

      if (timeData && timeData.rawStartTime) {
        const dateFormatted = formatUTC7(timeData.rawStartTime, 'DD-MM-YYYY');
        const timeFormatted = formatUTC7(timeData.rawStartTime, 'HH:mm');
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
        const dateFormatted = formatUTC7(timeData.rawFinishTime, 'DD-MM-YYYY');
        const timeFormatted = formatUTC7(timeData.rawFinishTime, 'HH:mm');

        let diffDisplay = '';
        const sDateStr = formatUTC7(timeData.rawStartTime, 'DD-MM-YYYY');
        const fDateStr = formatUTC7(timeData.rawFinishTime, 'DD-MM-YYYY');

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
        const row = taskDetailHeaders.map((header) => getVal(task, header, taskDetailKeyMapping));
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
