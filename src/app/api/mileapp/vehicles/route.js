import prisma from '@/lib/prisma';
import { resolveUserName } from '../help';
import { getBasePlate, isEmpty } from '@/lib/utils';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const hubId = searchParams.get('hubId');
  const isStatus = searchParams.get('status') === 'true';

  try {
    if (isStatus) {
      const where = hubId && hubId !== 'all' ? { hubs_id: hubId } : undefined;
      const latestVehicle = await prisma.vehicle.findFirst({
        where,
        orderBy: { updated_time: 'desc' },
        select: { updated_time: true, updated_by: true },
      });

      return NextResponse.json(
        {
          hubId: hubId || 'all',
          _max: {
            updatedAt: latestVehicle?.updated_time || null,
            updateBy: latestVehicle?.updated_by || null,
          },
        },
        { status: 200 }
      );
    }

    const where = hubId && hubId !== 'all' ? { hubs_id: hubId } : {};
    const [vehicles, drivers] = await Promise.all([
      prisma.vehicle.findMany({
        where,
        orderBy: [{ license_number: 'asc' }],
      }),
      prisma.driverList.findMany({
        where: hubId && hubId !== 'all' ? { hub_id: hubId } : {},
      }),
    ]);

    const driverMap = new Map();
    drivers.forEach((d) => {
      driverMap.set(d.id, d);
      if (d.email) driverMap.set(d.email.toLowerCase(), d);
    });

    const enriched = vehicles.map((v) => {
      const driver = v.driver_id ? driverMap.get(v.driver_id) : null;
      const driverName = driver ? driver.name : '-';
      const driverEmail = driver ? driver.email : '';
      const basePlat = v.base_plate || getBasePlate(v.license_number);
      const mappedTypeStr = v.type
        ? v.storage
          ? `${v.storage}-${v.type}`
          : v.type
        : null;

      return {
        ...v,
        _id: v.vehicle_id,
        plat: v.license_number,
        basePlat,
        type: mappedTypeStr,
        _rawType: v.type,
        driver_name: driverName,
        driver_email: driverEmail,
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

    return NextResponse.json(enriched, { status: 200 });
  } catch (error) {
    console.error('Error Get Vehicles:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Kesalahan sistem tidak diketahui';
    return NextResponse.json(
      { error: 'Gagal mengambil data kendaraan dari database', detail: errorMessage },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const apiToken = process.env.API_TOKEN;

  try {
    const body = await request.json().catch(() => ({}));
    const updateBy = body?.updateBy || null;
    const authorName = await resolveUserName(updateBy);

    if (body.items && Array.isArray(body.items)) {
      const { items, hubId } = body;
      for (const item of items) {
        const basePlat = getBasePlate(item.license_number || item.base_plate);
        const storage = item.storage;
        const type = item.type;
        const vehicleIds = item.vehicle_ids || (item.vehicle_id ? [item.vehicle_id] : []);

        await prisma.vehicle.updateMany({
          where: {
            hubs_id: hubId,
            OR: [
              { base_plate: basePlat },
              { license_number: basePlat },
              ...(vehicleIds.length > 0 ? [{ vehicle_id: { in: vehicleIds } }] : []),
            ],
          },
          data: {
            storage,
            type,
            base_plate: basePlat,
            updated_by: authorName,
            updated_time: new Date(),
          },
        });

        for (const vehicleId of vehicleIds) {
          const existing = await prisma.vehicle.findUnique({
            where: { vehicle_id: vehicleId },
          });

          if (!existing) {
            const v =
              (item.vendorVehicles || []).find((x) => String(x._id || x.id) === String(vehicleId)) ||
              item.vendorData ||
              {};
            let driverId = null;
            if (v.assignee) {
              const matchedDriver = await prisma.driverList.findFirst({
                where: {
                  hub_id: hubId,
                  email: String(v.assignee).toLowerCase().trim(),
                },
              });
              driverId = matchedDriver ? matchedDriver.id : null;
            }

            let wMax = v.capacity?.weight?.max ? parseFloat(v.capacity.weight.max) : null;
            let wMin = v.capacity?.weight?.min ? parseFloat(v.capacity.weight.min) : null;
            let vMax = v.capacity?.volume?.max ? parseFloat(v.capacity.volume.max) : null;
            let vMin = v.capacity?.volume?.min ? parseFloat(v.capacity.volume.min) : null;

            const rawPlat = v.name || v.plateNumber || basePlat;

            await prisma.vehicle.create({
              data: {
                vehicle_id: vehicleId,
                hubs_id: hubId,
                license_number: rawPlat.trim(),
                base_plate: basePlat,
                storage,
                type,
                driver_id: driverId,
                start_time: v.workingTime?.startTime || null,
                end_time: v.workingTime?.endTime || null,
                start_break: v.breakTime?.breakStartTime || null,
                end_break: v.breakTime?.breakEndTime || null,
                speed: v.speed ? parseFloat(v.speed) : null,
                cost_factor: v.fixedCost ? parseFloat(v.fixedCost) : null,
                tags: v.tags && v.tags.length > 0 ? JSON.stringify(v.tags) : null,
                odd_even: v.oddEven || null,
                min_weight: isNaN(wMin) ? null : wMin,
                max_weight: isNaN(wMax) ? null : wMax,
                min_volume: isNaN(vMin) ? null : vMin,
                max_volume: isNaN(vMax) ? null : vMax,
                created_by: authorName,
                updated_by: authorName,
              },
            });
          }
        }
      }

      return NextResponse.json(
        { message: 'Konfigurasi kendaraan berhasil disimpan' },
        { status: 200 }
      );
    }

    let hubIds = body.hubIds || [];

    if (hubIds.length === 0) {
      const hubs = await prisma.hub.findMany();
      hubIds = hubs.map((h) => h.id);
    }

    let totalCreated = 0;
    let totalUpdated = 0;

    for (const hubId of hubIds) {
      const vehRes = await fetch(`${apiUrl}/vehicles?hubId=${hubId}&limit=10000`, {
        headers: { Authorization: `Bearer ${apiToken}` },
        cache: 'no-store',
      });

      let rawVehicles = [];
      if (vehRes.ok) {
        const vehData = await vehRes.json();
        rawVehicles = vehData.data || [];
      }

      const existingDrivers = await prisma.driverList.findMany({
        where: { hub_id: hubId },
      });
      const driverByEmail = new Map();
      existingDrivers.forEach((d) => {
        if (d.email) driverByEmail.set(d.email.toLowerCase().trim(), d);
      });

      for (const vehicle of rawVehicles) {
        const plat = vehicle.name || vehicle.plateNumber;
        if (!plat || plat.trim() === '' || String(plat).toUpperCase().includes('DM')) {
          continue;
        }

        const vehicleId = String(vehicle._id || vehicle.id);
        const cleanPlate = plat.trim();
        const basePlat = getBasePlate(cleanPlate);
        const assigneeEmail = (vehicle.assignee || '').toLowerCase().trim();
        const matchedDriver = driverByEmail.get(assigneeEmail);
        const driverId = matchedDriver ? matchedDriver.id : null;

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
        let tagsStr = vehicle.tags && vehicle.tags.length > 0 ? JSON.stringify(vehicle.tags) : null;

        const existing = await prisma.vehicle.findUnique({
          where: { vehicle_id: vehicleId },
        });

        const masterVehicle = await prisma.vehicle.findFirst({
          where: {
            hubs_id: hubId,
            base_plate: basePlat,
            type: { not: null },
            storage: { not: null },
          },
          orderBy: { updated_time: 'desc' },
        });

        if (existing) {
          const updatePayload = {
            hubs_id: hubId,
            driver_id: driverId || existing.driver_id,
            start_time: vehicle.workingTime?.startTime || null,
            end_time: vehicle.workingTime?.endTime || null,
            start_break: vehicle.breakTime?.breakStartTime || null,
            end_break: vehicle.breakTime?.breakEndTime || null,
            multiday: mDay,
            speed: speedVal,
            cost_factor: costFactorVal,
            tags: tagsStr,
            odd_even: vehicle.oddEven || null,
            min_weight: wMin,
            max_weight: wMax,
            min_volume: vMin,
            max_volume: vMax,
            updated_by: authorName,
            updated_time: new Date(),
          };

          if (existing.license_number !== cleanPlate) {
            updatePayload.license_number = cleanPlate;
            updatePayload.base_plate = basePlat;
          }

          if ((!existing.type || !existing.storage) && masterVehicle) {
            updatePayload.type = masterVehicle.type;
            updatePayload.storage = masterVehicle.storage;
          }

          await prisma.vehicle.update({
            where: { vehicle_id: vehicleId },
            data: updatePayload,
          });
          totalUpdated++;
        } else {
          let initialStorage = masterVehicle?.storage || null;
          let initialType = masterVehicle?.type || null;

          if (!initialStorage && Array.isArray(vehicle.tags) && vehicle.tags.length > 0) {
            const firstTag = String(vehicle.tags[0]);
            if (firstTag.startsWith('Frozen')) {
              initialStorage = 'Frozen';
              initialType = firstTag.replace(/^Frozen-?/, '') || null;
            } else if (firstTag.startsWith('Dry')) {
              initialStorage = 'Dry';
              initialType = firstTag.replace(/^Dry-?/, '') || null;
            }
          }

          await prisma.vehicle.create({
            data: {
              vehicle_id: vehicleId,
              hubs_id: hubId,
              license_number: cleanPlate,
              base_plate: basePlat,
              type: initialType,
              storage: initialStorage,
              vms_id: null,
              imei: null,
              driver_id: driverId,
              start_time: vehicle.workingTime?.startTime || null,
              end_time: vehicle.workingTime?.endTime || null,
              start_break: vehicle.breakTime?.breakStartTime || null,
              end_break: vehicle.breakTime?.breakEndTime || null,
              multiday: mDay,
              speed: speedVal,
              cost_factor: costFactorVal,
              tags: tagsStr,
              odd_even: vehicle.oddEven || null,
              min_weight: wMin,
              max_weight: wMax,
              min_volume: vMin,
              max_volume: vMax,
              created_by: authorName,
              updated_by: authorName,
            },
          });
          totalCreated++;
        }
      }
    }

    return NextResponse.json(
      {
        message: `Sync Vehicles Berhasil (${totalCreated} baru, ${totalUpdated} diperbarui)`,
        totalCreated,
        totalUpdated,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error Sync Vehicles:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Kesalahan sistem tidak diketahui';
    return NextResponse.json(
      { error: 'Gagal melakukan proses sinkronisasi kendaraan', detail: errorMessage },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, vehicle_id, type, storage, license_number, updateBy } = body;

    const authorName = await resolveUserName(updateBy);
    const where = id ? { id } : vehicle_id ? { vehicle_id } : null;

    if (!where) {
      return NextResponse.json(
        { error: 'Parameter id atau vehicle_id diperlukan' },
        { status: 400 }
      );
    }

    const updated = await prisma.vehicle.update({
      where,
      data: {
        ...(type !== undefined ? { type } : {}),
        ...(storage !== undefined ? { storage } : {}),
        ...(license_number !== undefined ? { license_number: getBasePlate(license_number) } : {}),
        updated_by: authorName,
        updated_time: new Date(),
      },
    });

    return NextResponse.json({ message: 'Success', data: updated }, { status: 200 });
  } catch (error) {
    console.error('Error Update Vehicle:', error);
    return NextResponse.json({ error: 'Gagal mengubah data kendaraan' }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const body = await request.json();
    const { updates, updateBy } = body;

    if (!updates || !Array.isArray(updates)) {
      return NextResponse.json({ error: 'Payload tidak valid' }, { status: 400 });
    }

    const authorName = await resolveUserName(updateBy);

    for (const u of updates) {
      const where = u.id ? { id: u.id } : u.vehicle_id ? { vehicle_id: u.vehicle_id } : null;
      if (where) {
        await prisma.vehicle.update({
          where,
          data: {
            ...(u.type !== undefined ? { type: u.type } : {}),
            ...(u.storage !== undefined ? { storage: u.storage } : {}),
            ...(u.vms_id !== undefined ? { vms_id: u.vms_id ? String(u.vms_id) : null } : {}),
            ...(u.imei !== undefined ? { imei: u.imei ? String(u.imei) : null } : {}),
            ...(u.driver_id !== undefined ? { driver_id: u.driver_id || null } : {}),
            ...(u.license_number !== undefined
              ? { license_number: getBasePlate(u.license_number) }
              : {}),
            updated_by: authorName,
            updated_time: new Date(),
          },
        });
      }
    }

    return NextResponse.json({ message: 'Update Vehicles Berhasil' }, { status: 200 });
  } catch (error) {
    console.error('Error Patch Vehicles:', error);
    return NextResponse.json({ error: 'Gagal update kendaraan' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const vehicleId = searchParams.get('vehicle_id');

    const where = id ? { id } : vehicleId ? { vehicle_id: vehicleId } : null;
    if (!where) {
      return NextResponse.json(
        { error: 'Parameter id atau vehicle_id diperlukan' },
        { status: 400 }
      );
    }

    const current = await prisma.vehicle.findFirst({ where });
    if (!current) {
      return NextResponse.json({ message: 'Kendaraan tidak ditemukan' }, { status: 404 });
    }

    await prisma.vehicle.delete({ where: { id: current.id } });
    return NextResponse.json(
      { success: true, message: 'Kendaraan berhasil dihapus' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error Delete Vehicle:', error);
    return NextResponse.json({ error: 'Gagal menghapus kendaraan' }, { status: 500 });
  }
}
