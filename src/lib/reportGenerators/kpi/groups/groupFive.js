import {
  formatMinutesToHHMM,
  formatTimestampToQuotedHHMM_UTC7,
  getStorageType,
  normalizeEmail,
} from '@/lib/utils';

export function calculateGroupFive(tasksData, driverData, historiesData, g2DetailRows = []) {
  let countMasterMaintenance = 0;
  if (Array.isArray(tasksData)) {
    tasksData.forEach((task) => {
      let val = '';
      if (Array.isArray(task.gpsSesuai) && task.gpsSesuai.length > 0) {
        val = String(task.gpsSesuai[0] || '')
          .trim()
          .toUpperCase();
      } else if (typeof task.gpsSesuai === 'string') {
        val = String(task.gpsSesuai).trim().toUpperCase();
      }

      if (val === 'TIDAK') {
        countMasterMaintenance++;
      }
    });
  }

  const historyMap = {};
  if (Array.isArray(historiesData)) {
    historiesData.forEach((h) => {
      const email = normalizeEmail(h.email);
      if (email) {
        if (!historyMap[email]) historyMap[email] = [];
        historyMap[email].push(h);
      }
    });
  }

  const startFinishRows = [];
  const routeReviewRows = [];
  let totalAllMinutes = 0;

  if (Array.isArray(driverData)) {
    driverData.forEach((driver) => {
      const email = normalizeEmail(driver.email);
      const driverHistories = historyMap[email] || [];
      const category = getStorageType(driver.name).toUpperCase();

      let totalActMinutes = 0;
      let isMultipleSessions = driverHistories.length > 1;

      if (driverHistories.length > 0) {
        driverHistories.forEach((h) => {
          const startStr = h.startTime;
          const finishStr = h.finish?.finishTime;
          let jamStart = null;
          let jamFinish = null;
          let durasiStr = null;

          if (startStr && finishStr) {
            const st = new Date(startStr);
            const fi = new Date(finishStr);
            jamStart = formatTimestampToQuotedHHMM_UTC7(startStr);
            jamFinish = formatTimestampToQuotedHHMM_UTC7(finishStr);
            const diffMins = (fi - st) / 60000;
            if (diffMins > 0) {
              totalActMinutes += diffMins;
              totalAllMinutes += diffMins;
              durasiStr = formatMinutesToHHMM(diffMins, false);
            }
          }

          startFinishRows.push({
            tipe: category,
            plat: driver.plat,
            driver: driver.name,
            jamStart,
            jamFinish,
            durasi: durasiStr,
            isMultipleSessions,
          });
        });
      } else {
        startFinishRows.push({
          tipe: category,
          plat: driver.plat,
          driver: driver.name,
          jamStart: null,
          jamFinish: null,
          durasi: null,
          isMultipleSessions: false,
        });
      }

      let totalEstHours = 0;
      let hasRouting = false;

      if (g2DetailRows && g2DetailRows.length > 0) {
        const matchingG2 = g2DetailRows.filter((g) => {
          if (g.isNoRoutingData) return false;
          const gDriver = (g.driver || '').toUpperCase().trim();
          const rDriver = (driver.name || '').toUpperCase().trim();
          return gDriver && rDriver && gDriver === rDriver;
        });

        if (matchingG2.length > 0) {
          hasRouting = true;
          matchingG2.forEach((g) => {
            const manualTotal =
              (Number(g.visit) || 0) + (Number(g.travel) || 0) + (Number(g.wait) || 0);
            if (manualTotal > 0) {
              totalEstHours += Math.floor(manualTotal / 60);
            }
          });
        }
      }

      let estOpHours = null;
      let actOpHours = null;
      let overtime = null;

      if (hasRouting || totalActMinutes > 0) {
        const estH = totalEstHours;
        const actH = Math.floor(totalActMinutes / 60);

        if (estH === 0 && actH === 0) {
          estOpHours = null;
          actOpHours = null;
          overtime = null;
        } else {
          estOpHours = estH;
          actOpHours = actH;
          overtime = estH - actH;
        }
      }

      routeReviewRows.push({
        tipe: category,
        plat: driver.plat,
        driver: driver.name,
        estOpHours,
        actOpHours,
        overtime,
      });
    });
  }

  return {
    countMasterMaintenance,
    startFinishRows,
    routeReviewRows,
  };
}
