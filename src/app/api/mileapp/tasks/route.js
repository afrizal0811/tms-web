import prisma from '@/lib/prisma';
import {
  formatDateUniversal,
  formatMinutesToHHMM,
  formatUTC7,
  getBasePlate,
  parseCustomerString,
  tomorrowDate,
} from '@/lib/utils';
import { NextResponse } from 'next/server';

function getUtcRange(dateStr, offsetHours = 7) {
  if (!dateStr) return { timeFrom: null, timeTo: null };
  const [y, m, d] = dateStr.split('-').map(Number);
  const startUtcMs = Date.UTC(y, m - 1, d, 0, 0, 0) - offsetHours * 3600 * 1000;
  const endUtcMs = Date.UTC(y, m - 1, d, 23, 59, 59, 999) - offsetHours * 3600 * 1000;

  const timeFrom = new Date(startUtcMs).toISOString().slice(0, 19).replace('T', ' ');
  const timeTo = new Date(endUtcMs).toISOString().slice(0, 19).replace('T', ' ');
  return { timeFrom, timeTo };
}

function getLocalDateFromUtcString(utcStr, offsetHours = 7) {
  if (!utcStr) return null;
  const cleanStr =
    utcStr.includes('T') && utcStr.endsWith('Z') ? utcStr : utcStr.replace(' ', 'T') + 'Z';
  const dateObj = new Date(cleanStr);
  if (isNaN(dateObj.getTime())) {
    return utcStr.split(/[ T]/)[0];
  }
  const shiftedMs = dateObj.getTime() + offsetHours * 3600 * 1000;
  return new Date(shiftedMs).toISOString().split('T')[0];
}

function formatDbTask(dbTask) {
  const cust = parseCustomerString(dbTask.customer_order);
  const others =
    typeof dbTask.others === 'string' ? JSON.parse(dbTask.others || '{}') : dbTask.others || {};
  const listProduct =
    typeof dbTask.list_product === 'string'
      ? JSON.parse(dbTask.list_product || '[]')
      : dbTask.list_product || [];
  const syncUser =
    typeof dbTask.sync_user === 'string'
      ? JSON.parse(dbTask.sync_user || '{}')
      : dbTask.sync_user || {};
  const taskUser =
    typeof dbTask.task_user === 'string'
      ? JSON.parse(dbTask.task_user || '{}')
      : dbTask.task_user || {};

  return {
    _id: dbTask.id,
    id: dbTask.id,
    hubId: dbTask.hub_id,
    routingResultId: dbTask.routing_result_id,
    customerOrder: dbTask.customer_order,
    customerName: cust.fullCustomerName || cust.name || '',
    orderId: cust.invoiceNumber || '',
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
    arrival_time: dbTask.arrival_time,
    klikJikaSudahSampai: dbTask.arrival_time,
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
    eta: dbTask.eta,
    etd: dbTask.etd,
    expectedCoordinate: dbTask.expected_coordinate,
    longlat: dbTask.expected_coordinate,
    doneCoordinate: dbTask.done_coordinate,
    gpsSesuai: dbTask.new_coordinate ? 'TIDAK' : 'YA',
    newCoordinate: dbTask.new_coordinate,
    klikLokasiClient: dbTask.new_coordinate,
    listProduct,
    ...others,
    createdFrom: dbTask.created_from || null,
    syncUser,
    taskUser,
    sync_user: syncUser,
    task_user: taskUser,
    createdTime: taskUser.created_at || null,
    createdBy: taskUser.created_by || null,
    createdByName: taskUser.created_by || null,
    updatedBy: taskUser.updated_by || null,
    updatedByName: taskUser.updated_by || null,
    updatedTime: taskUser.updated_at || null,
    createdAt: taskUser.created_at || null,
    updatedAt: taskUser.updated_at || null,
  };
}

