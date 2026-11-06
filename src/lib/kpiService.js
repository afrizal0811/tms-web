import prisma from '@/lib/prisma';
import { DELIVERY_STATUS_KEYS, normalizeDeliveryStatus } from '@/lib/deliveryStatus';
import {
  formatDateUniversal,
  getBasePlate,
  normalizeEmail,
  parseCustomerString,
} from '@/lib/utils';
import {
  calculateDistanceSummary,
  calculateLoadingCapacity,
  calculateRouteReview,
  calculateRoutingTime,
  calculateVolumeSummary,
} from '@/lib/reportGenerators/reports/kpi/sections';
import { generateSheetRouteReview } from '@/lib/reportGenerators/reports/kpi/sheets/sheetRouteReview';
import { convertLocationHistories } from '@/lib/reportGenerators/helper/convertLocationHistories';

function formatDbTask(dbTask) {
  const cust = parseCustomerString(dbTask.customer_order);
  return {
    id: dbTask.id,
    hubId: dbTask.hub_id,
    routingResultId: dbTask.routing_result_id,
    customerOrder: dbTask.customer_order,
    customerName: cust.fullCustomerName || cust.name || '',
    address: dbTask.address,
    flow: dbTask.flow,
    typeStorage: dbTask.type_storage,
    status: dbTask.status,
    statusDelivery: dbTask.status_delivery,
    alasan: dbTask.alasan,
    deliveryDate: dbTask.delivery_date,
    startTime: dbTask.start_time,
    endTime: dbTask.end_time,
    assignedTime: dbTask.assigned_time,
    doneTime: dbTask.done_time,
    arrivalTime: dbTask.arrival_time,
    assignedVehicleId: dbTask.assigned_vehicle_id,
    assignee: dbTask.assignee,
    driverName: dbTask.driver_name,
    plat: dbTask.plat,
    basePlat: getBasePlate(dbTask.plat),
    vehicleType: dbTask.vehicle_type,
    routePlannedOrder: dbTask.route_planned_order,
    weightKg: dbTask.weight_kg,
    volumeCbm: dbTask.volume_cbm,
    distance: dbTask.distance,
    travelDistance: dbTask.travel_distance,
    travelDuration: dbTask.travel_duration,
    expectedCoordinate: dbTask.expected_coordinate,
    doneCoordinate: dbTask.done_coordinate,
    newCoordinate: dbTask.new_coordinate,
  };
}

function parseJsonField(val, fallback = {}) {
  if (typeof val === 'string') {
    try {
      return JSON.parse(val || '{}');
    } catch {
      return fallback;
    }
  }
  return val || fallback;
}

function formatDbRoutingResult(item) {
  const hubTimes = parseJsonField(item.hub_times, {});
  const totalDistance = parseJsonField(item.total_distance, {});
  const timeData = parseJsonField(item.time, {});

  const formattedTime = {};
  for (const [p, t] of Object.entries(timeData)) {
    formattedTime[p] = {
      spentTime: Number(t.spentTime ?? t.spent_time) || 0,
      visitTime: Number(t.visitTime ?? t.visit_time) || 0,
      travelTime: Number(t.travelTime ?? t.travel_time) || 0,
      waitingTime: Number(t.waitingTime ?? t.waiting_time) || 0,
    };
  }

  return {
    id: item.id,
    hubId: item.hub_id,
    name: item.name,
    deliveryDate: item.delivery_date,
    totalDistance,
    time: formattedTime,
    hubTimes,
  };
}

