import {
  applyPendingDetailsToTasks,
  DELIVERY_STATUS_KEYS,
  normalizeDeliveryStatus,
} from '@/lib/deliveryStatus';
import {
  formatDateUniversal,
  getBasePlate,
  getDeliveryDateFromRouting,
  parseCustomerString,
} from '@/lib/utils';

const cleanPlat = (str) => {
  if (!str) return '';
  const base = getBasePlate(str) || str;
  return String(base).replace(/\s+/g, '').toLowerCase();
};

const isValidPlate = (plate) => {
  if (!plate || typeof plate !== 'string') return false;
  const trimmed = plate.trim();
  if (
    !trimmed ||
    trimmed === '-' ||
    trimmed.toLowerCase() === 'n/a' ||
    trimmed.toLowerCase() === 'null' ||
    trimmed.toLowerCase() === 'undefined'
  ) {
    return false;
  }
  const clean = cleanPlat(trimmed);
  if (!clean || clean === '-' || clean.includes('unknown') || clean.includes('demo')) {
    return false;
  }
  return true;
};

const isValidDriver = (driver) => {
  if (!driver || typeof driver !== 'string') return false;
  const trimmed = driver.trim();
  if (
    !trimmed ||
    trimmed === '-' ||
    trimmed.toLowerCase() === 'n/a' ||
    trimmed.toLowerCase() === 'null' ||
    trimmed.toLowerCase() === 'undefined'
  ) {
    return false;
  }
  return true;
};

const parseHistories = (histories) => {
  if (!histories) return null;
  if (typeof histories === 'string') {
    try {
      return JSON.parse(histories);
    } catch {
      return null;
    }
  }
  return histories;
};

const createMetricCategory = () => ({
  dp: 0,
  dt_total: 0,
  dt_sum: 0,
  dt_hist: 0,
  ma_hist: 0,
  rt: 0,
  co: 0,
  pr: 0,
  tv: 0,
  dp_tasks: [],
  dt_tasks: [],
  ma_tasks: [],
  rt_tasks: [],
  co_tasks: [],
  pr_tasks: [],
  tv_details: [],
});