async function saveTasks(tasks, targetHubId, currentUser = 'System') {
  if (!Array.isArray(tasks) || tasks.length === 0) return 0;

  const hubIds = Array.from(new Set(tasks.map((t) => t.hubId || targetHubId).filter(Boolean)));
  const taskIds = Array.from(new Set(tasks.map((t) => String(t._id || t.id)).filter(Boolean)));

  const [existingHubs, existingTasks] = await Promise.all([
    hubIds.length > 0
      ? prisma.hub.findMany({
          where: { id: { in: hubIds } },
          select: { id: true },
        })
      : [],
    taskIds.length > 0
      ? prisma.task.findMany({
          where: { id: { in: taskIds } },
          select: { id: true, status: true, routing_result_id: true, sync_user: true },
        })
      : [],
  ]);

  const validHubSet = new Set(existingHubs.map((h) => h.id));
  const existingTaskMap = new Map(existingTasks.map((t) => [t.id, t]));

  const nowIso = formatUTC7(new Date(), 'YYYY-MM-DDTHH:mm:ss');
  let affectedCount = 0;
  const CHUNK_SIZE = 25;
  for (let i = 0; i < tasks.length; i += CHUNK_SIZE) {
    const chunk = tasks.slice(i, i + CHUNK_SIZE);
    const operations = chunk.map((t) => {
      const id = String(t._id || t.id);
      const existingTask = existingTaskMap.get(id);
      const existingStatus = existingTask?.status;

      if (existingStatus === 'DONE') {
        if (!existingTask?.routing_result_id && t.routingResultId) {
          return prisma.task.update({
            where: { id },
            data: { routing_result_id: t.routingResultId },
          });
        }
        return Promise.resolve(null);
      }

      const resolvedHubId = validHubSet.has(t.hubId)
        ? t.hubId
        : validHubSet.has(targetHubId)
          ? targetHubId
          : existingHubs[0]?.id;

      if (!resolvedHubId) return Promise.resolve(null);

      const routingResultId = t.routingResultId || existingTask?.routing_result_id || null;

      const dateSource = t.startTime || t.createdTime || '';
      const deliveryDate = dateSource.includes('T')
        ? dateSource.split('T')[0]
        : dateSource.split(' ')[0] || '';

      const others = {
        doneOrder: t.doneOrder ?? null,
        isSplitTask: t.isSplitTask,
        openTime: t.openTime,
        closeTime: t.closeTime,
        visitTime: t.visitTime,
        maksimumVehicleType: t.maksimumVehicleType,
        page1DoneTime: t.page1DoneTime,
        page2DoneTime: t.page2DoneTime,
        page3DoneTime: t.page3DoneTime,
        maxWeight: t.maxWeight,
        maxVolume: t.maxVolume,
        weightPct: t.weightPct,
        volumePct: t.volumePct,
      };

      const taskUser = {
        created_by: t.createdBy || null,
        created_at: t.createdTime || null,
        updated_by: t.updatedBy || null,
        updated_at: t.updatedTime || null,
      };

      const existingSyncUser = existingTask?.sync_user
        ? typeof existingTask.sync_user === 'string'
          ? JSON.parse(existingTask.sync_user)
          : existingTask.sync_user
        : null;

      const syncUser = {
        created_by: existingSyncUser?.created_by || currentUser,
        created_at: existingSyncUser?.created_at || nowIso,
        updated_by: currentUser,
        updated_at: nowIso,
      };

      const data = {
        hub_id: resolvedHubId,
        routing_result_id: routingResultId,
        customer_order: t.customerOrder || null,
        address: t.address || null,
        flow: t.flow || null,
        type_storage: t.typeStorage || null,
        status: t.status || null,
        status_delivery: t.statusDelivery || null,
        alasan: t.alasan || null,
        delivery_date: deliveryDate,
        start_time: t.startTime || null,
        end_time: t.endTime || null,
        assigned_time: t.assignedTime || null,
        done_time: t.doneTime || null,
        arrival_time: t.klikJikaSudahSampai || null,
        assigned_vehicle_id: t.assignedVehicleId || null,
        assignee: t.assignee || null,
        driver_name: t.driverName || null,
        plat: t.plat || null,
        vehicle_type: t.vehicleType || null,
        route_planned_order: t.routePlannedOrder != null ? Number(t.routePlannedOrder) : null,
        weight_kg: t.weightKg != null ? Number(t.weightKg) : null,
        volume_cbm: t.volumeCbm != null ? Number(t.volumeCbm) : null,
        distance: t.distance != null ? Number(t.distance) : null,
        travel_distance: t.travelDistance != null ? Number(t.travelDistance) : null,
        travel_duration: t.travelDuration || null,
        eta: t.eta || null,
        etd: t.etd || null,
        expected_coordinate: t.expectedCoordinate || t.longlat || null,
        done_coordinate: t.doneCoordinate || null,
        new_coordinate: t.klikLokasiClient || null,
        list_product: t.listProduct || [],
        others,
        created_from: t.createdFrom || 'API',
        sync_user: syncUser,
        task_user: taskUser,
      };

      if (existingStatus) {
        return prisma.task.update({
          where: { id },
          data,
        });
      }

      return prisma.task.create({
        data: {
          id,
          ...data,
        },
      });
    });

    const results = await Promise.all(operations);
    affectedCount += results.filter(Boolean).length;
  }

  return affectedCount;
}

