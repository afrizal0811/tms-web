import prisma from '@/lib/prisma';
import { formatMinutesToHHMM, formatUTC7, getBasePlate } from '@/lib/utils';
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
  try {
    const { searchParams } = new URL(request.url);
    const resolvedParams = await params;
    const id = resolvedParams.id;
    const hubId = searchParams.get('hubId');

    if (!id) {
      return NextResponse.json(
        { error: 'Parameter "id" sangat dibutuhkan untuk mengambil data spesifik' },
        { status: 400 }
      );
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    const apiToken = process.env.API_TOKEN;

    if (!apiUrl || !apiToken) {
      console.error(
        'Konfigurasi server hilang: NEXT_PUBLIC_API_URL atau API_TOKEN tidak ditemukan.'
      );
      return NextResponse.json({ error: 'Kesalahan konfigurasi server internal' }, { status: 500 });
    }

    const externalUrl = new URL(`${apiUrl}/task/${id}`);

    const externalResponse = await fetch(externalUrl.toString(), {
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
    });

    const fetchData = await externalResponse.json();
    let data = fetchData ? fetchData.task : fetchData;

    try {
      const usersUrl = new URL(`${apiUrl}/users`);
      const usersResponse = await fetch(usersUrl.toString(), {
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (usersResponse.ok) {
        const usersFetchData = await usersResponse.json();
        const usersList = usersFetchData?.data || [];
        const userMap = {};
        usersList.forEach((u) => {
          if (u.email) {
            userMap[u.email.toLowerCase().trim()] = u.name;
          }
        });

        const mapUserName = (email) => {
          if (!email) return null;
          const cleanEmail = String(email).toLowerCase().trim();
          return userMap[cleanEmail] || email;
        };

        data.createdByName = mapUserName(data.createdBy);
        data.updatedByName = mapUserName(data.updatedBy);
        data.assignedByName = mapUserName(data.assignedBy);
        data.doneByName = mapUserName(data.doneBy);
      }
    } catch (userErr) {
      console.error('Gagal mengambil data users:', userErr);
    }

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

    if (data.startTime) data.startTime = formatUTC7(data.startTime, 'YYYY-MM-DDTHH:mm:ss');
    if (data.endTime) data.endTime = formatUTC7(data.endTime, 'YYYY-MM-DDTHH:mm:ss');
    if (data.assignedTime) data.assignedTime = formatUTC7(data.assignedTime, 'YYYY-MM-DDTHH:mm:ss');
    if (data.updatedTime) data.updatedTime = formatUTC7(data.updatedTime, 'YYYY-MM-DDTHH:mm:ss');
    if (data.doneTime) data.doneTime = formatUTC7(data.doneTime, 'YYYY-MM-DDTHH:mm:ss');
    if (data.createdTime) data.createdTime = formatUTC7(data.createdTime, 'YYYY-MM-DDTHH:mm:ss');
    if (data.klikJikaSudahSampai)
      data.klikJikaSudahSampai = formatUTC7(data.klikJikaSudahSampai, 'YYYY-MM-DDTHH:mm:ss');
    if (data.page1DoneTime)
      data.page1DoneTime = formatUTC7(data.page1DoneTime, 'YYYY-MM-DDTHH:mm:ss');
    if (data.page2DoneTime)
      data.page2DoneTime = formatUTC7(data.page2DoneTime, 'YYYY-MM-DDTHH:mm:ss');
    if (data.page3DoneTime)
      data.page3DoneTime = formatUTC7(data.page3DoneTime, 'YYYY-MM-DDTHH:mm:ss');

    if (data.volumeCbm != null) data.volumeCbm = Number(Number(data.volumeCbm).toFixed(2));
    if (data.weightKg != null) data.weightKg = Number(Number(data.weightKg).toFixed(2));

    if (data.distance != null) data.distance = Number((data.distance / 1000).toFixed(2));
    if (data.travelDistance != null)
      data.travelDistance = Number((data.travelDistance / 1000).toFixed(2));

    if (data.travelDuration != null)
      data.travelDuration = formatMinutesToHHMM(Number(data.travelDuration), false);

    if (data.eta && typeof data.eta === 'string') data.eta = data.eta.substring(0, 5);
    if (data.etd && typeof data.etd === 'string') data.etd = data.etd.substring(0, 5);

    delete data.assignedVehicle;
    delete data.parentId;
    delete data.subId;
    delete data.priority;
    delete data.totalSo;
    delete data.originalWeight;
    delete data.originalVolume;
    delete data.expectedVehicle;
    delete data.vehicleCapacity;
    delete data.groupVisit;
    delete data.orderIndex;
    delete data.organization;
    delete data.content;
    delete data.title;
    delete data.flowId;
    delete data.organizationId;
    delete data.hub;
    delete data.isDeleted;
    delete data.taskType;
    delete data.assignedTo;
    delete data.visitGroup;
    delete data.visitGroupPriority;
    delete data.appVersion;
    delete data.deviceInformation;
    delete data.createdCoordinate;
    delete data.doneFrom;
    delete data.expectedDoneTime;
    delete data.geoLock;
    delete data.geoLockTrigger;
    delete data.idLocal;
    delete data.idleDuration;
    delete data.inLocation;
    delete data.isLastDoneOrder;
    delete data.label;
    delete data.namaPenerimaPic;
    delete data.openTaskTime;
    delete data.outLocation;
    delete data.photoDelivery_0_id;
    delete data.photoDelivery_0_path;
    delete data.photoDelivery_0_url;
    delete data.tandaTanganPenerima_path;
    delete data.tandaTanganPenerima_url;
    delete data.useGeoLock;
    delete data.workflow;

    const assigneeEmail =
      data.assignee && data.assignee.length > 0 ? data.assignee[0].toLowerCase().trim() : null;
    const driverData = assigneeEmail ? driversByEmail[assigneeEmail] : null;

    if (driverData) {
      data.driverName = driverData.name;
      data.basePlat = driverData.basePlat;
      data.vehicleType = driverData.type;
      data.maxVolume = driverData.maxVolume;
      data.maxWeight = driverData.maxWeight;
    }

    data.weightPct =
      data.maxWeight && data.weightKg != null
        ? `${((data.weightKg / data.maxWeight) * 100).toFixed(2)}%`
        : '0%';
    data.volumePct =
      data.maxVolume && data.volumeCbm != null
        ? `${((data.volumeCbm / data.maxVolume) * 100).toFixed(2)}%`
        : '0%';

    if (Array.isArray(data.gpsSesuai)) data.gpsSesuai = data.gpsSesuai.join(', ');
    if (Array.isArray(data.statusDelivery)) data.statusDelivery = data.statusDelivery.join(', ');
    if (Array.isArray(data.assignee)) data.assignee = data.assignee.join(', ');

    if (!externalResponse.ok) {
      console.error(`API eksternal (/task/${id}) error:`, data);
      return NextResponse.json(
        {
          error: `Gagal mengambil data task dengan ID ${id}`,
          details: data,
        },
        {
          status: externalResponse.status,
        }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error Single Result:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Kesalahan sistem tidak diketahui';
    return NextResponse.json(
      {
        error: 'Gagal mengambil atau memproses data spesifik dari API eksternal',
        detail: errorMessage,
      },
      { status: 500 }
    );
  }
}
