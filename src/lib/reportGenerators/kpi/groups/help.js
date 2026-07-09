export function getVehicleCategory(driverName) {
  const name = (driverName || '').toUpperCase();
  if (name.includes('DRY')) return 'DRY';
  if (name.includes('FRZ') || name.includes('FROZEN') || name.includes('FRESH')) return 'FROZEN';
  return 'OTHER';
}

export function getNormalizedTruckId(route) {
  return route.assignee || route.vehicleName || route.vehicleId || 'Unknown';
}

export function calculateRouteTime(route) {
  const rawVisit = route.totalVisitTime;
  const rawTravel = route.totalTravelTime;
  const rawWait = route.totalWaitingTime;
  const rawSpent = route.totalSpentTime;
  const isVisitMissing = rawVisit === undefined || rawVisit === null;
  const isTravelMissing = rawTravel === undefined || rawTravel === null;
  const isWaitMissing = rawWait === undefined || rawWait === null;
  const isSpentMissing = rawSpent === undefined || rawSpent === null;
  let usedMinutes = 0;
  if (!isSpentMissing) {
    usedMinutes = rawSpent;
  } else {
    usedMinutes = (rawVisit || 0) + (rawTravel || 0) + (rawWait || 0);
  }
  return {
    minutes: usedMinutes,
    isMissing: isVisitMissing || isTravelMissing || isWaitMissing || isSpentMissing,
    rawData: { visit: rawVisit, travel: rawTravel, wait: rawWait, spent: rawSpent },
  };
}

export function formatMinutesToHHmm(totalMinutes) {
  if (totalMinutes == null || isNaN(totalMinutes) || totalMinutes <= 0) return '00:00';
  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.floor(totalMinutes % 60);
  const pad = (n) => n.toString().padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}`;
}

export function parseToUTC7(dateStr) {
  if (!dateStr) return null;
  try {
    const utcDate = new Date(dateStr.replace(' ', 'T') + 'Z');
    if (isNaN(utcDate.getTime())) return null;
    return new Date(utcDate.getTime() + 7 * 60 * 60 * 1000);
  } catch (e) {
    return null;
  }
}

export function formatTimeHHmm(dateObj) {
  if (!dateObj) return null;
  const hours = dateObj.getUTCHours().toString().padStart(2, '0');
  const minutes = dateObj.getUTCMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function getDayDifference(dateStart, dateEnd) {
  const d1 = new Date(
    Date.UTC(dateStart.getUTCFullYear(), dateStart.getUTCMonth(), dateStart.getUTCDate())
  );
  const d2 = new Date(
    Date.UTC(dateEnd.getUTCFullYear(), dateEnd.getUTCMonth(), dateEnd.getUTCDate())
  );
  const diffTime = d2 - d1;
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

export function getSortGroup(plat) {
  if (!plat) return 3;
  const p = plat.trim();
  const spaceCount = (p.match(/ /g) || []).length;
  if (spaceCount === 2) return 0;
  if (spaceCount > 2) {
    const upper = p.toUpperCase();
    if (upper.includes('SEWA')) return 1;
    if (upper.includes('DM')) return 2;
  }
  return 3;
}