async function fetchAndEnrichTasks({
  hubId,
  timeFrom,
  timeTo,
  status = 'DONE,ONGOING,UNASSIGNED',
  timeBy = 'startTime',
  limit = 1000,
  fields,
}) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const apiToken = process.env.API_TOKEN;

  if (!apiUrl || !apiToken) {
    throw new Error('Variabel API tidak diatur di server.');
  }

  const fetchTasksPage = async (pageNumber) => {
    const externalUrl = new URL(`${apiUrl}/tasks`);
    if (hubId && hubId !== 'all') {
      externalUrl.searchParams.append('hubId', hubId);
    }
    externalUrl.searchParams.append('timeFrom', timeFrom);
    externalUrl.searchParams.append('timeTo', timeTo);
    externalUrl.searchParams.append('status', status);
    externalUrl.searchParams.append('timeBy', timeBy);
    externalUrl.searchParams.append('limit', limit);
    externalUrl.searchParams.append('page', pageNumber);
    if (fields) {
      externalUrl.searchParams.append('fields', fields);
    }

    const res = await fetch(externalUrl.toString(), {
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      throw new Error(`Error fetching page ${pageNumber}: ${res.statusText}`);
    }
    return res.json();
  };

  const firstPageData = await fetchTasksPage(1);

  if (!firstPageData || !firstPageData.tasks || !Array.isArray(firstPageData.tasks.data)) {
    return [];
  }
  let allTasks = [...firstPageData.tasks.data];
  const lastPage = firstPageData.tasks.last_page || 1;

  if (lastPage > 1) {
    const promises = [];
    for (let page = 2; page <= lastPage; page++) {
      promises.push(fetchTasksPage(page));
    }
    const remainingPages = await Promise.all(promises);

    remainingPages.forEach((pageData) => {
      if (pageData.tasks && Array.isArray(pageData.tasks.data)) {
        allTasks = allTasks.concat(pageData.tasks.data);
      }
    });
  }

  const where = hubId && hubId !== 'all' ? { hubs: { some: { id: hubId } } } : {};
  const [rawDrivers, mappingsDB] = await Promise.all([
    prisma.driver.findMany({ where }),
    prisma.vehicleMapping.findMany(),
  ]);

  const mappingsObj = mappingsDB.reduce((acc, curr) => {
    acc[curr.plat] = curr.mappedType;
    acc[getBasePlate(curr.plat)] = curr.mappedType;
    return acc;
  }, {});

  const driversByEmail = {};
  rawDrivers.forEach((d) => {
    const basePlat = getBasePlate(d.plat);
    const mappedType = mappingsObj[basePlat] || mappingsObj[d.plat];
    let mappedTypeStr = d.type;
    if (mappedType) {
      mappedTypeStr = d.storage ? `${d.storage}-${mappedType}` : mappedType;
    }

    const email = (d.email || '').toLowerCase().trim();
    if (email && email !== '-') {
      driversByEmail[email] = {
        ...d,
        type: mappedTypeStr,
        basePlat,
      };
    }
  });

  allTasks.sort((a, b) => new Date(a.createdTime || 0) - new Date(b.createdTime || 0));

  allTasks.forEach((task) => {
    if (task.startTime) task.startTime = formatUTC7(task.startTime, 'YYYY-MM-DDTHH:mm:ss');
    if (task.endTime) task.endTime = formatUTC7(task.endTime, 'YYYY-MM-DDTHH:mm:ss');
    if (task.assignedTime) task.assignedTime = formatUTC7(task.assignedTime, 'YYYY-MM-DDTHH:mm:ss');
    if (task.doneTime) task.doneTime = formatUTC7(task.doneTime, 'YYYY-MM-DDTHH:mm:ss');
    if (task.createdTime) task.createdTime = formatUTC7(task.createdTime, 'YYYY-MM-DDTHH:mm:ss');
    if (task.updatedTime) task.updatedTime = formatUTC7(task.updatedTime, 'YYYY-MM-DDTHH:mm:ss');
    if (task.klikJikaSudahSampai)
      task.klikJikaSudahSampai = formatUTC7(task.klikJikaSudahSampai, 'YYYY-MM-DDTHH:mm:ss');
    if (task.page1DoneTime)
      task.page1DoneTime = formatUTC7(task.page1DoneTime, 'YYYY-MM-DDTHH:mm:ss');
    if (task.page2DoneTime)
      task.page2DoneTime = formatUTC7(task.page2DoneTime, 'YYYY-MM-DDTHH:mm:ss');
    if (task.page3DoneTime)
      task.page3DoneTime = formatUTC7(task.page3DoneTime, 'YYYY-MM-DDTHH:mm:ss');

    if (task.volumeCbm != null) task.volumeCbm = Number(Number(task.volumeCbm).toFixed(2));
    if (task.weightKg != null) task.weightKg = Number(Number(task.weightKg).toFixed(2));

    if (task.distance != null) task.distance = Number((task.distance / 1000).toFixed(2));
    if (task.travelDistance != null)
      task.travelDistance = Number((task.travelDistance / 1000).toFixed(2));

    if (task.travelDuration != null) task.travelDuration = formatMinutesToHHMM(task.travelDuration);

    if (task.eta && typeof task.eta === 'string') task.eta = task.eta.substring(0, 5);
    if (task.etd && typeof task.etd === 'string') task.etd = task.etd.substring(0, 5);

    delete task.assignedVehicle;
    delete task.parentId;
    delete task.subId;
    delete task.label;
    delete task.taskType;

    const assigneeEmail =
      task.assignee && task.assignee.length > 0 ? task.assignee[0].toLowerCase().trim() : null;
    const driverData = assigneeEmail ? driversByEmail[assigneeEmail] : null;

    if (driverData) {
      task.driverName = driverData.name;
      task.plat = driverData.plat;
      task.basePlat = driverData.basePlat;
      task.vehicleType = driverData.type;
      task.maxVolume = driverData.maxVolume;
      task.maxWeight = driverData.maxWeight;
    }

    task.weightPct =
      task.maxWeight && task.weightKg != null
        ? `${((task.weightKg / task.maxWeight) * 100).toFixed(2)}%`
        : '0%';
    task.volumePct =
      task.maxVolume && task.volumeCbm != null
        ? `${((task.volumeCbm / task.maxVolume) * 100).toFixed(2)}%`
        : '0%';

    if (Array.isArray(task.statusDelivery)) task.statusDelivery = task.statusDelivery.join(', ');
    if (Array.isArray(task.assignee)) task.assignee = task.assignee.join(', ');
  });

  return allTasks;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const hubId = searchParams.get('hubId');
    const timeFrom = searchParams.get('timeFrom');
    const timeTo = searchParams.get('timeTo');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const status = searchParams.get('status');
    const deliveryDate = searchParams.get('deliveryDate');

    let fromDate = null;
    let toDate = null;

    if (deliveryDate) {
      fromDate = deliveryDate;
      toDate = deliveryDate;
    } else if (dateFrom && dateTo) {
      fromDate = dateFrom.split(/[ T]/)[0];
      toDate = dateTo.split(/[ T]/)[0];
    } else if (dateFrom) {
      fromDate = dateFrom.split(/[ T]/)[0];
      toDate = fromDate;
    } else if (timeFrom && timeTo) {
      fromDate = getLocalDateFromUtcString(timeFrom);
      toDate = getLocalDateFromUtcString(timeTo);
    }

    if (!fromDate && !deliveryDate) {
      return NextResponse.json(
        { error: 'Missing required parameters: deliveryDate, dateRange, or timeFrom & timeTo' },
        { status: 400 }
      );
    }

    const where = {};
    if (fromDate && toDate) {
      where.delivery_date = fromDate === toDate ? fromDate : { gte: fromDate, lte: toDate };
    } else if (fromDate) {
      where.delivery_date = fromDate;
    }

    if (hubId && hubId !== 'all') {
      where.hub_id = hubId;
    }
    if (status && status !== 'all') {
      const statusList = status
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      if (statusList.length === 1) {
        where.status = statusList[0];
      } else if (statusList.length > 1) {
        where.status = { in: statusList };
      }
    }

    const existingDbTasks = await prisma.task.findMany({
      where,
      orderBy: [{ route_planned_order: 'asc' }, { start_time: 'asc' }],
    });

    return NextResponse.json(existingDbTasks.map(formatDbTask));
  } catch (error) {
    console.error('Error Tasks:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Kesalahan sistem tidak diketahui';
    return NextResponse.json(
      {
        error: 'Gagal mengambil data tasks dari database',
        detail: errorMessage,
      },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      autoUpdate,
      deliveryDate,
      hubId,
      timeFrom,
      timeTo,
      status = 'DONE,ONGOING,UNASSIGNED',
      timeBy = 'startTime',
      created_by,
      updated_by,
    } = body;

    const user = updated_by || created_by || 'System';

    if (autoUpdate) {
      const targetWhere = {
        status: { in: ['UNASSIGNED', 'ONGOING'] },
      };
      if (hubId && hubId !== 'all') {
        targetWhere.hub_id = hubId;
      }

      const pendingTasks = await prisma.task.findMany({
        where: targetWhere,
        select: {
          delivery_date: true,
          start_time: true,
        },
      });

      const datesToSync = new Set();
      pendingTasks.forEach((t) => {
        if (t.delivery_date) {
          datesToSync.add(t.delivery_date);
        } else if (t.start_time) {
          datesToSync.add(t.start_time.split(/[ T]/)[0]);
        }
      });

      const todayStr = formatDateUniversal(new Date(), 'YYYY-MM-DD');
      const tomorrowStr = formatDateUniversal(tomorrowDate(true), 'YYYY-MM-DD');
      datesToSync.add(todayStr);
      datesToSync.add(tomorrowStr);

      let totalUpdated = 0;
      for (const dStr of datesToSync) {
        try {
          const { timeFrom: tFrom, timeTo: tTo } = getUtcRange(dStr);
          const tasks = await fetchAndEnrichTasks({
            hubId,
            timeFrom: tFrom,
            timeTo: tTo,
            status: 'DONE,ONGOING,UNASSIGNED',
            timeBy: 'startTime',
          });

          if (tasks.length > 0) {
            const count = await saveTasks(tasks, hubId, user);
            totalUpdated += count;
          }
        } catch (err) {
          console.warn(`[AutoUpdate] Gagal sync tanggal ${dStr}:`, err.message);
        }
      }

      return NextResponse.json({
        message: `Auto-update selesai. ${totalUpdated} tasks diproses.`,
        updatedCount: totalUpdated,
        dates: Array.from(datesToSync),
      });
    }

    let targetDate = deliveryDate;
    let tFrom = timeFrom;
    let tTo = timeTo;

    if (targetDate) {
      const utcRange = getUtcRange(targetDate);
      tFrom = tFrom || utcRange.timeFrom;
      tTo = tTo || utcRange.timeTo;
    } else if (timeFrom && timeTo) {
      targetDate = getLocalDateFromUtcString(timeFrom);
    }

    if (!tFrom || !tTo) {
      return NextResponse.json(
        { error: 'Parameter deliveryDate atau timeFrom & timeTo harus disertakan.' },
        { status: 400 }
      );
    }

    const allTasks = await fetchAndEnrichTasks({
      hubId,
      timeFrom: tFrom,
      timeTo: tTo,
      status,
      timeBy,
    });

    const savedCount = await saveTasks(allTasks, hubId, user);

    return NextResponse.json({
      message: `Berhasil sinkronisasi ${savedCount} data tasks.`,
      syncedCount: savedCount,
      deliveryDate: targetDate,
    });
  } catch (error) {
    console.error('Error Sync Tasks:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Kesalahan sistem tidak diketahui';
    return NextResponse.json(
      {
        error: 'Gagal sinkronisasi data tasks',
        detail: errorMessage,
      },
      { status: 500 }
    );
  }
}
