import {
  calculateMinuteDifference,
  formatDateUniversal,
  formatLongDate,
  formatMinutesToHHMM,
} from '@/lib/utils';
import * as XLSX from 'xlsx-js-style';
import { BASE_STYLES, COLORS, FILL_STYLES, HEADER_STYLES } from './reportStyles';

const isValidAssignedTimeWIB = (createdIso, assignedIso) => {
  if (!createdIso || !assignedIso) return false;

  const cTime = new Date(createdIso).getTime();
  const aTime = new Date(assignedIso).getTime();

  if (isNaN(cTime) || isNaN(aTime)) return false;
  if (aTime < cTime) return false;

  const cWIB = new Date(cTime + 7 * 60 * 60 * 1000);
  const aWIB = new Date(aTime + 7 * 60 * 60 * 1000);

  const maxWIB = new Date(
    Date.UTC(cWIB.getUTCFullYear(), cWIB.getUTCMonth(), cWIB.getUTCDate() + 1, 3, 0, 0)
  );

  return aWIB.getTime() <= maxWIB.getTime();
};

const isValidRoutingTimeWIB = (utcString) => {
  if (!utcString) return false;
  const d = new Date(utcString);
  if (isNaN(d.getTime())) return false;

  const wibDate = new Date(d.getTime() + 7 * 60 * 60 * 1000);
  const day = wibDate.getUTCDay();
  const hour = wibDate.getUTCHours();

  if (day >= 1 && day <= 5) {
    return hour >= 15;
  } else if (day === 6) {
    return hour >= 11;
  } else {
    return true;
  }
};

const createSafeDate = (dateStr) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
};

export function getTargetRoutingDate(deliveryDateInput, fallbackCreatedTime) {
  const deliveryStr = deliveryDateInput
    ? formatDateUniversal(deliveryDateInput, 'YYYY-MM-DD')
    : null;

  if (deliveryStr && deliveryStr !== '-') {
    const [y, m, d] = deliveryStr.split('-').map(Number);
    const deliveryDate = new Date(y, m - 1, d, 12, 0, 0);
    const day = deliveryDate.getDay();
    const daysToSubtract = day === 1 ? 2 : 1;
    deliveryDate.setDate(deliveryDate.getDate() - daysToSubtract);

    return formatDateUniversal(deliveryDate, 'YYYY-MM-DD');
  }

  if (fallbackCreatedTime) {
    const createdStr = formatDateUniversal(fallbackCreatedTime, 'YYYY-MM-DD');
    if (createdStr && createdStr !== '-') {
      return createdStr;
    }
  }

  return null;
}

