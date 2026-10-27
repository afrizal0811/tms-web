import prisma from '@/lib/prisma';
import { getBasePlate, getDeliveryDateFromRouting, isEmpty } from '@/lib/utils';
import { NextResponse } from 'next/server';

const formatRoutingHistories = (rawHistory) => {
  const grouped = {
    move: [],
    dropped: [],
    switch: [],
    manual: [],
    change: [],
  };

  (rawHistory || []).forEach((item) => {
    const act = (item.action || '').toLowerCase();
    const vFrom = (item.vehicleFrom || '').toLowerCase();

    if (act === 'move' && vFrom === 'dropped') {
      grouped.manual.push(item);
      return;
    }

    if (act === 'move') {
      grouped.move.push(item);
    } else if (act === 'dropped' || act === 'drop') {
      grouped.dropped.push(item);
    } else if (act === 'switch') {
      grouped.switch.push(item);
    } else if (act === 'change') {
      grouped.change.push(item);
    }
    delete item.organizationId;
    delete item.createdType;
    delete item.createdFrom;
    delete item.updatedTime;
    delete item.resultId;
  });

  const total =
    grouped.move.length +
    grouped.dropped.length +
    grouped.switch.length +
    grouped.manual.length +
    grouped.change.length;

  return {
    total,
    history: grouped,
  };
};

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const deliveryDate = searchParams.get('deliveryDate');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const hubId = searchParams.get('hubId');

    const where = {};
    if (deliveryDate) {
      where.delivery_date = deliveryDate;
    } else if (dateFrom && dateTo) {
      const fromStr = dateFrom.split(' ')[0].split('T')[0];
      const toStr = dateTo.split(' ')[0].split('T')[0];
      where.delivery_date = { gte: fromStr, lte: toStr };
    } else if (dateFrom) {
      const fromStr = dateFrom.split(' ')[0].split('T')[0];
      where.delivery_date = { gte: fromStr };
    }

    if (hubId && hubId !== 'all') {
      where.hub_id = hubId;
    }

    const routingResults = await prisma.routingResult.findMany({
      where,
      include: {
        hub: true,
      },
      orderBy: { created_at: 'asc' },
    });

    const formattedData = routingResults.map((item) => {
      const hubTimes =
        typeof item.hub_times === 'string'
          ? JSON.parse(item.hub_times || '{}')
          : item.hub_times || {};
      const totalDistance =
        typeof item.total_distance === 'string'
          ? JSON.parse(item.total_distance || '{}')
          : item.total_distance || {};
      const timeData =
        typeof item.time === 'string'
          ? JSON.parse(item.time || '{}')
          : item.time || {};

      const formattedTime = {};
      for (const [p, t] of Object.entries(timeData)) {
        formattedTime[p] = {
          spentTime: Number(t.spentTime ?? t.spent_time) || 0,
          visitTime: Number(t.visitTime ?? t.visit_time) || 0,
          travelTime: Number(t.travelTime ?? t.travel_time) || 0,
          waitingTime: Number(t.waitingTime ?? t.waiting_time) || 0,
        };
      }

      return {
        id: item.id,
        _id: item.id,
        hubId: item.hub_id,
        name: item.name,
        deliveryDate: item.delivery_date,
        createdByUser: item.created_by_user,
        createdTime: item.delivery_date,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
        dispatchStatus: 'done',
        dropped: item.dropped,
        histories: item.histories,
        totalDistance,
        time: formattedTime,
        hubTimes,
        hub: item.hub,
      };
    });

    return NextResponse.json(formattedData);
  } catch (error) {
    console.error('Error Results:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Kesalahan sistem tidak diketahui';
    return NextResponse.json(
      {
        error: 'Gagal mengambil data results dari database',
        detail: errorMessage,
      },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { deliveryDate, hubId, force = false } = body || {};

    if (!deliveryDate) {
      return NextResponse.json(
        { error: 'Parameter "deliveryDate" (format YYYY-MM-DD) dibutuhkan.' },
        { status: 400 }
      );
    }

    if (!force) {
      const existingRouting = await prisma.routingResult.findFirst({
        where: {
          delivery_date: deliveryDate,
          ...(hubId ? { hub_id: String(hubId) } : {}),
        },
        select: { id: true },
      });

      if (existingRouting) {
        return NextResponse.json({
          message: `Data routing untuk tanggal pengiriman ${deliveryDate} sudah ada di database, dilewati.`,
          skipped: true,
          syncedCount: 0,
        });
      }
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    const apiToken = process.env.API_TOKEN;

    if (!apiUrl || !apiToken) {
      return NextResponse.json(
        { error: 'Konfigurasi server API hilang: NEXT_PUBLIC_API_URL atau API_TOKEN tidak ditemukan.' },
        { status: 500 }
      );
    }

    const deliveryDateObj = new Date(`${deliveryDate}T00:00:00Z`);
    const deliveryDayOfWeek = deliveryDateObj.getUTCDay();
    const daysBack = deliveryDayOfWeek === 1 ? 2 : 1;

    const expectedRoutingObj = new Date(deliveryDateObj);
    expectedRoutingObj.setUTCDate(expectedRoutingObj.getUTCDate() - daysBack);
    const expectedRoutingDateStr = expectedRoutingObj.toISOString().split('T')[0];

    const searchStartObj = new Date(expectedRoutingObj);
    searchStartObj.setUTCDate(searchStartObj.getUTCDate() - 1);
    const searchEndObj = new Date(deliveryDateObj);

    const pad = (n) => String(n).padStart(2, '0');
    const dateFromStr = `${searchStartObj.getUTCFullYear()}-${pad(searchStartObj.getUTCMonth() + 1)}-${pad(searchStartObj.getUTCDate())} 00:00:00`;
    const dateToStr = `${searchEndObj.getUTCFullYear()}-${pad(searchEndObj.getUTCMonth() + 1)}-${pad(searchEndObj.getUTCDate())} 23:59:59`;

    const externalUrl = new URL(`${apiUrl}/results`);
    externalUrl.searchParams.append('dateFrom', dateFromStr);
    externalUrl.searchParams.append('dateTo', dateToStr);
    externalUrl.searchParams.append('limit', '1000');
    if (hubId) {
      externalUrl.searchParams.append('hubId', hubId);
    }

    const externalResponse = await fetch(externalUrl.toString(), {
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    const data = await externalResponse.json();
    if (!externalResponse.ok) {
      return NextResponse.json(
        { error: 'Gagal mengambil data results dari vendor API', details: data },
        { status: externalResponse.status }
      );
    }

    const routingData = data?.data?.data || (Array.isArray(data?.data) ? data.data : []);

    const getWibDate = (iso) => {
      if (!iso) return null;
      const d = new Date(iso);
      const wib = new Date(d.getTime() + 7 * 60 * 60 * 1000);
      return wib.toISOString().split('T')[0];
    };

    const targetResults = routingData
      .filter((item) => {
        const isDone = item?.dispatchStatus?.toLowerCase() === 'done';
        if (!isDone) return false;

        const createdWibDate = getWibDate(item?.createdTime);
        const calculatedDelivery = getDeliveryDateFromRouting(item?.createdTime);

        return (
          createdWibDate === expectedRoutingDateStr &&
          calculatedDelivery === deliveryDate
        );
      })
      .sort((a, b) => new Date(a.createdTime || 0) - new Date(b.createdTime || 0));

    if (targetResults.length === 0) {
      return NextResponse.json({
        message: `Tidak ditemukan routing berstatus done yang dibuat pada H-${daysBack} (${expectedRoutingDateStr}) untuk tanggal pengiriman ${deliveryDate}.`,
        syncedCount: 0,
      });
    }

    const rawDrivers = await prisma.driver.findMany({
      where: hubId ? { hubs: { some: { id: hubId } } } : {},
    });

    const driversMap = {};
    rawDrivers.forEach((d) => {
      const email = (d.email || '').toLowerCase().trim();
      if (email && email !== '-') {
        if (!driversMap[email]) {
          driversMap[email] = { name: d.name, plat: getBasePlate(d.plat) };
        }
      }
    });

    const toKm = (m) => parseFloat(((m || 0) / 1000).toFixed(2));
    const toPct = (val, max) => parseFloat((max ? ((val || 0) / max) * 100 : 0).toFixed(2));
    const toHr = (mins) => {
      const h = Math.floor((mins || 0) / 60);
      const m = Math.floor((mins || 0) % 60);
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    };

    const targetResultIds = targetResults.map((t) => String(t._id));
    if (force) {
      await prisma.routingResult.deleteMany({
        where: {
          delivery_date: deliveryDate,
          ...(hubId ? { hub_id: String(hubId) } : {}),
          id: { notIn: targetResultIds },
        },
      });
    }

    const seenVehicles = new Map();
    const savedRecords = [];

    for (const item of targetResults) {
      const vehiclePlatesSet = new Set();
      const driverEmailsSet = new Set();

      const cleanedRouting = (item.result?.routing || []).map((r) => {
        let tW = 0,
          tV = 0,
          tD = 0,
          tTr = 0,
          tVi = 0,
          tWa = 0;

        if (r.trips && r.trips.length > 0) {
          const lastHubWait = Number(r.trips[r.trips.length - 1].waitingTime) || 0;
          if ((Number(r.trips[0].waitingTime) || 0) <= 0) {
            r.trips[0].waitingTime = lastHubWait;
          }

          r.trips = r.trips.map((t, i) => {
            if (t.isHub === false && t.visitId?.startsWith('taskId-')) {
              t.visitId = t.visitId.replace('taskId-', '');
            }

            const tripTravel = Number(t.travelTime) || 0;
            const tripVisit = Number(t.visitTime) || 0;
            const tripWait = Number(t.waitingTime) || 0;

            if (!t.isHub) {
              tW += t.weight || 0;
              tV += t.volume || 0;
            }
            tD += t.distance || 0;
            tTr += tripTravel;
            tVi += tripVisit;
            if (i !== r.trips.length - 1) {
              tWa += tripWait;
            }

            t.travelTime = tripTravel;
            t.visitTime = tripVisit;
            t.waitingTime = tripWait;
            t.spentTime = tripTravel + tripVisit + tripWait;

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


        const email = (r.assignee || '').toLowerCase().trim();
        if (email) driverEmailsSet.add(email);

        r.driverName = driversMap[email]?.name || null;
        if (!r.basePlat && !r.vehicleName) {
          r.basePlat = driversMap[email]?.plat || null;
        } else {
          r.basePlat = getBasePlate(r.basePlat || r.vehicleName);
        }

        if (r.basePlat && r.basePlat !== '-') {
          vehiclePlatesSet.add(r.basePlat);
        }

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
      
      const activeVehicles = cleanedRouting.filter((r) => {
        const customerTrips = (r.trips || []).filter((t) => !t.isHub && t.visitId);
        return customerTrips.length > 0;
      });



      const createdByUser = typeof item.user === 'object' ? item.user?.name : item.user || null;

      const totalDistanceMap = {};
      const timeMap = {};
      const hubTimesMap = {};

      for (const r of activeVehicles) {
        const taskIds = (r.trips || [])
          .filter((t) => !t.isHub && t.visitId)
          .map((t) => String(t.visitId));

        const vehicleName = r.vehicleName || r.basePlat || '-';
        const vehicleKey = (r.vehicleId ? String(r.vehicleId).trim() : vehicleName).toLowerCase().trim();
        const tripSignature = [...taskIds].sort().join(',');

        const existingTrips = seenVehicles.get(vehicleKey);
        if (existingTrips && existingTrips.has(tripSignature)) {
          continue;
        }

        if (!seenVehicles.has(vehicleKey)) {
          seenVehicles.set(vehicleKey, new Set());
        }
        seenVehicles.get(vehicleKey).add(tripSignature);

        const plateKey = r.basePlat || getBasePlate(r.vehicleName) || vehicleName;

        totalDistanceMap[plateKey] = Number(r.totalDistance) || 0;

        timeMap[plateKey] = {
          spent_time: Number(r.totalSpentTime) || 0,
          visit_time: Number(r.totalVisitTime) || 0,
          travel_time: Number(r.totalTravelTime) || 0,
          waiting_time: Number(r.totalWaitingTime) || 0,
        };

        const rawHubTrips = (r.trips || []).filter((t) => t.isHub === true);
        const middleCount = rawHubTrips.length - 2;
        let middleIndex = 0;

        hubTimesMap[plateKey] = rawHubTrips.map((t, idx) => {
          let category;
          if (idx === 0) {
            category = 'first';
          } else if (idx === rawHubTrips.length - 1) {
            category = 'last';
          } else {
            middleIndex++;
            category = middleCount === 1 ? 'middle' : `middle_${middleIndex}`;
          }

          return {
            visitId: t.visitId,
            isHub: true,
            order: t.order ?? idx,
            eta: t.eta || null,
            etd: t.etd || null,
            category,
          };
        });
      }

      const targetHubId =
        (item.hubId && String(item.hubId).trim() !== '' && item.hubId !== 'undefined'
          ? String(item.hubId).trim()
          : null) ||
        (hubId && String(hubId).trim() !== '' && hubId !== 'undefined'
          ? String(hubId).trim()
          : null) ||
        item.result?.routing?.[0]?.trips
          ?.find((t) => t.isHub && t.visitId?.startsWith('hub-'))
          ?.visitId?.replace('hub-', '') ||
        null;

      if (!targetHubId) {
        throw new Error(
          `Hub ID tidak ditemukan untuk data routing "${item.name || item._id}".`
        );
      }

      let historiesData = {
        total: 0,
        history: { move: [], dropped: [], switch: [], manual: [], change: [] },
      };

      try {
        const histResponse = await fetch(`${apiUrl}/result/${item._id}/history`, {
          headers: {
            Authorization: `Bearer ${apiToken}`,
            'Content-Type': 'application/json',
          },
          cache: 'no-store',
        });
        if (histResponse.ok) {
          const histJson = await histResponse.json();
          historiesData = formatRoutingHistories(histJson.data || []);
        }
      } catch (histError) {
        console.error(`Error fetching history for ${item._id}:`, histError);
      }

      const droppedCount = Array.isArray(item.result?.dropped) ? item.result.dropped.length : 0;

      await prisma.routingResult.upsert({
        where: { id: String(item._id) },
        update: {
          hub_id: targetHubId,
          name: item.name || '',
          delivery_date: deliveryDate,
          created_by_user: createdByUser,
          total_distance: totalDistanceMap,
          time: timeMap,
          hub_times: hubTimesMap,
          dropped: droppedCount,
          histories: historiesData,
        },
        create: {
          id: String(item._id),
          hub_id: targetHubId,
          name: item.name || '',
          delivery_date: deliveryDate,
          created_by_user: createdByUser,
          total_distance: totalDistanceMap,
          time: timeMap,
          hub_times: hubTimesMap,
          dropped: droppedCount,
          histories: historiesData,
        },
      });

      savedRecords.push(item._id);
    }

    return NextResponse.json({
      message: `Berhasil sinkronisasi ${savedRecords.length} data routing.`,
      syncedCount: savedRecords.length,
      ids: savedRecords,
    });
  } catch (error) {
    console.error('Error Sync Routing Results:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Kesalahan sistem tidak diketahui';
    return NextResponse.json(
      { error: 'Gagal sinkronisasi data routing ke database', detail: errorMessage },
      { status: 500 }
    );
  }
}

