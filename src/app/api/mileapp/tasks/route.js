import prisma from '@/lib/prisma';
import { formatMinutesToHHMM, formatUTC7, getBasePlate } from '@/lib/utils';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const hubId = searchParams.get('hubId');
    const timeFrom = searchParams.get('timeFrom');
    const timeTo = searchParams.get('timeTo');
    const status = searchParams.get('status');
    const timeBy = searchParams.get('timeBy');
    const limit = searchParams.get('limit') || 1000;
    const fields = searchParams.get('fields');

    if (!timeFrom || !timeTo || !status || !timeBy) {
      return NextResponse.json({ error: 'Missing required query parameters' }, { status: 400 });
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    const apiToken = process.env.API_TOKEN;

    if (!apiUrl || !apiToken) {
      return NextResponse.json({ error: 'Variabel API tidak diatur di server.' }, { status: 500 });
    }

    const fetchTasksPage = async (pageNumber) => {
      const externalUrl = new URL(`${apiUrl}/tasks`);
      if (hubId) {
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
      return NextResponse.json(firstPageData);
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

    firstPageData.tasks.data = allTasks;
    firstPageData.tasks.to = allTasks.length;
    firstPageData.tasks.total = allTasks.length;

    const where = hubId ? { hubs: { some: { id: hubId } } } : {};
    const [rawDrivers, mappingsDB] = await Promise.all([
      prisma.driver.findMany({ where }),
      prisma.vehicleMapping.findMany(),
    ]);

    const mappingsObj = mappingsDB.reduce((acc, curr) => {
      acc[curr.plat] = curr.mappedType;
      return acc;
    }, {});

    const driversByEmail = {};
    rawDrivers.forEach((d) => {
      let mappedTypeStr = d.type;
      if (d.plat && mappingsObj[d.plat]) {
        mappedTypeStr = d.storage ? `${d.storage}-${mappingsObj[d.plat]}` : mappingsObj[d.plat];
      }

      const email = (d.email || '').toLowerCase().trim();
      if (email && email !== '-') {
        driversByEmail[email] = {
          ...d,
          type: mappedTypeStr,
          basePlat: getBasePlate(d.plat),
        };
      }
    });

    // Sorting data secara ascending berdasarkan createdTime sebelum nilai tanggal di-format menjadi string
    allTasks.sort((a, b) => new Date(a.createdTime || 0) - new Date(b.createdTime || 0));

    allTasks.forEach((task) => {
      if (task.startTime) task.startTime = formatUTC7(task.startTime, 'DD/MM/YYYY HH:mm');
      if (task.endTime) task.endTime = formatUTC7(task.endTime, 'DD/MM/YYYY HH:mm');
      if (task.assignedTime) task.assignedTime = formatUTC7(task.assignedTime, 'DD/MM/YYYY HH:mm');
      if (task.doneTime) task.doneTime = formatUTC7(task.doneTime, 'DD/MM/YYYY HH:mm');
      if (task.createdTime) task.createdTime = formatUTC7(task.createdTime, 'DD/MM/YYYY HH:mm');
      if (task.klikJikaSudahSampai)
        task.klikJikaSudahSampai = formatUTC7(task.klikJikaSudahSampai, 'DD/MM/YYYY HH:mm');
      if (task.page1DoneTime)
        task.page1DoneTime = formatUTC7(task.page1DoneTime, 'DD/MM/YYYY HH:mm');
      if (task.page2DoneTime)
        task.page2DoneTime = formatUTC7(task.page2DoneTime, 'DD/MM/YYYY HH:mm');
      if (task.page3DoneTime)
        task.page3DoneTime = formatUTC7(task.page3DoneTime, 'DD/MM/YYYY HH:mm');

      if (task.volumeCbm != null) task.volumeCbm = Number(Number(task.volumeCbm).toFixed(2));
      if (task.weightKg != null) task.weightKg = Number(Number(task.weightKg).toFixed(2));

      if (task.distance != null) task.distance = Number((task.distance / 1000).toFixed(2));
      if (task.travelDistance != null)
        task.travelDistance = Number((task.travelDistance / 1000).toFixed(2));

      if (task.travelDuration != null)
        task.travelDuration = formatMinutesToHHMM(task.travelDuration, false);

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

      if (Array.isArray(task.gpsSesuai)) task.gpsSesuai = task.gpsSesuai.join(', ');
      if (Array.isArray(task.statusDelivery)) task.statusDelivery = task.statusDelivery.join(', ');
      if (Array.isArray(task.assignee)) task.assignee = task.assignee.join(', ');
    });

    console.log('allTasks :', allTasks[1]);
    return NextResponse.json(allTasks);
  } catch (error) {
    console.error('Error Tasks:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Kesalahan sistem tidak diketahui';
    return NextResponse.json(
      {
        error: 'Gagal mengambil atau memproses data tasks dari API eksternal',
        detail: errorMessage,
      },
      { status: 500 }
    );
  }
}
