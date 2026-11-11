import { getBasePlate, normalizeEmail } from '@/lib/utils';
import { generateSheetRouteReview } from '../sheets/sheetRouteReview';
import { calculateDistanceSummary } from './distanceSummary';
import { calculateLoadingCapacity } from './loadingCapacity';
import { calculateRouteReview } from './routeReview';
import { calculateRoutingTime } from './routingTime';
import { calculateVolumeSummary } from './volumeSummary';

export function calculateEstimatedHours(g2) {
  let totalMenitEstDry = 0;
  let totalMenitEstFrz = 0;
  const seenRouting = new Set();

  if (g2 && Array.isArray(g2.detailRows)) {
    g2.detailRows.forEach((row) => {
      if (row.isNoRoutingData) return;
      const spentTimeHHMM = `${Math.floor(row.spent / 60)}:${String(row.spent % 60).padStart(2, '0')}`;
      const key = `${row.routing}|${getBasePlate((row.plat || '').toUpperCase().trim())}|${row.driver}|${row.visit}|${row.travel}|${row.wait}|${row.spent}|${spentTimeHHMM}`;
      if (seenRouting.has(key)) return;
      seenRouting.add(key);
      if (row.category === 'DRY') totalMenitEstDry += row.spent;
      else if (row.category === 'FROZEN') totalMenitEstFrz += row.spent;
    });
  }

  return {
    estHourDry: g2?.opsHoursDry != null ? g2.opsHoursDry : Math.round(totalMenitEstDry / 60),
    estHourFrz: g2?.opsHoursFrz != null ? g2.opsHoursFrz : Math.round(totalMenitEstFrz / 60),
  };
}

export function calculateActualHours(g5) {
  let actHourDry = 0;
  let actHourFrz = 0;

  if (g5 && Array.isArray(g5.startFinishRows)) {
    const dedupeSF = new Map();
    g5.startFinishRows.forEach((row) => {
      let durasiHour = 0;
      if (typeof row.durasi === 'string' && row.durasi.includes(':')) {
        const parts = row.durasi.split(':');
        const totalMenit = (parseInt(parts[0], 10) || 0) * 60 + (parseInt(parts[1], 10) || 0);
        durasiHour = Math.round(totalMenit / 60);
      }
      const key = `${row.tipe}|${row.driver}|${row.startTime}|${row.finishTime}|${row.durasi}`;
      dedupeSF.set(key, { durasiHour, tipe: row.tipe });
    });

    dedupeSF.forEach((val) => {
      if (val.tipe === 'DRY') actHourDry += val.durasiHour;
      else if (val.tipe === 'FROZEN') actHourFrz += val.durasiHour;
    });
  }

  return { actHourDry, actHourFrz };
}

export function buildKpiDataPayload({
  g1,
  g3,
  g4,
  g5,
  estHourDry,
  estHourFrz,
  actHourDry,
  actHourFrz,
  sumOvertime,
}) {
  return {
    truck_dry: Number(g1.countDry || 0),
    truck_frz: Number(g1.countFrz || 0),
    total_truck: Number(g1.countTotal || 0),
    task_dry: Number(g1.ttDry || 0),
    task_frz: Number(g1.ttFrz || 0),
    pending_dry: Number(g1.rtDry || 0),
    pending_frz: Number(g1.rtFrz || 0),
    pending_routing: Number(g1.rtRouting ?? 0),
    pending_driver: Number(g1.rtDriver ?? 0),
    pending_sales: Number(g1.rtSales ?? 0),
    pending_customer: Number(g1.rtCustomer ?? 0),
    pending_other: Number(g1.rtOther ?? 0),
    est_hour_dry: Number(estHourDry || 0),
    est_hour_frz: Number(estHourFrz || 0),
    act_hour_dry: Number(actHourDry || 0),
    act_hour_frz: Number(actHourFrz || 0),
    est_dist_dry: Number(g3.estDistanceDry || 0),
    est_dist_frz: Number(g3.estDistanceFrz || 0),
    act_dist_dry: Number(g4.actDistDryKm || 0),
    act_dist_frz: Number(g4.actDistFrzKm || 0),
    capacity_kg_dry: Number(g4.capWeightDry || 0),
    total_kg_dry: Number(g4.actWeightDry || 0),
    capacity_cbm_dry: Number(g4.capVolDry || 0),
    total_cbm_dry: Number(g4.actVolDry || 0),
    capacity_kg_frz: Number(g4.capWeightFrz || 0),
    total_kg_frz: Number(g4.actWeightFrz || 0),
    capacity_cbm_frz: Number(g4.capVolFrz || 0),
    total_cbm_frz: Number(g4.actVolFrz || 0),
    updated_master: Math.round(Number(g5.countMasterMaintenance || 0)),
    route_review: Math.abs(Number(sumOvertime || 0)),
  };
}

export function buildEmailDriverMap(driverData = []) {
  const map = {};
  if (Array.isArray(driverData)) {
    driverData.forEach((d) => {
      const email = normalizeEmail(d.email);
      if (email) map[email] = (d.name || '').toUpperCase();
    });
  }
  return map;
}

export function computeKpiMetrics({ resultsData, taskList, historiesData, driverData, driverMap }) {
  const emailDriverMap = driverMap || buildEmailDriverMap(driverData);

  const g1 = calculateVolumeSummary(resultsData, taskList, emailDriverMap, driverData);
  const g2 = calculateRoutingTime(resultsData, emailDriverMap, driverData, taskList);
  const g3 = calculateDistanceSummary(
    resultsData,
    historiesData,
    emailDriverMap,
    driverData,
    taskList
  );
  const g4 = calculateLoadingCapacity(
    resultsData,
    historiesData,
    driverData,
    taskList,
    emailDriverMap
  );
  const g5 = calculateRouteReview(taskList, driverData, historiesData, g2.detailRows);

  const { sumOvertime } = generateSheetRouteReview(
    g5.routeReviewRows,
    g5.startFinishRows,
    g2.detailRows
  );

  const { estHourDry, estHourFrz } = calculateEstimatedHours(g2);
  const { actHourDry, actHourFrz } = calculateActualHours(g5);

  const kpiDataPayload = buildKpiDataPayload({
    g1,
    g3,
    g4,
    g5,
    estHourDry,
    estHourFrz,
    actHourDry,
    actHourFrz,
    sumOvertime,
  });

  return { g1, kpiDataPayload };
}

