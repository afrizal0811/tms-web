import { getStorageType } from '@/lib/utils';

export function calculateGroupThree(resultsData, historiesData) {
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
          const driverName = route.driverName || '';
          const category = getStorageType(driverName).toUpperCase();

          const hasTrips = Array.isArray(route.trips) && route.trips.length > 0;
          const activeWeight = Number(route.totalWeight || 0);
          const activeVolume = Number(route.totalVolume || 0);
          const isVehicleActive =
            hasTrips &&
            (activeWeight > 0 || activeVolume > 0 || Number(route.totalVisits || 0) > 0);

          if (isVehicleActive) {
            const vehicleDistMeters = Number(route.totalDistance || 0);
            if (category === 'DRY') rawDistDryMeters += vehicleDistMeters;
            else if (category === 'FROZEN') rawDistFrzMeters += vehicleDistMeters;
          }
        });
      }
    });
  }

  return {
    actOperatingHours: Math.round(totalActMinutes / 60),
    estDistanceDry: Number((rawDistDryMeters / 1000).toFixed(2)),
    estDistanceFrz: Number((rawDistFrzMeters / 1000).toFixed(2)),
  };
}
