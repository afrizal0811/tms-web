import { resolveRouteCategory } from '../../../helper/resolveRouteCategory';

export function calculateGroupThree(
  resultsData,
  historiesData,
  driverMap,
  driverData = [],
  tasksData = []
) {
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
      const plates = Array.from(
        new Set([
          ...Object.keys(item.totalDistance || {}),
          ...Object.keys(item.time || {}),
          ...Object.keys(item.hubTimes || {}),
        ])
      );

      plates.forEach((plat) => {
        const route = { basePlat: plat, vehicleName: plat };
        const category = resolveRouteCategory(route, item, tasksData, driverData, driverMap);
        const vehicleDistMeters = Number(item.totalDistance?.[plat] || 0);

        if (vehicleDistMeters > 0) {
          if (category === 'DRY') rawDistDryMeters += vehicleDistMeters;
          else if (category === 'FROZEN') rawDistFrzMeters += vehicleDistMeters;
        }
      });
    });
  }

  return {
    actOperatingHours: Math.round(totalActMinutes / 60),
    estDistanceDry: Number((rawDistDryMeters / 1000).toFixed(2)),
    estDistanceFrz: Number((rawDistFrzMeters / 1000).toFixed(2)),
  };
}
