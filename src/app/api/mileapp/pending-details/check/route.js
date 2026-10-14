import prisma from '@/lib/prisma';
import { formatDateUniversal, normalizeEmail, toApiDateString } from '@/lib/utils';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const TARGET_STATUSES = [
  'BATAL',
  'CANCEL',
  'TERIMA SEBAGIAN',
  'PARTIAL',
  'PENDING',
  'PENDING GR',
  'PENDING_GR',
];

const checkCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes in-memory cache

function getActiveMonthDateRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  return [start, end];
}

function createDateChunks(start, end, maxDays) {
  const chunks = [];
  let curr = new Date(start);
  while (curr <= end) {
    let next = new Date(curr);
    next.setDate(next.getDate() + maxDays - 1);
    next.setHours(23, 59, 59, 999);
    if (next > end) next = new Date(end);
    chunks.push({ from: toApiDateString(curr), to: toApiDateString(next) });
    curr = new Date(next);
    curr.setDate(curr.getDate() + 1);
    curr.setHours(0, 0, 0, 0);
  }
  return chunks;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const hubId = searchParams.get('hubId');
    const customStart = searchParams.get('startDate');
    const customEnd = searchParams.get('endDate');

    let startDate, endDate;
    if (customStart && customEnd) {
      startDate = new Date(customStart);
      endDate = new Date(customEnd);
      endDate.setHours(23, 59, 59, 999);
    } else {
      [startDate, endDate] = getActiveMonthDateRange();
    }

    const startStr = formatDateUniversal(startDate, 'YYYY-MM-DD');
    const endStr = formatDateUniversal(endDate, 'YYYY-MM-DD');

    const cacheKey = `${hubId || 'all'}_${startStr}_${endStr}`;
    const cached = checkCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return NextResponse.json({ count: cached.count }, { status: 200 });
    }

    const driverWhere = hubId ? { hubs: { some: { id: hubId } } } : {};
    const rawDrivers = await prisma.driver.findMany({ where: driverWhere });

    const validDriverEmails = new Set();
    rawDrivers.forEach((d) => {
      const plat = d.plat || '';
      if (!plat || plat.trim() === '' || plat.toUpperCase().includes('DEMO')) return;
      if (d.email) {
        validDriverEmails.add(normalizeEmail(d.email));
      }
    });

    if (validDriverEmails.size === 0) {
      checkCache.set(cacheKey, { count: 0, timestamp: Date.now() });
      return NextResponse.json({ count: 0 }, { status: 200 });
    }

    const taskStartObj = new Date(startDate);
    taskStartObj.setDate(taskStartObj.getDate() - 4);
    taskStartObj.setHours(0, 0, 0, 0);

    const taskEndObj = new Date(endDate);
    taskEndObj.setDate(taskEndObj.getDate() + 4);
    taskEndObj.setHours(23, 59, 59, 999);

    const taskRanges = createDateChunks(taskStartObj, taskEndObj, 5);

    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    const apiToken = process.env.API_TOKEN;

    if (!apiUrl || !apiToken) {
      return NextResponse.json({ error: 'Variabel API tidak diatur di server.' }, { status: 500 });
    }

    const taskFields = 'assignee,statusDelivery,status,startTime,doneTime,_id';

    const fetchChunk = async (range) => {
      try {
        const externalUrl = new URL(`${apiUrl}/tasks`);
        if (hubId) externalUrl.searchParams.append('hubId', hubId);
        externalUrl.searchParams.append('timeFrom', range.from);
        externalUrl.searchParams.append('timeTo', range.to);
        externalUrl.searchParams.append('status', 'ONGOING,DONE');
        externalUrl.searchParams.append('timeBy', 'startTime');
        externalUrl.searchParams.append('limit', '1000');
        externalUrl.searchParams.append('fields', taskFields);

        const res = await fetch(externalUrl.toString(), {
          headers: {
            Authorization: `Bearer ${apiToken}`,
            'Content-Type': 'application/json',
          },
        });

        if (!res.ok) return [];
        const json = await res.json();
        return Array.isArray(json) ? json : json?.data || json?.tasks?.data || [];
      } catch (err) {
        console.error('Error fetching task chunk for pending check:', err);
        return [];
      }
    };

    const chunkResults = await Promise.all(taskRanges.map((range) => fetchChunk(range)));
    const allTasks = chunkResults.flat();

    const targetTaskIds = [];
    allTasks.forEach((task) => {
      const dObj = new Date(task.startTime || task.doneTime);
      if (!isNaN(dObj.getTime())) {
        const wibDate = formatDateUniversal(dObj, 'YYYY-MM-DD');
        if (wibDate < startStr || wibDate > endStr) return;
      }

      let statusDeliveryRaw = '';
      if (Array.isArray(task.statusDelivery)) {
        statusDeliveryRaw = task.statusDelivery[0] || '';
      } else if (typeof task.statusDelivery === 'string') {
        statusDeliveryRaw = task.statusDelivery.split(',')[0];
      } else if (task.statusDelivery) {
        statusDeliveryRaw = String(task.statusDelivery);
      } else if (typeof task.status === 'string') {
        statusDeliveryRaw = task.status.split(',')[0];
      } else if (task.status) {
        statusDeliveryRaw = String(task.status);
      }
      const status = statusDeliveryRaw.trim().toUpperCase();

      if (!TARGET_STATUSES.includes(status)) return;

      let emailRaw = '';
      if (Array.isArray(task.assignee)) {
        emailRaw = task.assignee[0] || '';
      } else if (typeof task.assignee === 'string') {
        emailRaw = task.assignee.split(',')[0];
      } else if (task.assignee) {
        emailRaw = String(task.assignee);
      }
      const email = normalizeEmail(emailRaw);
      if (!validDriverEmails.has(email)) return;

      targetTaskIds.push(task._id);
    });

    if (targetTaskIds.length === 0) {
      checkCache.set(cacheKey, { count: 0, timestamp: Date.now() });
      return NextResponse.json({ count: 0 }, { status: 200 });
    }

    const existingDetails = await prisma.pendingDetail.findMany({
      where: { taskId: { in: targetTaskIds } },
    });

    const detailsMap = new Map();
    existingDetails.forEach((pd) => {
      detailsMap.set(pd.taskId, pd);
    });

    let uncompletedCount = 0;
    targetTaskIds.forEach((id) => {
      const pd = detailsMap.get(id);
      const hasAnyData =
        pd &&
        Boolean(
          (pd.groupReason && pd.groupReason.trim() !== '' && pd.groupReason !== '-') ||
            (pd.detailReason && pd.detailReason.trim() !== '' && pd.detailReason !== '-') ||
            (pd.internalExternal &&
              pd.internalExternal.trim() !== '' &&
              pd.internalExternal !== '-') ||
            (pd.pic && pd.pic.trim() !== '' && pd.pic !== '-')
        );

      if (!hasAnyData) {
        uncompletedCount++;
      }
    });

    checkCache.set(cacheKey, { count: uncompletedCount, timestamp: Date.now() });
    return NextResponse.json({ count: uncompletedCount }, { status: 200 });
  } catch (error) {
    console.error('Error Get Pending Details Check:', error);
    return NextResponse.json(
      { error: 'Gagal mengecek pending details', detail: error.message },
      { status: 500 }
    );
  }
}
