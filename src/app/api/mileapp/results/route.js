import prisma from '@/lib/prisma';
import { getBasePlate, isEmpty } from '@/lib/utils';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const limit = searchParams.get('limit') || 500;
    const hubId = searchParams.get('hubId');
    const fields = searchParams.get('fields');

    if (!dateFrom || !dateTo || !hubId) {
      return NextResponse.json(
        { error: 'Parameter yang dibutuhkan tidak lengkap (dateFrom, dateTo, atau hubId)' },
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

    const externalUrl = new URL(`${apiUrl}/results`);

    externalUrl.searchParams.append('dateFrom', dateFrom);
    externalUrl.searchParams.append('dateTo', dateTo);
    externalUrl.searchParams.append('limit', limit);
    externalUrl.searchParams.append('hubId', hubId);
    if (fields) {
      externalUrl.searchParams.append('fields', fields);
    }
    const externalResponse = await fetch(externalUrl.toString(), {
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await externalResponse.json();
    const routingData = data?.data?.data;
    if (!externalResponse.ok) {
      console.error('API eksternal (/results) error:', data);
      return NextResponse.json(
        { error: 'Gagal mengambil data results dari API eksternal', details: data },
        { status: externalResponse.status }
      );
    }

    const filteredData = routingData.filter(
      (item) => item?.dispatchStatus?.toLowerCase() === 'done'
    );

    const rawDrivers = await prisma.driver.findMany({
      where: hubId ? { hubs: { some: { id: hubId } } } : {},
    });

    const driversMap = {};
    rawDrivers.forEach((d) => {
      const email = (d.email || '').toLowerCase().trim();
      if (email && email !== '-') {
        driversMap[email] = { name: d.name, plat: getBasePlate(d.plat) };
      }
    });

    const toKm = (m) => parseFloat(((m || 0) / 1000).toFixed(2));
    const toPct = (val, max) => parseFloat((max ? ((val || 0) / max) * 100 : 0).toFixed(2));
    const toHr = (mins) => {
      const h = Math.floor((mins || 0) / 60);
      const m = Math.floor((mins || 0) % 60);
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    };

    const processedData = filteredData.map((item) => {
      let gDist = 0,
        gTravel = 0,
        gVisit = 0,
        gWait = 0,
        gSpent = 0;

      if (item?.result?.routing) {
        item.result.routing = item.result.routing.map((r) => {
          let tW = 0,
            tV = 0,
            tD = 0,
            tTr = 0,
            tVi = 0,
            tWa = 0;

          if (r.trips) {
            r.trips = r.trips.map((t) => {
              if (t.isHub === false && t.visitId?.startsWith('taskId-')) {
                t.visitId = t.visitId.replace('taskId-', '');
              }
              tW += t.weight || 0;
              tV += t.volume || 0;
              tD += t.distance || 0;
              tTr += t.travelTime || 0;
              tVi += t.visitTime || 0;
              tWa += t.waitingTime || 0;

              delete t.etaStr;
              delete t.etdStr;
              delete t.allowOddEven;
              delete t.timeWindow;
              delete t.visitGroup;
              delete t.visitGroupPriority;
              delete t.tags;
              return t;
            });
          }

          const spent = tTr + tVi + tWa;
          r.totalWeight = isEmpty(tW) ? 0 : Number(tW).toFixed(2);
          r.totalVolume = isEmpty(tV) ? 0 : Number(tV).toFixed(2);
          r.weightPercentage = toPct(tW, r.vehicleMaxWeight);
          r.volumePercentage = toPct(tV, r.vehicleMaxVolume);
          r.totalDistance = tD;
          r.distanceKm = toKm(tD);
          r.totalTravelTime = tTr;
          r.travelHour = toHr(tTr);
          r.totalVisitTime = tVi;
          r.visitHour = toHr(tVi);
          r.totalWaitingTime = tWa;
          r.waitingHour = toHr(tWa);
          r.totalSpentTime = spent;
          r.spentHour = toHr(spent);

          gDist += tD;
          gTravel += tTr;
          gVisit += tVi;
          gWait += tWa;
          gSpent += spent;

          const email = (r.assignee || '').toLowerCase().trim();
          r.driverName = driversMap[email]?.name || null;
          r.basePlat = driversMap[email]?.plat || null;

          delete r.workingTime;
          delete r.breakTime;
          delete r.vehicleTags;
          delete r.oddEven;
          delete r.isOddEven;
          delete r.speed;
          delete r.fixedCost;
          delete r.totalNodes;
          delete r.totalTrips;
          delete r.finishTime;
          return r;
        });
      }

      if (item?.summary) {
        item.summary.totalDistance = gDist;
        item.summary.distanceKm = toKm(gDist);
        item.summary.totalTravelTime = gTravel;
        item.summary.travelHour = toHr(gTravel);
        item.summary.totalVisitTime = gVisit;
        item.summary.visitHour = toHr(gVisit);
        item.summary.totalWaitingTime = gWait;
        item.summary.waitingHour = toHr(gWait);
        item.summary.totalSpentTime = gSpent;
        item.summary.spentHour = toHr(gSpent);

        delete item.summary.capacityConstraint;
        delete item.summary.avgSpeed;
        delete item.summary.avgFinishTime;
        delete item.summary.maxFinishTime;
        delete item.summary.minFinishTime;
        delete item.summary.totalVehicles;
        delete item.summary.unusedVehicles;
        delete item.summary.usedVehicles;
      }

      delete item.totalResultHistories;
      return item;
    });

    return NextResponse.json(processedData);
  } catch (error) {
    console.error('Error Results:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Kesalahan sistem tidak diketahui';
    return NextResponse.json(
      {
        error: 'Gagal mengambil atau memproses data results dari API eksternal',
        detail: errorMessage,
      },
      { status: 500 }
    );
  }
}
