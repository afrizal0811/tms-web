import prisma from '@/lib/prisma';
import { getBasePlate, isEmpty } from '@/lib/utils';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const hubId = searchParams.get('hubId');

  try {
    const where = hubId ? { hubs: { some: { id: hubId } } } : {};
    const [rawDrivers, mappingsDB] = await Promise.all([
      prisma.driver.findMany({ where }),
      prisma.vehicleMapping.findMany(), 
    ]);

    const mappingsObj = mappingsDB.reduce((acc, curr) => {
      acc[curr.plat] = curr.mappedType;
      return acc;
    }, {});

    const parsed = rawDrivers.map((d) => {
      let mappedTypeStr = d.type;
      if (d.plat && mappingsObj[d.plat]) {
        mappedTypeStr = d.storage ? `${d.storage}-${mappingsObj[d.plat]}` : mappingsObj[d.plat];
      }

      return {
        _id: d.id,
        vehicleId: d.vehicle_id,
        vmsVehicleId: d.vms_id,
        imei: d.imei,
        vmsDriverId: d.vms_driver_id,
        email: d.email,
        name: d.name,
        plat: d.plat,
        basePlat: getBasePlate(d.plat),
        type: mappedTypeStr,
        _rawType: d.type,
        tags: d.tags,
        minWeight: d.minWeight,
        maxWeight: d.maxWeight,
        minVolume: d.minVolume,
        maxVolume: d.maxVolume,
        storage: d.storage,
        oddEven: d.oddEven,
        speed: d.speed,
        costFactor: d.costFactor,
        workingTime: {
          startTime: d.startTime,
          endTime: d.endTime,
          multiday: d.multiday,
        },
        breakTime: {
          startTime: d.startBreakTime,
          endTime: d.endBreakTime,
        },
      };
    });

    const baseMap = new Map();
    parsed.forEach((d) => {
      if (d.plat === d.basePlat && d.type) {
        baseMap.set(d.basePlat, {
          type: d.type,
          tags: d.tags,
          storage: d.storage,
          _rawType: d._rawType,
        });
      }
    });

    const drivers = parsed.map((d) => {
      if (d.plat !== d.basePlat && baseMap.has(d.basePlat)) {
        const m = baseMap.get(d.basePlat);
        return {
          ...d,
          type: m.type,
          tags: m.tags,
          storage: d.storage || m.storage,
          _rawType: m._rawType,
        };
      }
      return d;
    });

    return NextResponse.json(drivers, { status: 200 });
  } catch (error) {
    console.error('Error Driver:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Kesalahan sistem tidak diketahui';
    return NextResponse.json(
      { error: 'Gagal mengambil data driver dari database', detail: errorMessage },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const apiToken = process.env.API_TOKEN;

  try {
    const body = await request.json().catch(() => ({}));
    let hubIds = body.hubIds || [];

    if (hubIds.length === 0) {
      const hubs = await prisma.hub.findMany();
      hubIds = hubs.map((h) => h.id);
    }

    const roles = await prisma.role.findMany();
    const driverRoleIds = roles
      .filter((r) => r.name.toLowerCase().includes('driver'))
      .map((r) => r.id);

    let allTransactions = [];

    for (const hId of hubIds) {
      allTransactions.push(
        prisma.hub.update({
          where: { id: hId },
          data: { drivers: { set: [] } },
        })
      );
    }

    for (const hubId of hubIds) {
      let rawDrivers = [];
      for (const roleId of driverRoleIds) {
        const userRes = await fetch(
          `${apiUrl}/users?hubId=${hubId}&roleId=${roleId}&status=active`,
          {
            headers: { Authorization: `Bearer ${apiToken}` },
            cache: 'no-store',
          }
        );
        if (userRes.ok) {
          const userData = await userRes.json();
          if (userData.data) rawDrivers.push(...userData.data);
        }
      }

      const driverMapByEmail = new Map();
      rawDrivers.forEach((d) => {
        if (d.email) {
          driverMapByEmail.set(d.email.toLowerCase(), d);
        }
      });

      const vehRes = await fetch(`${apiUrl}/vehicles?hubId=${hubId}&limit=10000`, {
        headers: { Authorization: `Bearer ${apiToken}` },
        cache: 'no-store',
      });

      let vehicles = [];
      if (vehRes.ok) {
        const vehData = await vehRes.json();
        vehicles = vehData.data || [];
      }

      const uniquePayloads = new Map();

      for (const vehicle of vehicles) {
        const assigneeEmail = (vehicle.assignee || '').toLowerCase();
        const driverInfo = driverMapByEmail.get(assigneeEmail);
        const plat = vehicle.name || vehicle.plateNumber;
        if (plat && plat.trim() !== '') {
          if (String(plat).toUpperCase().includes('DM')) continue;
          const type = vehicle.tags && vehicle.tags.length > 0 ? vehicle.tags[0] : null;
          const storage = type ? type.split('-')[0] : null;

          const cleanPlate = plat.replace(/\s+/g, '').toUpperCase();
          const driverId = driverInfo ? driverInfo._id : '-';
          const uniqueId = `${driverId}-${cleanPlate}`;

          let wMax = vehicle.capacity?.weight?.max ? parseFloat(vehicle.capacity.weight.max) : null;
          if (isNaN(wMax)) wMax = null;
          let wMin = vehicle.capacity?.weight?.min ? parseFloat(vehicle.capacity.weight.min) : null;
          if (isNaN(wMin)) wMin = null;
          else if (isEmpty(wMin)) wMin = 0;

          let vMax = vehicle.capacity?.volume?.max ? parseFloat(vehicle.capacity.volume.max) : null;
          if (isNaN(vMax)) vMax = null;
          let vMin = vehicle.capacity?.volume?.min ? parseFloat(vehicle.capacity.volume.min) : null;
          if (isNaN(vMin)) vMin = null;
          else if (isEmpty(vMin)) vMin = 0;

          let mDay = vehicle.workingTime?.multiday;
          if (mDay !== null && mDay !== undefined) {
            mDay = parseInt(mDay, 10);
            if (isNaN(mDay)) mDay = null;
          } else {
            mDay = 0;
          }

          let speedVal = vehicle.speed ? parseFloat(vehicle.speed) : null;
          let costFactorVal = vehicle.fixedCost ? parseFloat(vehicle.fixedCost) : null;
          let tagsStr =
            vehicle.tags && vehicle.tags.length > 0 ? JSON.stringify(vehicle.tags) : null;

          const dataPayload = {
            name: driverInfo ? driverInfo.name : '-',
            email: driverInfo ? driverInfo.email : '',
            plat: plat,
            type: type,
            startTime: vehicle.workingTime?.startTime || null,
            endTime: vehicle.workingTime?.endTime || null,
            startBreakTime: vehicle.breakTime?.breakStartTime || null,
            endBreakTime: vehicle.breakTime?.breakEndTime || null,
            multiday: mDay,
            speed: speedVal,
            costFactor: costFactorVal,
            tags: tagsStr,
            oddEven: vehicle.oddEven || null,
            minWeight: wMin,
            maxWeight: wMax,
            minVolume: vMin,
            maxVolume: vMax,
            storage: storage,
            vehicle_id: vehicle._id,
          };

          uniquePayloads.set(uniqueId, dataPayload);
        }
      }
      for (const [uniqueId, payload] of uniquePayloads.entries()) {
        allTransactions.push(
          prisma.driver.upsert({
            where: { id: uniqueId },
            update: {
              ...payload,
              hubs: { connect: [{ id: hubId }] },
            },
            create: {
              id: uniqueId,
              ...payload,
              hubs: { connect: [{ id: hubId }] },
            },
          })
        );
      }
    }

    allTransactions.push(
      prisma.driver.deleteMany({
        where: { OR: [{ plat: null }, { plat: '' }] },
      })
    );

    allTransactions.push(
      prisma.driver.deleteMany({
        where: { NOT: { id: { contains: '-' } } },
      })
    );

    allTransactions.push(
      prisma.driver.deleteMany({
        where: {
          hubs: {
            none: {},
          },
        },
      })
    );

    await prisma.$transaction(allTransactions);
    return NextResponse.json({ message: 'Sync Drivers Berhasil' }, { status: 200 });
  } catch (error) {
    console.error('Error Sync Driver:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Kesalahan sistem tidak diketahui';
    return NextResponse.json(
      { error: 'Gagal melakukan proses sinkronisasi data driver', detail: errorMessage },
      { status: 500 }
    );
  }
}

export async function PATCH(request) {
  try {
    const body = await request.json();
    const { updates } = body;

    if (!updates || !Array.isArray(updates)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const transactions = updates.map((u) =>
      prisma.driver.update({
        where: { id: u.id },
        data: {
          imei: u.imei ? String(u.imei) : null,
          vms_id: u.vms_id ? String(u.vms_id) : null,
          vms_driver_id: u.vms_driver_id ? String(u.vms_driver_id) : null,
        },
      })
    );

    await prisma.$transaction(transactions);
    return NextResponse.json({ message: 'Update MCEasy Berhasil' }, { status: 200 });
  } catch (error) {
    console.error('Error Patch Driver:', error);
    return NextResponse.json({ error: 'Gagal update MCEasy' }, { status: 500 });
  }
}
