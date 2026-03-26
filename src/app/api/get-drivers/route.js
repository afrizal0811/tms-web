import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const hubId = searchParams.get('hubId');

  try {
    const where = hubId ? { hubs: { some: { id: hubId } } } : {};
    const drivers = await prisma.driver.findMany({ where });

    return NextResponse.json(drivers, { status: 200 });
  } catch (error) {
    console.error('Error Driver:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
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

    let allUpserts = [];

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

      const vehRes = await fetch(`${apiUrl}/vehicles?hubId=${hubId}&limit=1000`, {
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

        if (driverInfo && plat && plat.trim() !== '') {
          const type = vehicle.tags && vehicle.tags.length > 0 ? vehicle.tags[0] : null;
          const storage = type ? type.split('-')[0] : null;

          const cleanPlate = plat.replace(/\s+/g, '').toUpperCase();
          const uniqueId = `${driverInfo._id}-${cleanPlate}`;

          let wMax = vehicle.capacity?.weight?.max ? parseFloat(vehicle.capacity.weight.max) : null;
          if (isNaN(wMax)) wMax = null;

          let vMax = vehicle.capacity?.volume?.max ? parseFloat(vehicle.capacity.volume.max) : null;
          if (isNaN(vMax)) vMax = null;

          let mDay = vehicle.workingTime?.multiday;
          if (mDay === 'true' || mDay === true) mDay = true;
          else if (mDay === 'false' || mDay === false) mDay = false;
          else mDay = null;

          const dataPayload = {
            name: driverInfo.name || 'Unknown',
            email: driverInfo.email,
            plat: plat,
            type: type,
            maxWeight: wMax,
            maxVolume: vMax,
            storage: storage,
            startTime: vehicle.workingTime?.startTime || null,
            endTime: vehicle.workingTime?.endTime || null,
            multiday: mDay,
          };

          uniquePayloads.set(uniqueId, dataPayload);
        }
      }

      for (const [uniqueId, payload] of uniquePayloads.entries()) {
        allUpserts.push(
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

    await prisma.driver.deleteMany({
      where: { OR: [{ plat: null }, { plat: '' }] },
    });

    await prisma.driver.deleteMany({
      where: { NOT: { id: { contains: '-' } } },
    });

    await prisma.$transaction(allUpserts);
    return NextResponse.json({ message: 'Sync Drivers Berhasil' }, { status: 200 });
  } catch (error) {
    console.error('Error Sync Driver:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
