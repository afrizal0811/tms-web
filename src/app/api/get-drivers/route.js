import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET: Ambil data dari database lokal
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const hubId = searchParams.get('hubId');
  try {
    const where = hubId ? { hubId } : {};
    const drivers = await prisma.driver.findMany({ where });
    return NextResponse.json(drivers, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Sinkronisasi dari Vendor ke Database Lokal
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

    // KUNCI DINAMIS: Cari semua role yang namanya mengandung kata "driver"
    const roles = await prisma.role.findMany();
    const driverRoleIds = roles
      .filter((r) => r.name.toLowerCase().includes('driver'))
      .map((r) => r.id);

    let allUpserts = [];

    for (const hubId of hubIds) {
      let rawDrivers = [];
      // Fetch user berdasarkan semua role driver yang ditemukan
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

      const uniqueDrivers = Array.from(
        new Map(rawDrivers.map((item) => [item._id, item])).values()
      );

      // Fetch Vehicles
      const vehRes = await fetch(`${apiUrl}/vehicles?hubId=${hubId}&limit=1000`, {
        headers: { Authorization: `Bearer ${apiToken}` },
        cache: 'no-store',
      });
      let vehicles = [];
      if (vehRes.ok) {
        const vehData = await vehRes.json();
        vehicles = vehData.data || [];
      }

      // Mapping Vehicle
      const vehicleMap = vehicles.reduce((acc, vehicle) => {
        if (vehicle.assignee) {
          acc[vehicle.assignee] = {
            plat: vehicle.name,
            type: vehicle.tags && vehicle.tags.length > 0 ? vehicle.tags[0] : null,
            storage: vehicle.tags && vehicle.tags.length > 0 ? vehicle.tags[0].split('-')[0] : null,
            maxWeight: vehicle.capacity?.weight?.max || null,
            maxVolume: vehicle.capacity?.volume?.max || null,
            startWorking: vehicle.workingTime?.startTime || null,
            endWorking: vehicle.workingTime?.endTime || null,
            multiday: vehicle.workingTime?.multiday || null,
          };
        }
        return acc;
      }, {});

      // Buat perintah Upsert ke database
      for (const driver of uniqueDrivers) {
        const vInfo = vehicleMap[driver.email];
        const dataPayload = {
          name: driver.name,
          email: driver.email,
          plat: vInfo ? vInfo.plat : null,
          type: vInfo ? vInfo.type : null,
          maxWeight: vInfo && vInfo.maxWeight ? parseFloat(vInfo.maxWeight) : null,
          maxVolume: vInfo && vInfo.maxVolume ? parseFloat(vInfo.maxVolume) : null,
          storage: vInfo ? vInfo.storage : null,
          startTime: vInfo ? vInfo.startWorking : null,
          endTime: vInfo ? vInfo.endWorking : null,
          multiday: vInfo ? vInfo.multiday : null,
          hubId: hubId,
        };

        allUpserts.push(
          prisma.driver.upsert({
            where: { id: driver._id },
            update: dataPayload,
            create: { id: driver._id, ...dataPayload },
          })
        );
      }
    }

    await prisma.$transaction(allUpserts);
    return NextResponse.json({ message: 'Sync Drivers Berhasil' }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