export async function validateKpiReadiness({ hubId, deliveryDate }) {
  const todayStr = formatDateUniversal(new Date(), 'YYYY-MM-DD');
  if (deliveryDate >= todayStr) {
    return {
      status: 'NOT_H_PLUS_ONE',
      message: 'Tanggal pengiriman belum memenuhi ketentuan H+1.',
    };
  }

  const tasks = await prisma.task.findMany({
    where: {
      hub_id: hubId,
      delivery_date: deliveryDate,
    },
  });

  if (tasks.length === 0) {
    return {
      status: 'NO_TASKS',
      message: 'Tidak ada data task untuk tanggal ini.',
    };
  }

  const hasOngoing = tasks.some((t) => {
    const s = (t.status || '').trim().toUpperCase();
    const sd = (t.status_delivery || '').trim().toUpperCase();
    return (
      s === 'ONGOING' ||
      s === 'BERJALAN' ||
      sd === 'ONGOING' ||
      sd === 'BERJALAN' ||
      normalizeDeliveryStatus(t.status) === DELIVERY_STATUS_KEYS.ONGOING ||
      normalizeDeliveryStatus(t.status_delivery) === DELIVERY_STATUS_KEYS.ONGOING
    );
  });

  if (hasOngoing) {
    return {
      status: 'ONGOING_TASKS',
      message: 'Terdapat task yang masih berjalan.',
    };
  }

  const pendingTasks = tasks.filter((t) => {
    const sdNorm = normalizeDeliveryStatus(t.status_delivery);
    return sdNorm === DELIVERY_STATUS_KEYS.PENDING;
  });

  if (pendingTasks.length > 0) {
    const taskIds = pendingTasks.map((t) => t.id);
    const existingDetails = await prisma.pendingDetail.findMany({
      where: { task_id: { in: taskIds } },
    });
    const pendingMap = new Map();
    existingDetails.forEach((pd) => pendingMap.set(pd.task_id, pd));

    const missingTasks = [];
    pendingTasks.forEach((t) => {
      const pd = pendingMap.get(t.id);
      const effectiveStatus = pd?.new_status || t.status_delivery;
      const isSuccessConversion =
        normalizeDeliveryStatus(effectiveStatus) === DELIVERY_STATUS_KEYS.SUCCESS;
      if (isSuccessConversion) return;

      const hasReason = Boolean(
        pd &&
          ((pd.group_reason && pd.group_reason.trim() !== '' && pd.group_reason !== '-') ||
            (pd.pic && pd.pic.trim() !== '' && pd.pic !== '-') ||
            (pd.detail_reason && pd.detail_reason.trim() !== '' && pd.detail_reason !== '-'))
      );

      if (!hasReason) {
        missingTasks.push({
          id: t.id,
          deliveryDate: t.delivery_date,
          customerOrder: t.customer_order || '',
          alasan: t.alasan || '',
          originalStatus: t.status_delivery || t.status,
          statusDelivery: effectiveStatus || t.status_delivery || t.status,
          plat: t.plat,
          driverName: t.driver_name,
          typeStorage: t.type_storage,
          assignee: t.assignee,
          pendingDetail: pd || null,
        });
      }
    });

    if (missingTasks.length > 0) {
      return {
        status: 'MISSING_PENDING_REASONS',
        message: 'Terdapat task pending yang belum memiliki pending reason.',
        missingTasks,
      };
    }
  }

  return {
    status: 'READY',
    tasks,
  };
}

