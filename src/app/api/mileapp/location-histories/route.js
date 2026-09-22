import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

import { formatMinutesToHHMM, formatUTC7, getBasePlate, normalizeEmail } from '@/lib/utils';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const timeFrom = searchParams.get('timeFrom');
    const timeTo = searchParams.get('timeTo');
    const limit = searchParams.get('limit') || 1000;
    const startFinish = searchParams.get('startFinish') || 'true';
    const fields = searchParams.get('fields') || 'finish,startTime,email,trackedTime';
    const timeBy = searchParams.get('timeBy') || 'createdTime';
    const hubId = searchParams.get('hubId');

    if (!timeFrom || !timeTo) {
      return NextResponse.json(
        {
          error: 'Missing required query parameters: timeFrom, timeTo',
        },
        {
          status: 400,
        }
      );
    }
    const where = hubId ? { hubs: { some: { id: hubId } } } : {};
    const [rawDrivers] = await Promise.all([prisma.driver.findMany({ where })]);
    const driverMap = new Map();
    rawDrivers.forEach((d) => {
      const email = normalizeEmail(d.email);
      if (email) {
        driverMap.set(email, {
          name: d.name,
          basePlat: getBasePlate(d.plat),
          workingTime: d.workingTime,
          vehicleId: d.vehicle_id,
        });
      }
    });

    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    const apiToken = process.env.API_TOKEN;

    if (!apiUrl || !apiToken) {
      return NextResponse.json(
        {
          error: 'Variabel API tidak diatur di server.',
        },
        {
          status: 500,
        }
      );
    }

    const externalUrl = new URL(`${apiUrl}/location-histories`);
    externalUrl.searchParams.append('limit', limit);
    externalUrl.searchParams.append('startFinish', startFinish);
    externalUrl.searchParams.append('fields', fields);
    externalUrl.searchParams.append('timeFrom', timeFrom);
    externalUrl.searchParams.append('timeTo', timeTo);
    externalUrl.searchParams.append('timeBy', timeBy);

    const externalResponse = await fetch(externalUrl.toString(), {
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await externalResponse.json();

    if (!externalResponse.ok) {
      return NextResponse.json(
        {
          error: 'Gagal mengambil data location-histories',
          details: data,
        },
        {
          status: externalResponse.status,
        }
      );
    }

    const filteredData = (data.tasks?.data || []).reduce((acc, item) => {
      const email = normalizeEmail(item.email);
      const trackedTime = Math.abs(item.trackedTime || 0);
      const totalDistance = item.finish?.totalDistance || 0;
      if (email && driverMap.has(email) && trackedTime >= 10 && totalDistance > 5) {
        const driverInfo = driverMap.get(email) || {};
        const parsedFinish = item.finish
          ? {
              ...item.finish,
              finishTime: formatUTC7(item.finish.finishTime, 'YYYY-MM-DD HH:mm:ss'),
              totalDistance: Number(totalDistance.toFixed(2)),
            }
          : null;

        acc.push({
          ...item,
          vehicleId: driverInfo.vehicleId || driverInfo.vmsVehicleId,
          email,
          driverName: driverInfo.name || null,
          basePlat: driverInfo.basePlat || null,
          startTime: formatUTC7(item.startTime, 'YYYY-MM-DD HH:mm:ss'),
          finish: parsedFinish,
          durationHour: item.finish?.totalDuration
            ? formatMinutesToHHMM(item.finish.totalDuration, false)
            : null,
        });
      }
      return acc;
    }, []);
    return NextResponse.json(filteredData);
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
