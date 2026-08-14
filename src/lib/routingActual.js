import {
  calculateMinuteDifference,
  formatDateUniversal,
  getBasePlate,
  getStorageType,
  normalizeEmail,
  parseCustomerString,
} from './utils';

export function routingActual({ tasks, drivers, dateStr }) {
  if (!tasks || !drivers) return [];

  const emailPlatMap = new Map();
  const emailFallbackMap = new Map();
  for (const d of drivers) {
    const normEmail = normalizeEmail(d.email);
    const bPlat = getBasePlate(d.plat) || d.plat || '';
    if (normEmail) {
      emailFallbackMap.set(normEmail, { plat: d.plat || null, name: d.name });
      if (bPlat)
        emailPlatMap.set(`${normEmail}_${bPlat.toLowerCase()}`, { plat: d.plat, name: d.name });
    }
  }

  const processed = [];

  for (const t of tasks) {
    const flow = t.flow || '';

    const taskPlat =
      t.assignedVehicle?.name ||
      t.assignedVehicle?.plat ||
      (typeof t.assignedVehicle === 'string' ? t.assignedVehicle : null) ||
      t.vehicle?.name ||
      t.vehicle?.plat ||
      t.vehicleName ||
      t.vehicleId ||
      t.plat ||
      t.licensePlate ||
      null;

    const emailStr = Array.isArray(t.assignee) && t.assignee.length > 0 ? t.assignee[0] : null;
    const driverEmail = normalizeEmail(emailStr);
    const taskBasePlat = getBasePlate(taskPlat) || taskPlat || '';

    let driverInfo = null;
    if (driverEmail && taskBasePlat) {
      driverInfo = emailPlatMap.get(`${driverEmail}_${taskBasePlat.toLowerCase()}`);
    }
    if (!driverInfo && driverEmail) {
      driverInfo = emailFallbackMap.get(driverEmail);
    }

    const driverName = driverInfo?.name || t.assignedTo?.name || driverEmail || 'N/A';
    const finalPlat = taskPlat || driverInfo?.plat || '-';
    const basePlat = getBasePlate(finalPlat) || finalPlat;
    const groupKey = `${driverName}_${basePlat}`;

    let statusLabel = t.statusDelivery?.length > 0 ? t.statusDelivery[0].toUpperCase() : null;
    if (flow === 'Pickup') statusLabel = t.status ? t.status.toUpperCase() : statusLabel;
    if (flow === 'Pickup' && statusLabel === 'DONE') statusLabel = 'SUKSES';
    if (t.status !== 'ONGOING' && flow !== 'Pickup') statusLabel = statusLabel || '-';

    const rawCustStr = t.customerOrder || t.customerName || '';
    const {
      name: cName,
      id: cId,
      location: cLoc,
      fullCustomerName,
    } = parseCustomerString(rawCustStr);

    const isGrOrPickup = flow.toUpperCase().includes('GR') || flow.toUpperCase().includes('PICKUP');
    const actualArr = isGrOrPickup
      ? t.page1DoneTime
      : t.klikJikaSudahSampai || t.klikJikaAndaSudahSampai;
    const actualDep = isGrOrPickup ? t.page1DoneTime : t.page3DoneTime;

    const actualArrVal = formatDateUniversal(actualArr, 'HH:mm') || '-';
    const openTimeVal = formatDateUniversal(`${dateStr} ${t.openTime}`, 'HH:mm') || '-';
    const closeTimeVal = formatDateUniversal(`${dateStr} ${t.closeTime}`, 'HH:mm') || '-';

    let hoursStatus = null;
    if (actualArrVal !== '-' && openTimeVal !== '-' && closeTimeVal !== '-') {
      const isInside =
        openTimeVal > closeTimeVal
          ? actualArrVal >= openTimeVal || actualArrVal <= closeTimeVal
          : actualArrVal >= openTimeVal && actualArrVal <= closeTimeVal;
      hoursStatus = isInside ? 'yes' : actualArrVal < openTimeVal ? 'early' : 'no';
    }

    processed.push({
      groupKey,
      basePlat,
      driver: driverName,
      driverEmail,
      plat: finalPlat,
      actualArrivalTimestamp: actualArr ? new Date(actualArr).getTime() : null,
      roSequence: t.routePlannedOrder || 0,
      statusLabel,
      flow,
      customerName: fullCustomerName || cName || t.customerName,
      originalCustomerString: rawCustStr,
      customerId: cId,
      locationId: cLoc,
      openTime: openTimeVal,
      closeTime: closeTimeVal,
      eta: formatDateUniversal(`${dateStr} ${t.eta}`, 'HH:mm') || '-',
      etd: formatDateUniversal(`${dateStr} ${t.etd}`, 'HH:mm') || '-',
      actualArrival: actualArrVal,
      actualDeparture: formatDateUniversal(actualDep, 'HH:mm') || '-',
      visitTime: t.visitTime || '-',
      actualVisitTime:
        actualArr && actualDep ? calculateMinuteDifference(actualArr, actualDep) : '-',
      isManualAssign: !t.routePlannedOrder || t.routePlannedOrder === 0,
      isWithinHoursStatus: hoursStatus,
      reason: t.alasan || '',
      orderId: t.orderId || '',
      temperature: getStorageType(driverName),
      rawTask: t,
    });
  }

  processed.sort((a, b) => {
    if (a.groupKey !== b.groupKey) return a.groupKey.localeCompare(b.groupKey);
    return (a.actualArrivalTimestamp || Infinity) - (b.actualArrivalTimestamp || Infinity);
  });

  let currGroup = null,
    rank = 1;
  for (const row of processed) {
    if (row.groupKey !== currGroup) {
      currGroup = row.groupKey;
      rank = 1;
    }
    row.realSequence = row.actualArrivalTimestamp ? rank++ : null;
  }

  return processed;
}
