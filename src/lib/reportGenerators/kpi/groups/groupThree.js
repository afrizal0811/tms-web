import { getStorageType, normalizeEmail } from '@/lib/utils';

export function calculateGroupThree(resultsData, historiesData, driverMap) {
  let totalActMinutes = 0;

  if (Array.isArray(historiesData)) {
    historiesData.forEach((history) => {
      if (history.startTime && history.finish?.finishTime) {
        const start = new Date(history.startTime);
        const end = new Date(history.finish.finishTime);
        const diffMs = end - start;
        const diffMins = diffMs / (1000 * 60);

        if (diffMins > 0) {
          totalActMinutes += diffMins;
        }
      }
    });
  }

  const actOperatingHours = Math.floor(totalActMinutes / 60);

  let rawDistDryMeters = 0;
  let rawDistFrzMeters = 0;

  if (Array.isArray(resultsData)) {
    resultsData.forEach((item) => {
      if (item.result && Array.isArray(item.result.routing)) {
        item.result.routing.forEach((route) => {
          const email = normalizeEmail(route.assignee);
          const driverName = driverMap[email] || route.assignee || '';
          const category = getStorageType(driverName);

          let routeWeight = 0;
          let routeVolume = 0;
          const hasTrips = Array.isArray(route.trips) && route.trips.length > 0;

          if (hasTrips) {
            route.trips.forEach((trip) => {
              if (!trip.isHub) {
                routeWeight += Number(trip.weight) || 0;
                routeVolume += Number(trip.volume) || 0;
              }
            });
          }

          const rawTotalWeight = route.totalWeight !== undefined ? Number(route.totalWeight) : 0;
          const rawTotalVolume = route.totalVolume !== undefined ? Number(route.totalVolume) : 0;

          const activeWeight = routeWeight > 0 ? routeWeight : rawTotalWeight;
          const activeVolume = routeVolume > 0 ? routeVolume : rawTotalVolume;

          const isVehicleActive =
            hasTrips &&
            (activeWeight > 0 ||
              activeVolume > 0 ||
              (route.totalVisits !== undefined && Number(route.totalVisits) > 0));

          if (isVehicleActive) {
            let sumDist = 0;

            if (hasTrips) {
              route.trips.forEach((trip) => {
                sumDist += Number(trip.distance) || 0;
              });
            }

            const vehicleDistMeters =
              sumDist > 0
                ? sumDist
                : route.totalDistance !== undefined
                  ? Number(route.totalDistance)
                  : 0;

            if (category === 'DRY') {
              rawDistDryMeters += vehicleDistMeters;
            } else if (category === 'FROZEN') {
              rawDistFrzMeters += vehicleDistMeters;
            }
          }
        });
      }
    });
  }

  const estDistDry = Number((rawDistDryMeters / 1000).toFixed(2));
  const estDistFrz = Number((rawDistFrzMeters / 1000).toFixed(2));

  return {
    actOperatingHours,
    estDistanceDry: estDistDry,
    estDistanceFrz: estDistFrz,
  };
}