export function getRoutingTimeFromTasks(taskList) {
  if (!taskList || taskList.length === 0) {
    return {
      startTime: null,
      finishTime: null,
      startTask: null,
      finishTask: null,
      batches: [],
      mainBatch: null,
    };
  }

  const validTasks = taskList.filter((t) => {
    return (
      t.createdTime &&
      t.assignedTime &&
      !isNaN(new Date(t.createdTime).getTime()) &&
      !isNaN(new Date(t.assignedTime).getTime())
    );
  });

  if (validTasks.length === 0) {
    return {
      startTime: null,
      finishTime: null,
      startTask: null,
      finishTask: null,
      batches: [],
      mainBatch: null,
    };
  }

  const sortedTasks = [...validTasks].sort(
    (a, b) => new Date(a.assignedTime).getTime() - new Date(b.assignedTime).getTime()
  );

  const GAP_THRESHOLD_MS = 60 * 60 * 1000;
  const MAX_TASK_DURATION_MS = 3 * 60 * 60 * 1000;

  const batches = [];
  let currentBatch = null;

  sortedTasks.forEach((task) => {
    const taskAssignedMs = new Date(task.assignedTime).getTime();
    const taskCreatedMs = new Date(task.createdTime).getTime();

    if (!currentBatch) {
      currentBatch = {
        tasks: [task],
        minCreatedMs: taskCreatedMs,
        maxCreatedMs: taskCreatedMs,
        minAssignedMs: taskAssignedMs,
        maxAssignedMs: taskAssignedMs,
      };
      batches.push(currentBatch);
      return;
    }

    const assignedDiff = taskAssignedMs - currentBatch.maxAssignedMs;
    const isAssignedClose = assignedDiff <= GAP_THRESHOLD_MS;

    const isCreatedSoonAfterPreviousDispatch =
      taskCreatedMs >= currentBatch.maxAssignedMs &&
      taskCreatedMs - currentBatch.maxAssignedMs <= GAP_THRESHOLD_MS &&
      taskAssignedMs - taskCreatedMs <= MAX_TASK_DURATION_MS;

    if (isAssignedClose || isCreatedSoonAfterPreviousDispatch) {
      currentBatch.tasks.push(task);
      if (taskCreatedMs < currentBatch.minCreatedMs) currentBatch.minCreatedMs = taskCreatedMs;
      if (taskCreatedMs > currentBatch.maxCreatedMs) currentBatch.maxCreatedMs = taskCreatedMs;
      if (taskAssignedMs > currentBatch.maxAssignedMs) currentBatch.maxAssignedMs = taskAssignedMs;
    } else {
      currentBatch = {
        tasks: [task],
        minCreatedMs: taskCreatedMs,
        maxCreatedMs: taskCreatedMs,
        minAssignedMs: taskAssignedMs,
        maxAssignedMs: taskAssignedMs,
      };
      batches.push(currentBatch);
    }
  });

  let mainBatch = batches[0];
  batches.forEach((b) => {
    if (b.tasks.length > mainBatch.tasks.length) {
      mainBatch = b;
    }
  });

  let startTask = mainBatch.tasks[0];
  let finishTask = mainBatch.tasks[0];

  mainBatch.tasks.forEach((t) => {
    if (new Date(t.createdTime).getTime() < new Date(startTask.createdTime).getTime()) {
      startTask = t;
    }
    if (new Date(t.assignedTime).getTime() > new Date(finishTask.assignedTime).getTime()) {
      finishTask = t;
    }
  });

  return {
    startTime: startTask.createdTime,
    finishTime: finishTask.assignedTime,
    startTask,
    finishTask,
    batches,
    mainBatch,
  };
}

