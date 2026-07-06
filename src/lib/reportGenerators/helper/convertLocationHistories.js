import {
  formatTimestampToDDMMYYYY_UTC7,
  formatTimestampToQuotedHHMM_UTC7,
  getBasePlate,
  normalizeEmail,
} from '@/lib/utils';
import { isTripInShift } from './isTripInShift';

export function convertLocationHistories(allApiData, driverData, selectedDateString) {
  const emailToDriverMap = driverData.reduce((acc, d) => {
    const e = normalizeEmail(d.email);
    if (e) acc[e] = { plat: d.plat, name: d.name, workingTime: d.workingTime };
    return acc;
  }, {});

  const [y, m, d] = selectedDateString.split('-');
  const targetDateFormatted = `${d}-${m}-${y}`;

  const processed = allApiData
    .map((item) => {
      const email = normalizeEmail(item.email);
      const dInfo = emailToDriverMap[email];
      return {
        email,
        emailExists: !!dInfo,
        plat: dInfo?.plat,
        driver: dInfo?.name || email,
        workingTime: dInfo?.workingTime,
        trackedTime: Math.abs(item.trackedTime || 0),
        totalDistance: item.finish?.totalDistance || 0,
        startDate: formatTimestampToDDMMYYYY_UTC7(item.startTime),
        rawStart: item.startTime,
        rawFinish: item.finish?.finishTime,
        travelTimeVal: item.finish?.totalDuration || 0,
        startTimeFmt: formatTimestampToQuotedHHMM_UTC7(item.startTime),
        finishDateFmt: formatTimestampToDDMMYYYY_UTC7(item.finish?.finishTime),
        finishTimeFmt: formatTimestampToQuotedHHMM_UTC7(item.finish?.finishTime),
      };
    })
    .filter(
      (i) =>
        i.trackedTime >= 10 &&
        i.totalDistance > 5 &&
        i.emailExists &&
        i.startDate === targetDateFormatted
    );

  const grouped = {};
  processed.forEach((i) => {
    if (!grouped[i.email]) grouped[i.email] = [];
    grouped[i.email].push(i);
  });

  const timeDataObjects = [];
  const seenEmails = new Set();
  const uniqueDrivers = driverData.filter((d) => {
    if (d.plat?.toUpperCase().includes('DEMO')) return false;
    const e = normalizeEmail(d.email);
    if (!e || seenEmails.has(e)) return false;
    seenEmails.add(e);
    return true;
  });

  uniqueDrivers.forEach((driver) => {
    const email = normalizeEmail(driver.email);
    const records = grouped[email];
    const cleanPlat = getBasePlate(driver.plat);
    const emptyRow = {
      plat: cleanPlat,
      driver: driver.name,
      startDate: null,
      startTimeFmt: null,
      finishDateFmt: null,
      finishTimeFmt: null,
      travelTimeVal: null,
      totalDistance: null,
      isMultiple: false,
    };

    if (records && records.length > 0) {
      const uniques = records.filter(
        (v, idx, self) =>
          idx === self.findIndex((t) => t.rawStart === v.rawStart && t.rawFinish === v.rawFinish)
      );
      if (uniques.length === 1) {
        timeDataObjects.push({
          ...uniques[0],
          plat: cleanPlat,
          driver: driver.name,
          isMultiple: false,
        });
        return;
      }
      const filtered = uniques.filter((r) => isTripInShift(r.rawStart, r.rawFinish, r.workingTime));
      if (filtered.length > 0) {
        filtered.sort(
          (a, b) => new Date(a.rawStart.replace(' ', 'T')) - new Date(b.rawStart.replace(' ', 'T'))
        );
        filtered.forEach((r) =>
          timeDataObjects.push({
            ...r,
            plat: cleanPlat,
            driver: driver.name,
            isMultiple: filtered.length > 1,
          })
        );
      } else {
        timeDataObjects.push(emptyRow);
      }
    } else {
      timeDataObjects.push(emptyRow);
    }
  });

  return { timeDataObjects };
}
