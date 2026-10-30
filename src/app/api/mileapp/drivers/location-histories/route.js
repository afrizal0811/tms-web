import prisma from '@/lib/prisma';
import {
  calculateStartFinishDates,
  formatMinutesToHHMM,
  formatUTC7,
  getBasePlate,
  normalizeEmail,
} from '@/lib/utils';
import { NextResponse } from 'next/server';

const isCoordSame = (a, b) => {
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  return Math.abs(Number(a) - Number(b)) < 1e-5;
};

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const timeFrom = searchParams.get('timeFrom');
    const timeTo = searchParams.get('timeTo');
    const date = searchParams.get('date') || searchParams.get('deliveryDate');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const hubId = searchParams.get('hubId');

    const where = {};
    if (hubId && hubId !== 'all') {
      where.hub_id = hubId;
    }

    if (date) {
      where.date = date;
    } else if (dateFrom && dateTo) {
      where.date = { gte: dateFrom, lte: dateTo };
    } else if (timeFrom && timeTo) {
      const dFrom = formatUTC7(timeFrom, 'YYYY-MM-DD') || timeFrom.split(/[ T]/)[0];
      const dTo = formatUTC7(timeTo, 'YYYY-MM-DD') || timeTo.split(/[ T]/)[0];
      if (dFrom === dTo) {
        where.date = dFrom;
      } else {
        where.date = { gte: dFrom, lte: dTo };
      }
    } else if (dateFrom) {
      where.date = { gte: dateFrom };
    } else if (timeFrom) {
      const dFrom = formatUTC7(timeFrom, 'YYYY-MM-DD') || timeFrom.split(/[ T]/)[0];
      where.date = { gte: dFrom };
    }

    const [locationHistories, rawDrivers] = await Promise.all([
      prisma.locationHistory.findMany({
        where,
        orderBy: [{ start_time: 'asc' }, { id: 'asc' }],
      }),
      prisma.driver.findMany({
        select: {
          email: true,
          name: true,
          plat: true,
          vehicle_id: true,
          vms_id: true,
          start_time: true,
          end_time: true,
          multiday: true,
        },
      }),
    ]);

    const driverMap = new Map();
    rawDrivers.forEach((d) => {
      const email = normalizeEmail(d.email);
      if (email) {
        driverMap.set(email, {
          name: d.name,
          basePlat: getBasePlate(d.plat),
          vehicleId: d.vehicle_id || d.vms_id,
          workingTime: {
            startTime: d.start_time ?? d.startTime,
            endTime: d.end_time ?? d.endTime,
            multiday: d.multiday,
          },
        });
      }
    });

    const formatted = locationHistories.map((h) => {
      const email = normalizeEmail(h.email);
      const driverInfo = driverMap.get(email) || {};

      return {
        _id: h.id,
        id: h.id,
        vehicleId: driverInfo.vehicleId || null,
        email: h.email,
        driverName: h.driver_name || driverInfo.name || null,
        basePlat: driverInfo.basePlat || null,
        startTime: h.start_time,
        trackedTime: h.tracked_time != null ? Math.abs(h.tracked_time) : null,
        date: h.date,
        lat: h.start_lat,
        lon: h.start_lon,
        startLat: h.start_lat,
        startLon: h.start_lon,
        finish: {
          lat: h.finish_lat,
          lon: h.finish_lon,
          finishTime: h.finish_time,
          totalDuration: h.total_duration,
          totalDistance: h.total_distance,
        },
        durationHour: h.total_duration ? formatMinutesToHHMM(h.total_duration) : null,
        hubId: h.hub_id,
        syncUser:
          typeof h.sync_user === 'string' ? JSON.parse(h.sync_user) : h.sync_user || null,
      };
    });

    return NextResponse.json(formatted);
  } catch (error) {
    console.error('Error Location:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Kesalahan sistem tidak diketahui';
    return NextResponse.json(
      { error: 'Gagal mengambil data riwayat lokasi (location histories)', detail: errorMessage },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const {
      deliveryDate,
      date,
      timeFrom: paramTimeFrom,
      timeTo: paramTimeTo,
      hubId,
      items: manualItems,
      created_by,
      updated_by,
    } = body;

    const targetDate = deliveryDate || date;
    let timeFrom = paramTimeFrom;
    let timeTo = paramTimeTo;

    if (targetDate && (!timeFrom || !timeTo)) {
      const range = calculateStartFinishDates(targetDate);
      timeFrom = range.timeFrom;
      timeTo = range.timeTo;
    }

    let rawItems = manualItems;

    if (!Array.isArray(rawItems)) {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      const apiToken = process.env.API_TOKEN;

      if (!apiUrl || !apiToken) {
        return NextResponse.json(
          { error: 'Variabel API MileApp tidak dikonfigurasi di server.' },
          { status: 500 }
        );
      }

      if (!timeFrom || !timeTo) {
        return NextResponse.json(
          { error: 'Parameter deliveryDate atau timeFrom & timeTo wajib disertakan.' },
          { status: 400 }
        );
      }

      const externalUrl = new URL(`${apiUrl}/location-histories`);
      externalUrl.searchParams.append('limit', '10000');
      externalUrl.searchParams.append('startFinish', 'true');
      externalUrl.searchParams.append('fields', 'finish,startTime,email,trackedTime,lat,lon');
      externalUrl.searchParams.append('timeFrom', timeFrom);
      externalUrl.searchParams.append('timeTo', timeTo);
      externalUrl.searchParams.append('timeBy', 'createdTime');

      const externalResponse = await fetch(externalUrl.toString(), {
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await externalResponse.json();
      if (!externalResponse.ok) {
        return NextResponse.json(
          { error: 'Gagal mengambil data dari vendor MileApp', details: data },
          { status: externalResponse.status }
        );
      }

      rawItems = data.tasks?.data || [];
    }

    const rawDrivers = await prisma.driver.findMany({
      include: { hubs: true },
    });

    const driverMap = new Map();
    rawDrivers.forEach((d) => {
      const email = normalizeEmail(d.email);
      if (email) {
        driverMap.set(email, {
          name: d.name,
          hubId: d.hubs?.[0]?.id || null,
          allHubIds: d.hubs?.map((h) => h.id) || [],
        });
      }
    });

    const currentUser = updated_by || created_by || 'System';
    const nowIso = new Date().toISOString();

    const filteredItems = rawItems.filter((item) => {
      const email = normalizeEmail(item.email);
      const trackedTime = Math.abs(item.trackedTime || 0);
      const totalDistance = item.finish?.totalDistance || 0;

      if (!email || trackedTime < 10 || totalDistance < 10) return false;

      if (hubId && hubId !== 'all') {
        const driverInfo = driverMap.get(email);
        const matchHub = driverInfo?.allHubIds?.includes(hubId) || driverInfo?.hubId === hubId;
        if (!matchHub && driverInfo) return false;
      }

      return true;
    });

    let insertedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    const targetIds = filteredItems.map((item) => item._id || item.id).filter(Boolean);
    const existingHistories =
      targetIds.length > 0
        ? await prisma.locationHistory.findMany({
            where: { id: { in: targetIds } },
            select: {
              id: true,
              finish_time: true,
              total_duration: true,
              total_distance: true,
              tracked_time: true,
              start_lat: true,
              start_lon: true,
              finish_lat: true,
              finish_lon: true,
              sync_user: true,
            },
          })
        : [];
    const existingMap = new Map(existingHistories.map((h) => [h.id, h]));

    const CHUNK_SIZE = 25;

    for (let i = 0; i < filteredItems.length; i += CHUNK_SIZE) {
      const chunk = filteredItems.slice(i, i + CHUNK_SIZE);
      const operations = chunk.map(async (item) => {
        const id = item._id || item.id;
        if (!id) return null;

        const email = normalizeEmail(item.email);
        const driverInfo = driverMap.get(email);
        const itemDate =
          formatUTC7(item.startTime, 'YYYY-MM-DD') ||
          targetDate ||
          item.startTime?.split(/[ T]/)[0];
        const startTime =
          formatUTC7(item.startTime, 'YYYY-MM-DD HH:mm:ss') || item.startTime;
        const finishTime = item.finish?.finishTime
          ? formatUTC7(item.finish.finishTime, 'YYYY-MM-DD HH:mm:ss')
          : null;
        const totalDuration =
          item.finish?.totalDuration != null
            ? Math.round(Number(item.finish.totalDuration))
            : null;
        const totalDistance =
          item.finish?.totalDistance != null
            ? Number(Number(item.finish.totalDistance).toFixed(2))
            : null;
        const trackedTime =
          item.trackedTime != null ? Number(Math.abs(item.trackedTime).toFixed(2)) : null;

        const startLat = item.lat != null ? Number(item.lat) : null;
        const startLon = item.lon != null ? Number(item.lon) : null;
        const finishLat = item.finish?.lat != null ? Number(item.finish.lat) : null;
        const finishLon = item.finish?.lon != null ? Number(item.finish.lon) : null;

        const existing = existingMap.get(id);

        if (existing) {
          const isSame =
            existing.finish_time === finishTime &&
            existing.total_duration === totalDuration &&
            existing.total_distance === totalDistance &&
            existing.tracked_time === trackedTime &&
            isCoordSame(existing.start_lat, startLat) &&
            isCoordSame(existing.start_lon, startLon) &&
            isCoordSame(existing.finish_lat, finishLat) &&
            isCoordSame(existing.finish_lon, finishLon);

          if (isSame) {
            return { type: 'skip' };
          }
        }

        const resolvedHubId =
          driverInfo?.hubId || (hubId && hubId !== 'all' ? hubId : null);

        const existingSync =
          typeof existing?.sync_user === 'string'
            ? JSON.parse(existing.sync_user)
            : existing?.sync_user || null;

        const syncUser = {
          created_by: existingSync?.created_by || currentUser,
          created_at: existingSync?.created_at || nowIso,
          updated_by: currentUser,
          updated_at: nowIso,
        };

        const data = {
          hub_id: resolvedHubId,
          email,
          driver_name: driverInfo?.name || null,
          date: itemDate,
          start_time: startTime,
          finish_time: finishTime,
          total_duration: totalDuration,
          total_distance: totalDistance,
          tracked_time: trackedTime,
          start_lat: startLat,
          start_lon: startLon,
          finish_lat: finishLat,
          finish_lon: finishLon,
          sync_user: syncUser,
        };

        if (existing) {
          await prisma.locationHistory.update({
            where: { id },
            data,
          });
          return { type: 'update' };
        }

        await prisma.locationHistory.create({
          data: {
            id,
            ...data,
          },
        });
        return { type: 'insert' };
      });

      const results = await Promise.all(operations);
      insertedCount += results.filter((r) => r?.type === 'insert').length;
      updatedCount += results.filter((r) => r?.type === 'update').length;
      skippedCount += results.filter((r) => r?.type === 'skip').length;
    }

    return NextResponse.json({
      message: `Berhasil sinkronisasi riwayat lokasi: ${insertedCount} baru, ${updatedCount} diperbarui, ${skippedCount} dilewati (tidak berubah).`,
      syncedCount: insertedCount + updatedCount,
      insertedCount,
      updatedCount,
      skippedCount,
      deliveryDate: targetDate || null,
    });
  } catch (error) {
    console.error('Error Sync Location Histories:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Kesalahan sistem tidak diketahui';
    return NextResponse.json(
      {
        error: 'Gagal sinkronisasi data riwayat lokasi pengemudi',
        detail: errorMessage,
      },
      { status: 500 }
    );
  }
}