export function generateRoutingTimeSheet(
  wb,
  tasks,
  startDateStr,
  endDateStr,
  translate,
  localeCode
) {
  const dataMap = {};
  const tasksByDate = {};
  const start = createSafeDate(startDateStr);
  const end = createSafeDate(endDateStr);

  const getPrevRouting = (d) => {
    const nd = new Date(d);
    nd.setDate(nd.getDate() - (nd.getDay() === 1 ? 2 : 1));
    return nd;
  };

  const mappedStart = getPrevRouting(start);
  const mappedEnd = getPrevRouting(end);
  const actualStart = mappedStart <= mappedEnd ? mappedStart : mappedEnd;
  const actualEnd = mappedStart <= mappedEnd ? mappedEnd : mappedStart;

  const current = new Date(actualStart);
  while (current <= actualEnd) {
    const key = formatDateUniversal(current, 'YYYY-MM-DD');
    dataMap[key] = {
      dateDisplay: formatLongDate(current, localeCode),
      dry: { firstCreatedTime: null, lastAssignedTime: null },
      frozen: { firstCreatedTime: null, lastAssignedTime: null },
      isSunday: current.getDay() === 0,
    };
    tasksByDate[key] = { dry: [], frozen: [] };
    current.setDate(current.getDate() + 1);
  }

  if (Array.isArray(tasks)) {
    tasks.forEach((task) => {
      const isApi = !task.createdFrom || task.createdFrom === 'API';
      if (!isApi) return;
      if (task.flow !== 'Delivery') return;
      if (!task.createdTime) return;
      if (!isValidRoutingTimeWIB(task.createdTime)) return;

      const taskDateKey = getTargetRoutingDate(task.startTime, task.createdTime);

      if (taskDateKey && dataMap[taskDateKey] && tasksByDate[taskDateKey]) {
        const isValidRoutedTask =
          task.assignedTime &&
          task.routingResultId &&
          (task.eta || task.etd || task.routePlannedOrder) &&
          isValidAssignedTimeWIB(task.createdTime, task.assignedTime);

        if (isValidRoutedTask) {
          const type = (task.typeStorage || '').toUpperCase().includes('FROZEN') ? 'frozen' : 'dry';
          tasksByDate[taskDateKey][type].push(task);
        }
      }
    });
  }

  Object.keys(dataMap).forEach((dateKey) => {
    ['dry', 'frozen'].forEach((type) => {
      const typeTasks = tasksByDate[dateKey] ? tasksByDate[dateKey][type] : [];
      const result = getRoutingTimeFromTasks(typeTasks);
      if (result.startTime && result.finishTime) {
        dataMap[dateKey][type].firstCreatedTime = result.startTime;
        dataMap[dateKey][type].lastAssignedTime = result.finishTime;
      }
    });
  });

  const isTimeDifferent = (t1, t2) => {
    if (!t1 && !t2) return false;
    if (!t1 || !t2) return true;
    return Math.abs(new Date(t1).getTime() - new Date(t2).getTime()) > 60000;
  };

  let isStartSeparated = false;
  let isFinishSeparated = false;

  Object.keys(dataMap).forEach((key) => {
    const row = dataMap[key];
    if (isTimeDifferent(row.dry.firstCreatedTime, row.frozen.firstCreatedTime)) {
      isStartSeparated = true;
    }
    if (isTimeDifferent(row.dry.lastAssignedTime, row.frozen.lastAssignedTime)) {
      isFinishSeparated = true;
    }
  });

  const isDurationSeparated = isStartSeparated || isFinishSeparated;
  const hasAnySeparation = isStartSeparated || isFinishSeparated;
  const totalCols =
    1 + (isStartSeparated ? 2 : 1) + (isFinishSeparated ? 2 : 1) + (isDurationSeparated ? 2 : 1);

  let excelData = [];
  let merges = [];

  if (hasAnySeparation) {
    const headerRow0 = [];
    const headerRow1 = [];
    let currentCol = 0;

    headerRow0.push(translate('common.routing_date'));
    headerRow1.push('');
    merges.push({ s: { r: 0, c: currentCol }, e: { r: 1, c: currentCol } });
    currentCol += 1;

    if (isStartSeparated) {
      headerRow0.push(translate('common.start_time'), '');
      headerRow1.push('Dry', 'Frozen');
      merges.push({ s: { r: 0, c: currentCol }, e: { r: 0, c: currentCol + 1 } });
      currentCol += 2;
    } else {
      headerRow0.push(translate('common.start_time'));
      headerRow1.push('');
      merges.push({ s: { r: 0, c: currentCol }, e: { r: 1, c: currentCol } });
      currentCol += 1;
    }

    if (isFinishSeparated) {
      headerRow0.push(translate('common.finish_time'), '');
      headerRow1.push('Dry', 'Frozen');
      merges.push({ s: { r: 0, c: currentCol }, e: { r: 0, c: currentCol + 1 } });
      currentCol += 2;
    } else {
      headerRow0.push(translate('common.finish_time'));
      headerRow1.push('');
      merges.push({ s: { r: 0, c: currentCol }, e: { r: 1, c: currentCol } });
      currentCol += 1;
    }

    if (isDurationSeparated) {
      headerRow0.push(translate('common.duration'), '');
      headerRow1.push('Dry', 'Frozen');
      merges.push({ s: { r: 0, c: currentCol }, e: { r: 0, c: currentCol + 1 } });
      currentCol += 2;
    } else {
      headerRow0.push(translate('common.duration'));
      headerRow1.push('');
      merges.push({ s: { r: 0, c: currentCol }, e: { r: 1, c: currentCol } });
      currentCol += 1;
    }

    excelData = [headerRow0, headerRow1];
  } else {
    excelData = [
      [
        translate('common.routing_date'),
        translate('common.start_time'),
        translate('common.finish_time'),
        translate('common.duration'),
      ],
    ];
  }

  Object.keys(dataMap)
    .sort()
    .forEach((key) => {
      const row = dataMap[key];
      const hasDryStart = !!row.dry.firstCreatedTime;
      const hasDryEnd = !!row.dry.lastAssignedTime;
      const hasFrzStart = !!row.frozen.firstCreatedTime;
      const hasFrzEnd = !!row.frozen.lastAssignedTime;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const currentMidnight = createSafeDate(key);
      currentMidnight.setHours(0, 0, 0, 0);
      const isPast = currentMidnight < today;

      const isDynamicHoliday =
        isPast && !hasDryStart && !hasDryEnd && !hasFrzStart && !hasFrzEnd && !row.isSunday;

      if (row.isSunday || isDynamicHoliday) {
        const rowIndex = excelData.length;
        const textLibur = row.isSunday
          ? translate('common.holiday_sunday')
          : translate('common.holiday');

        const holidayRow = [row.dateDisplay, textLibur];
        for (let i = 2; i < totalCols; i++) {
          holidayRow.push('');
        }
        excelData.push(holidayRow);
        merges.push({ s: { r: rowIndex, c: 1 }, e: { r: rowIndex, c: totalCols - 1 } });
      } else {
        let dryDur = '-',
          frzDur = '-';
        if (hasDryStart && hasDryEnd)
          dryDur = formatMinutesToHHMM(
            calculateMinuteDifference(row.dry.firstCreatedTime, row.dry.lastAssignedTime)
          );
        if (hasFrzStart && hasFrzEnd)
          frzDur = formatMinutesToHHMM(
            calculateMinuteDifference(row.frozen.firstCreatedTime, row.frozen.lastAssignedTime)
          );

        const rowData = [row.dateDisplay];

        const dryStartStr = hasDryStart
          ? formatDateUniversal(row.dry.firstCreatedTime, 'HH:mm')
          : '-';
        const frzStartStr = hasFrzStart
          ? formatDateUniversal(row.frozen.firstCreatedTime, 'HH:mm')
          : '-';
        const unifiedStartStr = hasDryStart ? dryStartStr : frzStartStr;

        if (isStartSeparated) {
          rowData.push(dryStartStr, frzStartStr);
        } else {
          rowData.push(unifiedStartStr);
        }

        const dryEndStr = hasDryEnd ? formatDateUniversal(row.dry.lastAssignedTime, 'HH:mm') : '-';
        const frzEndStr = hasFrzEnd
          ? formatDateUniversal(row.frozen.lastAssignedTime, 'HH:mm')
          : '-';
        const unifiedEndStr = hasDryEnd ? dryEndStr : frzEndStr;

        if (isFinishSeparated) {
          rowData.push(dryEndStr, frzEndStr);
        } else {
          rowData.push(unifiedEndStr);
        }

        const unifiedDur = dryDur !== '-' ? dryDur : frzDur;
        if (isDurationSeparated) {
          rowData.push(dryDur, frzDur);
        } else {
          rowData.push(unifiedDur);
        }

        excelData.push(rowData);
      }
    });

  const ws = XLSX.utils.aoa_to_sheet(excelData);
  if (merges.length > 0) ws['!merges'] = merges;

  const range = XLSX.utils.decode_range(ws['!ref']);

  for (let R = 0; R <= (hasAnySeparation ? 1 : 0); R++) {
    for (let C = 0; C < totalCols; C++) {
      const cell = ws[XLSX.utils.encode_cell({ r: R, c: C })];
      if (cell) {
        cell.s = { ...HEADER_STYLES.main };
        if (hasAnySeparation && R === 1) {
          if (excelData[R][C] === 'Dry') {
            cell.s.fill = FILL_STYLES.dry;
          } else if (excelData[R][C] === 'Frozen') {
            cell.s.fill = FILL_STYLES.frozen;
          }
        }
      }
    }
  }

  const ERROR_CELL_STYLE = {
    fill: { patternType: 'solid', fgColor: { rgb: 'FFC7CE' } },
    font: { color: { rgb: '9C0006' }, bold: true },
  };

  const colStartDry = 1;
  const colStartFrz = isStartSeparated ? 2 : null;
  const colEndDry = isStartSeparated ? 3 : 2;
  const colEndFrz = isFinishSeparated ? (isStartSeparated ? 4 : 3) : null;

  for (let R = hasAnySeparation ? 2 : 1; R <= range.e.r; R++) {
    const col1Val = excelData[R][1];
    const textLiburSunday = translate('common.holiday_sunday');
    const textLiburDynamic = translate('common.holiday');
    const isHolidayRow = col1Val === textLiburSunday || col1Val === textLiburDynamic;

    const dryStartVal = excelData[R][colStartDry];
    const frzStartVal = colStartFrz !== null ? excelData[R][colStartFrz] : null;
    const dryEndVal = excelData[R][colEndDry];
    const frzEndVal = colEndFrz !== null ? excelData[R][colEndFrz] : null;

    for (let C = 0; C < totalCols; C++) {
      const cell = ws[XLSX.utils.encode_cell({ r: R, c: C })];
      if (!cell) continue;

      let currentStyle = { ...BASE_STYLES.center };

      if (isHolidayRow) {
        currentStyle.fill = { patternType: 'solid', fgColor: COLORS.sunday };
        if (C === 1) {
          currentStyle.font = { bold: true, color: { rgb: '990000' } };
        }
      } else {
        let isErrorCell = false;

        if (isStartSeparated) {
          if (
            C === colStartDry &&
            dryStartVal === '-' &&
            (isFinishSeparated ? dryEndVal !== '-' : dryEndVal !== '-')
          ) {
            isErrorCell = true;
          } else if (
            C === colStartFrz &&
            frzStartVal === '-' &&
            (isFinishSeparated ? frzEndVal !== '-' : dryEndVal !== '-')
          ) {
            isErrorCell = true;
          }
        } else {
          const anyFinishExists = isFinishSeparated
            ? dryEndVal !== '-' || frzEndVal !== '-'
            : dryEndVal !== '-';
          if (C === colStartDry && dryStartVal === '-' && anyFinishExists) {
            isErrorCell = true;
          }
        }

        if (isFinishSeparated) {
          if (
            C === colEndDry &&
            dryEndVal === '-' &&
            (isStartSeparated ? dryStartVal !== '-' : dryStartVal !== '-')
          ) {
            isErrorCell = true;
          } else if (
            C === colEndFrz &&
            frzEndVal === '-' &&
            (isStartSeparated ? frzStartVal !== '-' : dryStartVal !== '-')
          ) {
            isErrorCell = true;
          }
        } else {
          const anyStartExists = isStartSeparated
            ? dryStartVal !== '-' || frzStartVal !== '-'
            : dryStartVal !== '-';
          if (C === colEndDry && dryEndVal === '-' && anyStartExists) {
            isErrorCell = true;
          }
        }

        if (isErrorCell) {
          currentStyle = { ...currentStyle, ...ERROR_CELL_STYLE };
        }
      }

      cell.s = currentStyle;
    }
  }

  const colsConfig = [{ wch: 22 }];
  if (isStartSeparated) {
    colsConfig.push({ wch: 10 }, { wch: 10 });
  } else {
    colsConfig.push({ wch: 14 });
  }
  if (isFinishSeparated) {
    colsConfig.push({ wch: 10 }, { wch: 10 });
  } else {
    colsConfig.push({ wch: 14 });
  }
  if (isDurationSeparated) {
    colsConfig.push({ wch: 10 }, { wch: 10 });
  } else {
    colsConfig.push({ wch: 14 });
  }
  ws['!cols'] = colsConfig;

  XLSX.utils.book_append_sheet(wb, ws, translate('summary.tabs.routing_time.title'));
}
