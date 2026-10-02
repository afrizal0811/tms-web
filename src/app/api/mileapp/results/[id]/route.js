import prisma from '@/lib/prisma';
import { formatUTC7, getBasePlate, isEmpty } from '@/lib/utils';
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
  try {
    const { searchParams } = new URL(request.url);
    const resolvedParams = await params;
    const id = resolvedParams.id;

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

    const externalUrl = new URL(`${apiUrl}/result/${id}`);

    const externalResponse = await fetch(externalUrl.toString(), {
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
    });

    const fetchdata = await externalResponse.json();
    let data = fetchdata.data || fetchdata;

    const hubId = searchParams?.get('hubId');
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

    if (data.finishTime) data.finishTime = formatUTC7(data.finishTime, 'YYYY-MM-DDTHH:mm:ss');
    if (data.createdTime) data.createdTime = formatUTC7(data.createdTime, 'YYYY-MM-DDTHH:mm:ss');
    if (data.updatedTime) data.updatedTime = formatUTC7(data.updatedTime, 'YYYY-MM-DDTHH:mm:ss');
    if (data.user != null) data.user = data.user.name;
    data.routing = data.result.routing;
    data.droppedRouting = data.result.dropped;

    delete data.result;
    delete data.configuration;
    delete data.visitHistories;
    delete data.isDeleted;
    delete data.organizationId;
    delete data.isShown;
    delete data.routingDate;
    delete data.resultCode;
    delete data.hubId;
    delete data.status;
    delete data.countryCode;
    delete data.createdBy;
    delete data.createdFrom;
    delete data.totalResultHistories;

    const toKm = (m) => parseFloat(((m || 0) / 1000).toFixed(2));
    const toPct = (val, max) => parseFloat((max ? ((val || 0) / max) * 100 : 0).toFixed(2));
    const toHr = (mins) => {
      const h = Math.floor((mins || 0) / 60);
      const m = Math.floor((mins || 0) % 60);
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    };

    let gDist = 0,
      gTravel = 0,
      gVisit = 0,
      gWait = 0,
      gSpent = 0;

    data.routing.forEach((route) => {
      const assigneeEmail = route.assignee ? String(route.assignee).toLowerCase().trim() : null;
      const driverData = assigneeEmail ? driversByEmail[assigneeEmail] : null;

      if (driverData) {
        route.driverName = driverData.name;
        route.basePlat = driverData.basePlat;
      } else {
        route.driverName = assigneeEmail || '-';
        route.basePlat = getBasePlate(route.vehicleName) || '-';
      }

      let tW = 0,
        tV = 0,
        tD = 0,
        tTr = 0,
        tVi = 0,
        tWa = 0;

      if (route.trips && route.trips.length > 0) {
        const lastHubWait = Number(route.trips[route.trips.length - 1].waitingTime) || 0;

        if ((Number(route.trips[0].waitingTime) || 0) <= 0) {
          route.trips[0].waitingTime = lastHubWait;
        }

        route.trips = route.trips.map((t, i) => {
          if (t.isHub === false && t.visitId?.startsWith('taskId-')) {
            t.visitId = t.visitId.replace('taskId-', '');
          }

          const tripTravel = Number(t.travelTime) || 0;
          const tripVisit = Number(t.visitTime) || 0;
          const tripWait = Number(t.waitingTime) || 0;

          tW += t.weight || 0;
          tV += t.volume || 0;
          tD += t.distance || 0;
          tTr += tripTravel;
          tVi += tripVisit;

          if (i !== route.trips.length - 1) {
            tWa += tripWait;
          }

          t.travelTime = toHr(tripTravel);
          t.visitTime = toHr(tripVisit);
          t.waitingTime = toHr(tripWait);
          t.spentTime = toHr(tripTravel + tripVisit + tripWait);

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
      route.totalWeight = isEmpty(tW) ? 0 : Number(tW).toFixed(2);
      route.totalVolume = isEmpty(tV) ? 0 : Number(tV).toFixed(2);
      route.weightPercentage = toPct(tW, route.vehicleMaxWeight);
      route.volumePercentage = toPct(tV, route.vehicleMaxVolume);
      route.totalDistance = tD;
      route.distanceKm = toKm(tD);
      route.totalTravelTime = tTr;
      route.travelHour = toHr(tTr);
      route.totalVisitTime = tVi;
      route.visitHour = toHr(tVi);
      route.totalWaitingTime = tWa;
      route.waitingHour = toHr(tWa);
      route.totalSpentTime = spent;
      route.spentHour = toHr(spent);

      gDist += tD;
      gTravel += tTr;
      gVisit += tVi;
      gWait += tWa;
      gSpent += spent;

      delete route.workingTime;
      delete route.breakTime;
      delete route.vehicleTags;
      delete route.oddEven;
      delete route.isOddEven;
      delete route.speed;
      delete route.fixedCost;
      delete route.totalNodes;
      delete route.totalTrips;
      delete route.finishTime;
    });

    if (data.summary) {
      data.summary.totalDistance = gDist;
      data.summary.distanceKm = toKm(gDist);
      data.summary.totalTravelTime = gTravel;
      data.summary.travelHour = toHr(gTravel);
      data.summary.totalVisitTime = gVisit;
      data.summary.visitHour = toHr(gVisit);
      data.summary.totalWaitingTime = gWait;
      data.summary.waitingHour = toHr(gWait);
      data.summary.totalSpentTime = gSpent;
      data.summary.spentHour = toHr(gSpent);

      delete data.summary.capacityConstraint;
      delete data.summary.avgSpeed;
      delete data.summary.avgFinishTime;
      delete data.summary.maxFinishTime;
      delete data.summary.minFinishTime;
      delete data.summary.totalVehicles;
      delete data.summary.unusedVehicles;
      delete data.summary.usedVehicles;
    }

    if (!externalResponse.ok) {
      console.error(`API eksternal (/result/${id}) error:`, data);
      return NextResponse.json(
        {
          error: `Gagal mengambil data result dengan ID ${id}`,
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
