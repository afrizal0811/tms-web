import { getResultHistories } from '@/lib/api/mileapp';
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

export async function calculateTaskSummaryMetrics({
  allTasks,
  allResults,
  fetchedDrivers,
  hasPendingGR,
  fetchWithTracker,
  t,
  isManualMode = false,
}) {
  const taskToRoutingDate = new Map();
  (allResults || []).forEach((res) => {
    const rDate = getDeliveryDateFromRouting(res.createdTime);
    if (!rDate) return;
    const mapTrips = (trips) => {
      (trips || []).forEach((trip) => {
        if (trip.visitId && trip.visitId.includes('-')) {
          taskToRoutingDate.set(trip.visitId.substring(trip.visitId.indexOf('-') + 1), rDate);
        } else if (trip.visitName) {
          taskToRoutingDate.set(trip.visitName, rDate);
        }
      });
    };
    if (res.result?.routing) res.result.routing.forEach((r) => mapTrips(r.trips));
    if (res.result?.dropped) mapTrips(res.result.dropped);
  });

  const tempMetrics = {};
  const uniqueVehicles = {};

  const initDate = (dateKey) => {
    if (!tempMetrics[dateKey]) {
      tempMetrics[dateKey] = {
        actual_tasks_count: 0,
        routingNames: new Set(),
        dry: {
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
        },
        frozen: {
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
        },
        unknown: {
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
        },
      };
      uniqueVehicles[dateKey] = { dry: new Map(), frozen: new Map() };
    }
  };

  const getTaskDetails = (tripRaw) => {
    const visitId = tripRaw?.visitId || '';

    if (!visitId || !visitId.includes('-')) {
      const rawName = tripRaw?.visitName || tripRaw?.name || '';
      const parsed = parseCustomerString(rawName);
      return {
        customerOrder: rawName,
        customerName: parsed.name || t('common.no_data'),
        flow: 'DELIVERY',
      };
    }

    const taskId = visitId.substring(visitId.indexOf('-') + 1);
    const f = allTasks.find(
      (t) =>
        String(t._id) === String(taskId) ||
        String(t.id) === String(taskId) ||
        String(t.taskId) === String(taskId)
    );

    if (!f) {
      const rawName = tripRaw?.visitName || tripRaw?.name || '';
      const parsed = parseCustomerString(rawName);
      return {
        customerOrder: rawName,
        customerName: parsed.name || t('common.no_data'),
        flow: 'DELIVERY',
      };
    }

    return f;
  };

  const groupedByEmail = {};
  (fetchedDrivers || []).forEach((d) => {
    const email = (d.email || '').toLowerCase().trim();
    if (email) {
      if (!groupedByEmail[email]) groupedByEmail[email] = [];
      groupedByEmail[email].push(d);
    }
  });

  const driverMapStorage = {};
  const conditionalPlates = new Set();

  if (Array.isArray(fetchedDrivers)) {
    fetchedDrivers.forEach((d) => {
      if (d.email) driverMapStorage[d.email.toLowerCase()] = (d.storage || '').toUpperCase();

      const email = (d.email || '').toLowerCase().trim();
      let isConditional = false;

      if (email && groupedByEmail[email]) {
        const group = groupedByEmail[email];
        if (group.length > 1) {
          const spaceCount = (d.plat || '').trim().split(' ').length - 1;
          const minSpaces = Math.min(
            ...group.map((v) => (v.plat || '').trim().split(' ').length - 1)
          );

          if (spaceCount > minSpaces && spaceCount > 2) {
            isConditional = true;
          }
        }
      }

      if (isConditional) {
        if (d.plat) {
          conditionalPlates.add(cleanPlat(d.plat));
        }
      }
    });
  }

  if (allTasks && Array.isArray(allTasks)) {
    allTasks.forEach((task) => {
      const dateKey =
        formatDateUniversal(task.startTime, 'YYYY-MM-DD') ||
        formatDateUniversal(task.doneTime, 'YYYY-MM-DD') ||
        formatDateUniversal(task.createdTime, 'YYYY-MM-DD');
      if (!dateKey) return;

      initDate(dateKey);

      tempMetrics[dateKey].actual_tasks_count = (tempMetrics[dateKey].actual_tasks_count || 0) + 1;

      const typeRaw = (task.typeStorage || '').toUpperCase();
      let type = typeRaw.includes('FROZEN')
        ? 'frozen'
        : typeRaw.includes('DRY')
          ? 'dry'
          : 'unknown';

      const sDeliv = task.statusDelivery;
      const statusArr = Array.isArray(sDeliv) ? sDeliv : [sDeliv];

      if (statusArr.some((s) => s === 'PENDING')) {
        tempMetrics[dateKey][type].rt += 1;
        tempMetrics[dateKey][type].rt_tasks.push(task);
      } else if (!hasPendingGR && statusArr.some((s) => s === 'PENDING GR')) {
        tempMetrics[dateKey][type].rt += 1;
        tempMetrics[dateKey][type].rt_tasks.push({ ...task, isWrongGR: true });
      }

      if (statusArr.some((s) => s === 'BATAL')) {
        tempMetrics[dateKey][type].co += 1;
        tempMetrics[dateKey][type].co_tasks.push(task);
      }
      if (statusArr.some((s) => s === 'TERIMA SEBAGIAN')) {
        tempMetrics[dateKey][type].pr += 1;
        tempMetrics[dateKey][type].pr_tasks.push(task);
      }
    });
  }

  const doneResults = (allResults || []).filter(
    (item) => item.dispatchStatus?.toLowerCase() === 'done'
  );

  const resultIdsToFetch = [];
  const resultMap = new Map();

  doneResults.forEach((res) => {
    const dateKey = getDeliveryDateFromRouting(res.createdTime);
    if (!dateKey || !res._id) return;

    initDate(dateKey);
    resultIdsToFetch.push(res._id);
    resultMap.set(res._id, res);

    let routingDroppedDry = 0;
    let routingDroppedFrozen = 0;
    (res.result?.dropped || []).forEach((trip) => {
      const tagStr = Array.isArray(trip.tags) ? trip.tags[0] : trip.tags;
      const prefix = typeof tagStr === 'string' ? tagStr.split('-')[0].toUpperCase() : '';
      const taskDetail = getTaskDetails(trip);

      if (prefix === 'FRZ' || prefix === 'FROZEN') {
        routingDroppedFrozen += 1;
        tempMetrics[dateKey].frozen.dt_tasks.push(taskDetail);
      } else {
        routingDroppedDry += 1;
        tempMetrics[dateKey].dry.dt_tasks.push(taskDetail);
      }
    });
    tempMetrics[dateKey].dry.dt_sum += routingDroppedDry;
    tempMetrics[dateKey].frozen.dt_sum += routingDroppedFrozen;
  });

  try {
    if (resultIdsToFetch.length > 0) {
      const fetchCall = fetchWithTracker
        ? () => fetchWithTracker(() => getResultHistories(resultIdsToFetch), 'Batch Histories')
        : () => getResultHistories(resultIdsToFetch);
      const batchData = await fetchCall();

      (batchData || []).forEach((item) => {
        const originalRes = resultMap.get(item.resultId);
        if (!originalRes || !item.history || !item.history[0]) return;
        const dateKey = getDeliveryDateFromRouting(originalRes.createdTime);
        if (!dateKey) return;

        const { manual } = item.history[0];
        let histDry = 0;
        let histFrozen = 0;
        let histMaDry = 0;
        let histMaFrozen = 0;

        (manual?.data || []).forEach((h) => {
          const vToClean = cleanPlat(h.vehicleTo);
          const foundDriver = fetchedDrivers.find(
            (d) => cleanPlat(d.plat) && vToClean.includes(cleanPlat(d.plat))
          );
          const storage = foundDriver ? (foundDriver.storage || '').toUpperCase() : 'DRY';
          const isFrozen = storage.includes('FROZEN');

          (h.visits || []).forEach((v) => {
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
      });
    }
  } catch (e) {
    console.error('Error fetching result histories', e);
  }

  const routingDateVehicles = {};
  doneResults.forEach((res) => {
    const dateKey = getDeliveryDateFromRouting(res.createdTime);
    if (!dateKey) return;
    if (!routingDateVehicles[dateKey]) routingDateVehicles[dateKey] = new Map();

    if (tempMetrics[dateKey] && res.name) {
      tempMetrics[dateKey].routingNames.add(res.name);
    }

    (res.result?.routing || []).forEach((route) => {
      const validTrips = (route.trips || []).filter((t) => !t.isHub);
      if (validTrips.length === 0) return;

      const rawEmail = (route.assignee || route.email || '').toLowerCase().trim();
      const strictBasePlate = route.basePlat || route.vehicleName || '';
      const baseCanonical =
        strictBasePlate.replace(/\s+/g, '').toLowerCase() || `unknown-${Math.random()}`;

      const foundDriver =
        fetchedDrivers.find((d) => (d.email || '').toLowerCase() === rawEmail) ||
        fetchedDrivers.find((d) => cleanPlat(d.plat) === baseCanonical);

      const storage = foundDriver ? (foundDriver.storage || 'DRY').toUpperCase() : 'DRY';
      const driverName =
        route.driverName || (foundDriver ? foundDriver.name : route.assignee || '-');

      const finalPlate = strictBasePlate;
      const type = storage.includes('FROZEN') ? 'frozen' : 'dry';

      if (tempMetrics[dateKey] && tempMetrics[dateKey][type]) {
        validTrips.forEach((trip) => {
          const taskDetail = getTaskDetails(trip);
          tempMetrics[dateKey][type].dp_tasks.push(taskDetail);
        });
      }

      if (!isValidPlate(finalPlate) || !isValidDriver(driverName)) return;

      if (!routingDateVehicles[dateKey].has(baseCanonical)) {
        routingDateVehicles[dateKey].set(baseCanonical, {
          plate: finalPlate,
          driverName,
          storageType: type,
          visits: validTrips.length,
        });
      } else {
        routingDateVehicles[dateKey].get(baseCanonical).visits += validTrips.length;
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
        isManualMode || (Array.isArray(allTasks) && allTasks.some((t) => Boolean(t.typeStorage)));

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
            (fetchedDrivers || []).find(
              (d) => rawEmail && (d.email || '').toLowerCase().trim() === rawEmail
            ) ||
            (fetchedDrivers || []).find((d) => {
              if (!baseCanonical) return false;
              const dPlatClean = cleanPlat(d.plat);
              const dBasePlatClean = cleanPlat(d.basePlat);
              return dPlatClean === baseCanonical || dBasePlatClean === baseCanonical;
            });

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

          // TV & tv_details: Only count and display paired driver & vehicle (having valid license plate)
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
            const otherType = type === 'dry' ? 'frozen' : 'dry';

            if (dailyTaskVehicles[otherType].has(canonicalPlate)) {
              if (foundDriver && foundDriver.storage) {
                const masterIsFrozen = foundDriver.storage.toUpperCase().includes('FROZEN');
                const masterType = masterIsFrozen ? 'frozen' : 'dry';
                if (masterType !== otherType) {
                  dailyTaskVehicles[otherType].delete(canonicalPlate);
                  dailyTaskVehicles[type].set(canonicalPlate, {
                    plate: displayPlate,
                    driverName: finalDriverName,
                  });
                }
              }
            } else if (!dailyTaskVehicles[type].has(canonicalPlate)) {
              dailyTaskVehicles[type].set(canonicalPlate, {
                plate: displayPlate,
                driverName: finalDriverName,
              });
            } else {
              const existing = dailyTaskVehicles[type].get(canonicalPlate);
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