export async function processAndStoreKpi({ hubId, deliveryDate, userName = 'system' }) {
  const readiness = await validateKpiReadiness({ hubId, deliveryDate });
  if (readiness.status !== 'READY') {
    return readiness;
  }

  const tasks = readiness.tasks;
  const taskIds = tasks.map((t) => t.id);

  const [pendingDetails, rawResults, rawHistories, rawVehicles, rawDrivers] = await Promise.all([
    prisma.pendingDetail.findMany({
      where: { task_id: { in: taskIds } },
    }),
    prisma.routingResult.findMany({
      where: { hub_id: hubId, delivery_date: deliveryDate },
    }),
    prisma.locationHistory.findMany({
      where: { hub_id: hubId, date: deliveryDate },
    }),
    prisma.vehicle.findMany({
      where: { hubs_id: hubId },
      orderBy: [{ license_number: 'asc' }],
    }),
    prisma.driverList.findMany({
      where: { hub_id: hubId },
    }),
  ]);

  const fallbackDrivers =
    rawDrivers.length === 0
      ? await prisma.driver.findMany({
          where: { hubs: { some: { id: hubId } } },
        })
      : [];
  const effectiveDrivers = rawDrivers.length > 0 ? rawDrivers : fallbackDrivers;

  const driverMap = new Map();
  effectiveDrivers.forEach((d) => {
    driverMap.set(d.id, d);
    if (d.email) driverMap.set(d.email.toLowerCase(), d);
  });

  const enrichedVehicles = rawVehicles.map((v) => {
    const driver = v.driver_id ? driverMap.get(v.driver_id) : null;
    const driverName = driver ? driver.name : '-';
    const driverEmail = driver ? driver.email : '';
    const basePlat = v.base_plate || getBasePlate(v.license_number);
    const mappedTypeStr = v.type ? (v.storage ? `${v.storage}-${v.type}` : v.type) : null;

    return {
      ...v,
      id: v.vehicle_id,
      plat: v.license_number,
      basePlat,
      type: mappedTypeStr,
      rawType: v.type,
      driverName,
      driverEmail,
      name: driverName,
      email: driverEmail,
      vmsVehicleId: v.vms_id,
      minWeight: v.min_weight,
      maxWeight: v.max_weight,
      minVolume: v.min_volume,
      maxVolume: v.max_volume,
      oddEven: v.odd_even,
      costFactor: v.cost_factor,
      workingTime: {
        startTime: v.start_time,
        endTime: v.end_time,
        multiday: v.multiday,
      },
      breakTime: {
        startTime: v.start_break,
        endTime: v.end_break,
      },
    };
  });

  const pendingMap = new Map();
  pendingDetails.forEach((pd) => {
    pendingMap.set(pd.task_id, {
      id: pd.id,
      taskId: pd.task_id,
      date: pd.date,
      new_status: pd.new_status,
      internalExternal: pd.internal_external,
      detailReason: pd.detail_reason,
      groupReason: pd.group_reason,
      pic: pd.pic,
      created_by: pd.created_by,
      updated_by: pd.updated_by,
      createdAt: pd.created_at,
      updatedAt: pd.updated_at,
    });
  });

  const taskList = tasks.map((t) => {
    const base = formatDbTask(t);
    base.pendingDetail = pendingMap.get(t.id) || null;
    return base;
  });

  const resultsData = rawResults.map(formatDbRoutingResult);

  const formattedHistories = rawHistories.map((h) => ({
    id: h.id,
    email: h.email,
    driverName: h.driver_name,
    startTime: h.start_time,
    trackedTime: h.tracked_time,
    finish: {
      finishTime: h.finish_time,
      totalDistance: h.total_distance || 0,
      totalDuration: h.total_duration || 0,
    },
  }));

  const singleDateHistories = formattedHistories.filter(
    (item) => item.startTime && item.startTime.startsWith(deliveryDate)
  );
  const { kpiHistories } = convertLocationHistories(singleDateHistories, enrichedVehicles);

  const emailDriverMap = {};
  enrichedVehicles.forEach((d) => {
    const email = normalizeEmail(d.email);
    if (email) emailDriverMap[email] = (d.name || '').toUpperCase();
  });

  const g1 = calculateVolumeSummary(resultsData, taskList, emailDriverMap, enrichedVehicles);
  const g2 = calculateRoutingTime(resultsData, emailDriverMap, enrichedVehicles, taskList);
  const g3 = calculateDistanceSummary(
    resultsData,
    kpiHistories,
    emailDriverMap,
    enrichedVehicles,
    taskList
  );
  const g4 = calculateLoadingCapacity(
    resultsData,
    kpiHistories,
    enrichedVehicles,
    taskList,
    emailDriverMap
  );
  const g5 = calculateRouteReview(taskList, enrichedVehicles, kpiHistories, g2.detailRows);

  const { sumOvertime } = generateSheetRouteReview(
    g5.routeReviewRows,
    g5.startFinishRows,
    g2.detailRows
  );

  let totalMenitEstDry = 0;
  let totalMenitEstFrz = 0;
  const seenRouting = new Set();
  if (g2 && Array.isArray(g2.detailRows)) {
    g2.detailRows.forEach((row) => {
      if (!row.isNoRoutingData) {
        const spentTimeHHMM = `${Math.floor(row.spent / 60)}:${String(row.spent % 60).padStart(2, '0')}`;
        const key = `${row.routing}|${getBasePlate((row.plat || '').toUpperCase().trim())}|${row.driver}|${row.visit}|${row.travel}|${row.wait}|${row.spent}|${spentTimeHHMM}`;
        if (!seenRouting.has(key)) {
          seenRouting.add(key);
          if (row.category === 'DRY') totalMenitEstDry += row.spent;
          else if (row.category === 'FROZEN') totalMenitEstFrz += row.spent;
        }
      }
    });
  }

  const estHourDry = g2?.opsHoursDry != null ? g2.opsHoursDry : Math.round(totalMenitEstDry / 60);
  const estHourFrz = g2?.opsHoursFrz != null ? g2.opsHoursFrz : Math.round(totalMenitEstFrz / 60);

  let actHourDry = 0;
  let actHourFrz = 0;
  if (g5 && Array.isArray(g5.startFinishRows)) {
    const dedupeSF = new Map();
    g5.startFinishRows.forEach((row) => {
      let durasiHour = 0;
      if (typeof row.durasi === 'string' && row.durasi.includes(':')) {
        const parts = row.durasi.split(':');
        const totalMenit = (parseInt(parts[0], 10) || 0) * 60 + (parseInt(parts[1], 10) || 0);
        durasiHour = Math.round(totalMenit / 60);
      }
      const key = `${row.tipe}|${row.driver}|${row.startTime}|${row.finishTime}|${row.durasi}`;
      dedupeSF.set(key, { durasiHour, tipe: row.tipe });
    });
    dedupeSF.forEach((val) => {
      if (val.tipe === 'DRY') {
        actHourDry += val.durasiHour;
      } else if (val.tipe === 'FROZEN') {
        actHourFrz += val.durasiHour;
      }
    });
  }

  const kpiDataPayload = {
    truck_dry: Number(g1.countDry || 0),
    truck_frz: Number(g1.countFrz || 0),
    total_truck: Number(g1.countTotal || 0),
    task_dry: Number(g1.ttDry || 0),
    task_frz: Number(g1.ttFrz || 0),
    pending_dry: Number(g1.rtDry || 0),
    pending_frz: Number(g1.rtFrz || 0),
    pending_routing: Number(g1.rtRouting ?? 0),
    pending_driver: Number(g1.rtDriver ?? 0),
    pending_sales: Number(g1.rtSales ?? 0),
    pending_customer: Number(g1.rtCustomer ?? 0),
    pending_other: Number(g1.rtOther ?? 0),
    est_hour_dry: Number(estHourDry || 0),
    est_hour_frz: Number(estHourFrz || 0),
    act_hour_dry: Number(actHourDry || 0),
    act_hour_frz: Number(actHourFrz || 0),
    est_dist_dry: Number(g3.estDistanceDry || 0),
    est_dist_frz: Number(g3.estDistanceFrz || 0),
    act_dist_dry: Number(g4.actDistDryKm || 0),
    act_dist_frz: Number(g4.actDistFrzKm || 0),
    capacity_kg_dry: Number(g4.capWeightDry || 0),
    total_kg_dry: Number(g4.actWeightDry || 0),
    capacity_cbm_dry: Number(g4.capVolDry || 0),
    total_cbm_dry: Number(g4.actVolDry || 0),
    capacity_kg_frz: Number(g4.capWeightFrz || 0),
    total_kg_frz: Number(g4.actWeightFrz || 0),
    capacity_cbm_frz: Number(g4.capVolFrz || 0),
    total_cbm_frz: Number(g4.actVolFrz || 0),
    updated_master: Math.round(Number(g5.countMasterMaintenance || 0)),
    route_review: Math.abs(Number(sumOvertime || 0)),
  };

  const savedRecord = await prisma.kpiData.upsert({
    where: {
      hub_id_date: {
        hub_id: hubId,
        date: deliveryDate,
      },
    },
    create: {
      hub_id: hubId,
      date: deliveryDate,
      ...kpiDataPayload,
      created_by: userName,
      updated_by: userName,
    },
    update: {
      ...kpiDataPayload,
      updated_by: userName,
    },
  });

  return {
    status: 'SUCCESS',
    data: savedRecord,
  };
}

