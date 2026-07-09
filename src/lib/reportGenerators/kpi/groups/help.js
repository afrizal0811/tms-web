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