export async function calculateTaskSummaryMetrics({
  allTasks,
  allResults,
  fetchedDrivers,
  hasPendingGR,
  t,
  isManualMode = false,
  pendingDetails,
}) {
  const effectiveTasks = pendingDetails
    ? applyPendingDetailsToTasks(allTasks, pendingDetails)
    : allTasks;

  const tempMetrics = {};

  const initDate = (dateKey) => {
    if (!tempMetrics[dateKey]) {
      tempMetrics[dateKey] = {
        actual_tasks_count: 0,
        routingNames: new Set(),
        dry: createMetricCategory(),
        frozen: createMetricCategory(),
        unknown: createMetricCategory(),
      };
    }
  };

  const tasksList = effectiveTasks || [];
  const taskById = new Map();
  (allTasks || []).forEach((task) => {
    if (task._id) taskById.set(String(task._id), task);
    if (task.id) taskById.set(String(task.id), task);
    if (task.taskId) taskById.set(String(task.taskId), task);
  });

  const getTaskDetails = (tripRaw) => {
    const rawName = tripRaw?.visitName || tripRaw?.name || '';
    const fallback = () => {
      const parsed = parseCustomerString(rawName);
      return {
        customerOrder: rawName,
        customerName: parsed.name || t('common.no_data'),
        flow: 'DELIVERY',
      };
    };

    const visitId = tripRaw?.visitId || '';
    if (!visitId || !visitId.includes('-')) {
      return fallback();
    }

    const taskId = visitId.substring(visitId.indexOf('-') + 1);
    const found = taskById.get(String(taskId));
    return found || fallback();
  };

  const driverMapStorage = {};
  const driverByEmail = new Map();
  const driverByPlate = new Map();
  (fetchedDrivers || []).forEach((d) => {
    const email = (d.email || '').toLowerCase().trim();
    if (email) {
      driverMapStorage[email] = (d.storage || '').toUpperCase();
      if (!driverByEmail.has(email)) driverByEmail.set(email, d);
    }
    const p1 = cleanPlat(d.plat);
    if (p1 && !driverByPlate.has(p1)) driverByPlate.set(p1, d);
    const p2 = cleanPlat(d.basePlat);
    if (p2 && !driverByPlate.has(p2)) driverByPlate.set(p2, d);
  });

  if (Array.isArray(effectiveTasks)) {
    effectiveTasks.forEach((task) => {
      const dateKey =
        formatDateUniversal(task.startTime, 'YYYY-MM-DD') ||
        formatDateUniversal(task.doneTime, 'YYYY-MM-DD') ||
        formatDateUniversal(task.createdTime, 'YYYY-MM-DD');
      if (!dateKey) return;

      initDate(dateKey);

      tempMetrics[dateKey].actual_tasks_count = (tempMetrics[dateKey].actual_tasks_count || 0) + 1;

      const rawEmail = (Array.isArray(task.assignee) ? task.assignee[0] : task.assignee || '')
        .toLowerCase()
        .trim();
      const storageFromDriver = driverMapStorage[rawEmail] || '';
      const typeRaw = (task.typeStorage || storageFromDriver || '').toUpperCase();
      const type = typeRaw.includes('FROZEN') ? 'frozen' : 'dry';

      const sDeliv = task.statusDelivery;
      const statusArr = Array.isArray(sDeliv) ? sDeliv : [sDeliv];
      const normStatuses = statusArr.map((s) => normalizeDeliveryStatus(s));

      if (normStatuses.includes(DELIVERY_STATUS_KEYS.PENDING)) {
        tempMetrics[dateKey][type].rt += 1;
        tempMetrics[dateKey][type].rt_tasks.push(task);
      } else if (!hasPendingGR && normStatuses.includes(DELIVERY_STATUS_KEYS.PENDING_GR)) {
        tempMetrics[dateKey][type].rt += 1;
        tempMetrics[dateKey][type].rt_tasks.push({ ...task, isWrongGR: true });
      }

      if (normStatuses.includes(DELIVERY_STATUS_KEYS.CANCEL)) {
        tempMetrics[dateKey][type].co += 1;
        tempMetrics[dateKey][type].co_tasks.push(task);
      }
      if (normStatuses.includes(DELIVERY_STATUS_KEYS.PARTIAL)) {
        tempMetrics[dateKey][type].pr += 1;
        tempMetrics[dateKey][type].pr_tasks.push(task);
      }
    });
  }

  const doneResults = (allResults || []).filter(
    (item) => item.dispatchStatus?.toLowerCase() === 'done'
  );

  const routingDateVehicles = {};
  doneResults.forEach((res) => {
    const dateKey = res.deliveryDate || getDeliveryDateFromRouting(res.createdTime);
    if (!dateKey) return;

    initDate(dateKey);

    const droppedCount = typeof res.dropped === 'number' ? res.dropped : 0;
    tempMetrics[dateKey].dry.dt_sum += droppedCount;

    const histData = parseHistories(res.histories);
    const histObj = histData?.history;
    if (histObj) {
      const h = Array.isArray(histObj) ? histObj[0] : histObj;
      const manualList = Array.isArray(h?.manual) ? h.manual : (h?.manual?.data || []);

      let histDry = 0;
      let histFrozen = 0;
      let histMaDry = 0;
      let histMaFrozen = 0;

      manualList.forEach((item) => {
        const vToClean = cleanPlat(item.vehicleTo);
        const foundDriver = (fetchedDrivers || []).find(
          (d) => cleanPlat(d.plat) && vToClean.includes(cleanPlat(d.plat))
        );
        const storage = foundDriver ? (foundDriver.storage || '').toUpperCase() : 'DRY';
        const isFrozen = storage.includes('FROZEN');

        (item.visits || []).forEach((v) => {
          const taskDetail = getTaskDetails(v);

          if (isFrozen) {
            histFrozen += 1;
            histMaFrozen += 1;
            if (tempMetrics[dateKey]) {
              tempMetrics[dateKey].frozen.dt_tasks.push(taskDetail);
              tempMetrics[dateKey].frozen.ma_tasks.push(taskDetail);
            }
          } else {
            histDry += 1;
            histMaDry += 1;
            if (tempMetrics[dateKey]) {
              tempMetrics[dateKey].dry.dt_tasks.push(taskDetail);
              tempMetrics[dateKey].dry.ma_tasks.push(taskDetail);
            }
          }
        });
      });

      if (tempMetrics[dateKey]) {
        tempMetrics[dateKey].dry.dt_hist += histDry;
        tempMetrics[dateKey].frozen.dt_hist += histFrozen;
        tempMetrics[dateKey].dry.ma_hist += histMaDry;
        tempMetrics[dateKey].frozen.ma_hist += histMaFrozen;
      }
    }

    if (!routingDateVehicles[dateKey]) routingDateVehicles[dateKey] = new Map();

    if (tempMetrics[dateKey] && res.name) {
      tempMetrics[dateKey].routingNames.add(res.name);
    }

    const plates = Array.from(
      new Set([
        ...Object.keys(res.totalDistance || {}),
        ...Object.keys(res.time || {}),
        ...Object.keys(res.hubTimes || {}),
      ])
    );

    plates.forEach((plat) => {
      const strictBasePlate = plat;
      const baseCanonical = cleanPlat(strictBasePlate);

      const foundDriver = driverByPlate.get(baseCanonical);
      const storage = foundDriver ? (foundDriver.storage || 'DRY').toUpperCase() : 'DRY';
      const driverName = foundDriver ? foundDriver.name : '-';
      const type = storage.includes('FROZEN') ? 'frozen' : 'dry';

      const routeTasks = tasksList.filter(
        (t) =>
          (String(t.routingResultId) === String(res.id) ||
            String(t.routingResultId) === String(res._id)) &&
          cleanPlat(t.basePlat || t.vehicleName || t.plat) === baseCanonical
      );

      if (tempMetrics[dateKey] && tempMetrics[dateKey][type]) {
        routeTasks.forEach((t) => {
          const taskDetail = getTaskDetails(t);
          tempMetrics[dateKey][type].dp_tasks.push(taskDetail);
        });
      }

      if (!isValidPlate(strictBasePlate) || !isValidDriver(driverName)) return;

      const visitsCount = routeTasks.length || 1;
      if (!routingDateVehicles[dateKey].has(baseCanonical)) {
        routingDateVehicles[dateKey].set(baseCanonical, {
          plate: strictBasePlate,
          driverName,
          storageType: type,
          visits: visitsCount,
        });
      } else {
        routingDateVehicles[dateKey].get(baseCanonical).visits += visitsCount;
      }
    });
  });

  Object.keys(tempMetrics).forEach((dateKey) => {
    const dailyVehicles = routingDateVehicles[dateKey];
    if (dailyVehicles) {
      tempMetrics[dateKey].dry.tv = 0;
      tempMetrics[dateKey].frozen.tv = 0;
      tempMetrics[dateKey].dry.dp = 0;
      tempMetrics[dateKey].frozen.dp = 0;
      dailyVehicles.forEach((vh) => {
        const type = vh.storageType.toLowerCase();
        tempMetrics[dateKey][type].tv += 1;
        tempMetrics[dateKey][type].dp += vh.visits;
        tempMetrics[dateKey][type].tv_details.push({
          plate: vh.plate,
          driverName: vh.driverName,
        });
      });

      tempMetrics[dateKey].dry.tv_details.sort((a, b) =>
        (a.driverName || '').localeCompare(b.driverName || '')
      );
      tempMetrics[dateKey].frozen.tv_details.sort((a, b) =>
        (a.driverName || '').localeCompare(b.driverName || '')
      );
    }

    if (Array.isArray(allTasks)) {
      tempMetrics[dateKey].dry.dp = 0;
      tempMetrics[dateKey].frozen.dp = 0;
      tempMetrics[dateKey].unknown.dp = 0;
      tempMetrics[dateKey].dry.dp_tasks = [];
      tempMetrics[dateKey].frozen.dp_tasks = [];
      tempMetrics[dateKey].unknown.dp_tasks = [];

      tempMetrics[dateKey].dry.tv = 0;
      tempMetrics[dateKey].frozen.tv = 0;
      tempMetrics[dateKey].unknown.tv = 0;
      tempMetrics[dateKey].dry.tv_details = [];
      tempMetrics[dateKey].frozen.tv_details = [];
      tempMetrics[dateKey].unknown.tv_details = [];

      const isManual =
        isManualMode || allTasks.some((t) => Boolean(t.typeStorage));

      const dailyTaskVehicles = {
        dry: new Map(),
        frozen: new Map(),
        unknown: new Map(),
      };

      allTasks.forEach((task) => {
        const dObj = new Date(task.startTime || task.doneTime || task.createdTime);
        if (isNaN(dObj.getTime())) return;
        const taskDateKey = formatDateUniversal(dObj);

        if (taskDateKey === dateKey) {
          if (!isManual) {
            const statusRaw = (task.status || task.statusDelivery || '').toUpperCase().trim();
            const isOngoing = statusRaw.includes('ONGOING');
            const isDone = statusRaw.includes('DONE') || statusRaw.includes('SELESAI');
            if (!isOngoing && !isDone) return;
          }

          let rawEmail = '';
          if (task.assignee) {
            rawEmail =
              typeof task.assignee === 'string'
                ? task.assignee.split(',')[0].trim()
                : Array.isArray(task.assignee)
                  ? task.assignee[0]
                  : task.assignee;
          } else if (task.assignedTo && task.assignedTo.email) {
            rawEmail = task.assignedTo.email;
          } else if (task.email) {
            rawEmail = task.email;
          }
          rawEmail = (rawEmail || '').toLowerCase().trim();

          const strictBasePlate = (
            task.basePlat ||
            task.vehicleName ||
            task.assignedVehicleName ||
            task.plat ||
            ''
          ).trim();
          const baseCanonical = cleanPlat(strictBasePlate);

          const foundDriver =
            (rawEmail && driverByEmail.get(rawEmail)) ||
            (baseCanonical && driverByPlate.get(baseCanonical)) ||
            null;

          let type = 'dry';
          if (isManual) {
            const tStorage = (task.typeStorage || '').toUpperCase();
            type = tStorage.includes('FROZEN') ? 'frozen' : 'dry';
          } else {
            const storage = foundDriver
              ? (foundDriver.storage || 'DRY').toUpperCase()
              : task.typeStorage
                ? task.typeStorage.toUpperCase()
                : 'DRY';
            type = storage.includes('FROZEN') ? 'frozen' : 'dry';
          }

          const rawCust = task.customerOrder || task.customerName || task.title || '';
          const parsedCust = parseCustomerString(rawCust);
          const custName = task.customerName || parsedCust.name || task.title || '-';
          const invNum =
            task.content || parsedCust.invoiceNumber || task.orderId || task.customerOrder || '-';

          tempMetrics[dateKey][type].dp += 1;
          tempMetrics[dateKey][type].dp_tasks.push({
            ...task,
            flow: task.flow || 'DELIVERY',
            customerOrder: task.customerOrder || invNum,
            customerName: custName,
            content: task.content || invNum,
            title: task.title || custName,
            taskId: task._id || task.id || task.taskId,
            visitName: task.customerOrder || task.title || task._id,
            visitId: task._id || task.id || task.taskId,
          });

          const finalPlate =
            strictBasePlate || (foundDriver ? foundDriver.plat || foundDriver.basePlat : '') || '-';

          const finalDriverName =
            task.driverName && task.driverName !== 'N/A' && task.driverName !== '-'
              ? task.driverName
              : (foundDriver ? foundDriver.name : null) ||
                task.driver ||
                (typeof task.assignee === 'string' && !task.assignee.includes('@')
                  ? task.assignee.trim()
                  : null) ||
                (rawEmail ? rawEmail : '-');

          if (isValidPlate(finalPlate) && isValidDriver(finalDriverName)) {
            const canonicalPlate = cleanPlat(finalPlate);
            const displayPlate = getBasePlate(finalPlate) || finalPlate;

            const vehicleType =
              foundDriver && foundDriver.storage
                ? foundDriver.storage.toUpperCase().includes('FROZEN')
                  ? 'frozen'
                  : 'dry'
                : type;
            const otherVehicleType = vehicleType === 'dry' ? 'frozen' : 'dry';

            if (dailyTaskVehicles[otherVehicleType].has(canonicalPlate)) {
              dailyTaskVehicles[otherVehicleType].delete(canonicalPlate);
            }

            if (!dailyTaskVehicles[vehicleType].has(canonicalPlate)) {
              dailyTaskVehicles[vehicleType].set(canonicalPlate, {
                plate: displayPlate,
                driverName: finalDriverName,
              });
            } else {
              const existing = dailyTaskVehicles[vehicleType].get(canonicalPlate);
              if (existing.driverName.includes('@') && !finalDriverName.includes('@')) {
                existing.driverName = finalDriverName;
              }
            }
          }
        }
      });

      ['dry', 'frozen'].forEach((tKey) => {
        const vList = Array.from(dailyTaskVehicles[tKey].values());
        tempMetrics[dateKey][tKey].tv = vList.length;
        tempMetrics[dateKey][tKey].tv_details = vList.map((v) => ({
          plate: v.plate,
          driverName: v.driverName,
        }));

        tempMetrics[dateKey][tKey].tv_details.sort((a, b) =>
          (a.driverName || '').localeCompare(b.driverName || '')
        );
      });
    }

    const m = tempMetrics[dateKey];
    m.routingNames = Array.from(m.routingNames || []);

    const distributeTasks = (arrProp) => {
      if (m.unknown[arrProp] && m.unknown[arrProp].length > 0) {
        m.dry[arrProp].push(...m.unknown[arrProp]);
        m.unknown[arrProp] = [];
      }
    };
    ['dp_tasks', 'dt_tasks', 'ma_tasks', 'rt_tasks', 'co_tasks', 'pr_tasks'].forEach(
      distributeTasks
    );

    const distribute = (prop) => {
      if (m.unknown[prop] > 0) {
        const totalKnown = m.dry.dp + m.frozen.dp;
        let addDry = m.unknown[prop];
        if (totalKnown > 0) {
          const dryRatio = m.dry.dp / totalKnown;
          addDry = Math.round(m.unknown[prop] * dryRatio);
        }
        m.dry[prop] += addDry;
        m.frozen[prop] += m.unknown[prop] - addDry;
        m.unknown[prop] = 0;
      }
    };

    ['ma_hist', 'rt', 'co', 'pr', 'tv'].forEach(distribute);

    ['dry', 'frozen'].forEach((type) => {
      m[type].dt_total = m[type].dt_sum + m[type].dt_hist;
      m[type].ma_total = m[type].ma_hist;
      m[type].va = 0;
      m[type].tvu = m[type].tv + 0;
    });
  });

  const dateKeysSorted = Object.keys(tempMetrics).sort();
  const LOOKBACK_LIMIT = 3;

  dateKeysSorted.forEach((currDateKey) => {
    const currM = tempMetrics[currDateKey];

    const currHasExecutedTasks = (currM.actual_tasks_count || 0) > 0;
    const currHasRouting =
      currM.routingNames.length > 0 || currM.dry.dt_sum > 0 || currM.frozen.dt_sum > 0;

    if (currHasExecutedTasks && !currHasRouting) {
      for (let back = 1; back <= LOOKBACK_LIMIT; back++) {
        const d = new Date(currDateKey);
        d.setUTCDate(d.getUTCDate() - back);
        const prevDateKey = formatDateUniversal(d);

        const prevM = tempMetrics[prevDateKey];
        if (prevM) {
          const prevHasExecutedTasks = (prevM.actual_tasks_count || 0) > 0;
          const prevHasRouting =
            prevM.routingNames.length > 0 || prevM.dry.dt_sum > 0 || prevM.frozen.dt_sum > 0;

          if (prevHasRouting && !prevHasExecutedTasks) {
            ['dry', 'frozen'].forEach((type) => {
              if (currM[type].dp === 0) {
                currM[type].dp = prevM[type].dp;
                currM[type].dp_tasks = [...prevM[type].dp_tasks];
              }

              currM[type].dt_total = prevM[type].dt_total;
              currM[type].dt_sum = prevM[type].dt_sum;
              currM[type].dt_hist = prevM[type].dt_hist;
              currM[type].dt_tasks = [...prevM[type].dt_tasks];

              currM[type].ma_total = prevM[type].ma_total;
              currM[type].ma_hist = prevM[type].ma_hist;
              currM[type].ma_tasks = [...prevM[type].ma_tasks];

              if (currM[type].tv === 0) {
                currM[type].tv = prevM[type].tv;
                currM[type].va = prevM[type].va;
                currM[type].tvu = prevM[type].tvu;
                currM[type].tv_details = [...prevM[type].tv_details];
              }

              prevM[type].dp = 0;
              prevM[type].dp_tasks = [];

              prevM[type].dt_total = 0;
              prevM[type].dt_sum = 0;
              prevM[type].dt_hist = 0;
              prevM[type].dt_tasks = [];

              prevM[type].ma_total = 0;
              prevM[type].ma_hist = 0;
              prevM[type].ma_tasks = [];

              prevM[type].tv = 0;
              prevM[type].va = 0;
              prevM[type].tvu = 0;
              prevM[type].tv_details = [];
            });

            prevM.routingNames.forEach((name) => {
              if (!currM.routingNames.includes(name)) currM.routingNames.push(name);
            });
            prevM.routingNames = [];
            break;
          }
        }
      }
    }
  });

  Object.keys(tempMetrics).forEach((dateKey) => {
    tempMetrics[dateKey].routingNames = Array.from(tempMetrics[dateKey].routingNames || []);
  });

  return tempMetrics;
}
