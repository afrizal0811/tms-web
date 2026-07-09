import { getStorageType, normalizeEmail } from '@/lib/utils';

export function calculateGroupThree(resultsData, historiesData, driverMap) {
  let totalActMinutes = 0;

  if (Array.isArray(historiesData)) {
    historiesData.forEach((history) => {
      if (history.startTime && history.finish?.finishTime) {
        const diffMins =
          (new Date(history.finish.finishTime) - new Date(history.startTime)) / 60000;
        if (diffMins > 0) totalActMinutes += diffMins;
      }
    });
  }

  let rawDistDryMeters = 0;
  let rawDistFrzMeters = 0;

  if (Array.isArray(resultsData)) {
    resultsData.forEach((item) => {
      if (item.result && Array.isArray(item.result.routing)) {
        item.result.routing.forEach((route) => {
          const email = normalizeEmail(route.assignee);
          const driverName = driverMap[email] || route.assignee || '';
          const category = getStorageType(driverName).toUpperCase();

          let routeWeight = 0;
          let routeVolume = 0;
          let sumDist = 0;
          const hasTrips = Array.isArray(route.trips) && route.trips.length > 0;

          if (hasTrips) {
            route.trips.forEach((trip) => {
              if (!trip.isHub) {
                routeWeight += Number(trip.weight) || 0;
                routeVolume += Number(trip.volume) || 0;
              }
              sumDist += Number(trip.distance) || 0;
            });
          }

          const activeWeight = routeWeight > 0 ? routeWeight : Number(route.totalWeight || 0);
          const activeVolume = routeVolume > 0 ? routeVolume : Number(route.totalVolume || 0);
          const isVehicleActive =
            hasTrips &&
            (activeWeight > 0 || activeVolume > 0 || Number(route.totalVisits || 0) > 0);

          if (isVehicleActive) {
            const vehicleDistMeters = sumDist > 0 ? sumDist : Number(route.totalDistance || 0);
            if (category === 'DRY') rawDistDryMeters += vehicleDistMeters;
            else if (category === 'FROZEN') rawDistFrzMeters += vehicleDistMeters;
          }
        });
      }
    });
  }

  return {
    actOperatingHours: Math.floor(totalActMinutes / 60),
    estDistanceDry: Number((rawDistDryMeters / 1000).toFixed(2)),
    estDistanceFrz: Number((rawDistFrzMeters / 1000).toFixed(2)),
  };
}
