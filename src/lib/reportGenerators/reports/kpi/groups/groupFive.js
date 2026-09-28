import { formatMinutesToHHMM, formatDateUniversal, getStorageType, normalizeEmail } from '@/lib/utils';

export function calculateGroupFive(tasksData, driverData, historiesData, g2DetailRows = []) {
  let countMasterMaintenance = 0;

  if (Array.isArray(tasksData)) {
    tasksData.forEach((task) => {
      let val = task.gpsSesuai;
      if (typeof val === 'string' && val.includes(',')) val = val.split(',')[0].trim();

      if (
        String(val || '')
          .trim()
          .toUpperCase() === 'TIDAK'
      ) {
        countMasterMaintenance++;
      }
    });
  }

  const historyMap = (Array.isArray(historiesData) ? historiesData : []).reduce((acc, h) => {
    const email = normalizeEmail(h.email);
    if (email) {
      if (!acc[email]) acc[email] = [];
      acc[email].push(h);
    }
    return acc;
  }, {});

  const startFinishRows = [];
  const routeReviewRows = [];

  if (Array.isArray(driverData)) {
    driverData.forEach((driver) => {
      const email = normalizeEmail(driver.email);
      const driverHistories = historyMap[email] || [];
      const category = getStorageType(driver.name).toUpperCase();

      let totalActMinutes = 0;
      const isMultipleSessions = driverHistories.length > 1;

      if (driverHistories.length > 0) {
        driverHistories.forEach((h) => {
          const startStr = h.startTime;
          const finishStr = h.finish?.finishTime;
          let startDate = null;
          let startTime = null;
          let finishDate = null;
          let finishTime = null;
          let durasiStr = null;

          if (startStr && finishStr) {
            const startObj = new Date(startStr);
            const finishObj = new Date(finishStr);

            if (!isNaN(startObj.getTime()) && !isNaN(finishObj.getTime())) {
              startDate = formatDateUniversal(startStr, 'DD-MM-YYYY');
              startTime = formatDateUniversal(startStr, 'HH:mm');
              finishDate = formatDateUniversal(finishStr, 'DD-MM-YYYY');
              finishTime = formatDateUniversal(finishStr, 'HH:mm');
              const diffMins = (finishObj.getTime() - startObj.getTime()) / 60000;
              if (diffMins > 0) {
                totalActMinutes += diffMins;
                durasiStr = formatMinutesToHHMM(diffMins, false);
              }
            }
          }

          startFinishRows.push({
            tipe: category,
            plat: driver.basePlat,
            driver: driver.name,
            startDate,
            startTime,
            finishDate,
            finishTime,
            durasi: durasiStr,
            isMultipleSessions,
          });
        });
      } else {
        startFinishRows.push({
          tipe: category,
          plat: driver.basePlat,
          driver: driver.name,
          startDate: null,
          startTime: null,
          finishDate: null,
          finishTime: null,
          durasi: null,
          isMultipleSessions: false,
        });
      }

      let totalEstHours = 0;
      let hasRouting = false;

      if (g2DetailRows && g2DetailRows.length > 0) {
        const driverNameUpper = (driver.name || '').toUpperCase().trim();
        const matchingG2 = g2DetailRows.filter((g) => {
          if (g.isNoRoutingData) return false;
          const gDriver = (g.driver || '').toUpperCase().trim();
          return gDriver && driverNameUpper && gDriver === driverNameUpper;
        });

        if (matchingG2.length > 0) {
          hasRouting = true;
          matchingG2.forEach((g) => {
            if (g.spent > 0) totalEstHours += Math.floor(g.spent / 60);
          });
        }
      }

      let estOpHours = null;
      let actOpHours = null;
      let overtime = null;

      if (hasRouting || totalActMinutes > 0) {
        const actH = Math.floor(totalActMinutes / 60);
        if (totalEstHours !== 0 || actH !== 0) {
          estOpHours = totalEstHours;
          actOpHours = actH;
          overtime = totalEstHours - actH;
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