export async function processKpiForDates({ hubId, deliveryDates, userName = 'system' }) {
  const dates = Array.isArray(deliveryDates) ? deliveryDates : [deliveryDates];
  const allMissingTasks = [];
  const processedDates = [];

  let hubIds = [hubId];
  if (!hubId || hubId === 'all') {
    const hubs = await prisma.hub.findMany({ where: { is_active: true } });
    hubIds = hubs.map((h) => h.id);
  }

  for (const hId of hubIds) {
    for (const dStr of dates) {
      const res = await processAndStoreKpi({ hubId: hId, deliveryDate: dStr, userName });
      if (res.status === 'MISSING_PENDING_REASONS' && res.missingTasks?.length > 0) {
        allMissingTasks.push(...res.missingTasks);
      } else if (res.status === 'SUCCESS') {
        processedDates.push({ hubId: hId, date: dStr });
      }
    }
  }

  if (allMissingTasks.length > 0) {
    const uniqueMap = new Map();
    allMissingTasks.forEach((t) => {
      if (!uniqueMap.has(t.id)) uniqueMap.set(t.id, t);
    });
    return {
      status: 'MISSING_PENDING_REASONS',
      missingTasks: Array.from(uniqueMap.values()),
      processedDates,
    };
  }

  return {
    status: 'SUCCESS',
    processedDates,
  };
}
