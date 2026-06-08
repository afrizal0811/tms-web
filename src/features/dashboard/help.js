import {
  formatDateUniversal,
  formatDateWIB,
  formatSimpleTime,
  formatTimestampToHHMM,
  isEmpty,
  normalizeEmail,
  parseAndShiftToUTC7,
  parseCustomerString,
} from '@/lib/utils';
import * as XLSX from 'xlsx-js-style';

export const serviceLevelData = [
  {
    name: 'SUKSES',
    tKey: 'success',
    dark_color: '#7bf1a8',
    light_color: '#00a63e',
  },
  {
    name: 'PENDING',
    tKey: 'pending',
    dark_color: '#FC9827',
    light_color: '#d97706',
  },
  {
    name: 'BATAL',
    tKey: 'cancel',
    dark_color: '#ffa2a2',
    light_color: '#e7000b',
  },
  {
    name: 'PARTIAL',
    tKey: 'partial',
    dark_color: '#86BBF9',
    light_color: '#4c9bf4',
  },
  {
    name: 'PENDING_GR',
    tKey: 'pending_gr',
    dark_color: '#CF9FFF',
    light_color: '#962EFF',
  },
];

export const seqAccuracyData = [
  {
    name: 'manual',
    tKey: 'manual_assign',
    dark_color: '#86BBF9',
    light_color: '#4c9bf4',
  },
  {
    name: 'match',
    tKey: 'match',
    dark_color: '#7bf1a8',
    light_color: '#00a63e',
  },
  {
    name: 'mismatch',
    tKey: 'mismatch',
    dark_color: '#ffa2a2',
    light_color: '#e7000b',
  },
];

export const loadCapacityData = [
  {
    name: 'veryLow',
    tKey: 'very_low',
    footer: '< 10%',
    dark_color: '#86BBF9',
    light_color: '#4c9bf4',
  },
  {
    name: 'low',
    tKey: 'low',
    footer: '40-60%',
    dark_color: '#CF9FFF',
    light_color: '#962EFF',
  },
  {
    name: 'normal',
    tKey: 'normal',
    footer: '60-85%',
    dark_color: '#7bf1a8',
    light_color: '#00a63e',
  },
  {
    name: 'full',
    tKey: 'full',
    footer: '85-100%',
    dark_color: '#FC9827',
    light_color: '#d97706',
  },
  {
    name: 'overload',
    tKey: 'overload',
    footer: '> 100%',
    dark_color: '#ffa2a2',
    light_color: '#e7000b',
  },
];

export const processLoadCapacityData = (tasks, driverData, year) => {
  const driverMap = {};
  if (Array.isArray(driverData)) {
    driverData.forEach((d) => {
      if (d.email) {
        driverMap[d.email] = {
          maxWeight: Math.abs(Number(d.maxWeight) || 0),
          maxVolume: Math.abs(Number(d.maxVolume) || 0),
          name: d.name,
          plat: d.plat,
        };
      }
    });
  }

  const monthlyData = Array.from({ length: 12 }, (_, i) => ({
    monthIndex: i,
    key: `${year}-${String(i + 1).padStart(2, '0')}`,
    veryLow: 0,
    low: 0,
    normal: 0,
    full: 0,
    overload: 0,
    details: {},
  }));

  const taskList = Array.isArray(tasks) ? tasks : tasks?.data || [];
  if (!taskList || taskList.length === 0) return monthlyData;
  const trips = {};

  taskList.forEach((task) => {
    if (!task || !task.startTime) return;
    const rawDate = new Date(task.startTime);
    if (isNaN(rawDate)) return;

    const wibOffset = 7 * 60 * 60 * 1000;
    const wibDate = new Date(rawDate.getTime() + wibOffset);
    if (wibDate.getUTCFullYear() !== year) return;

    let driverEmail = task.assignedTo?.email;
    if (!driverEmail && Array.isArray(task.assignee) && task.assignee.length > 0) {
      driverEmail = task.assignee[0];
    }

    if (!driverEmail) return;

    const mapData = driverMap[driverEmail];
    const vehiclePlat = mapData?.plat || task.assignedVehicle?.name || 'Unknown';

    if (vehiclePlat === 'Unknown') return;

    const dateStr = wibDate.toISOString().split('T')[0];
    const key = `${dateStr}_${driverEmail}`;

    if (!trips[key]) {
      const driverName = mapData?.name || task.assignedTo?.name || driverEmail;

      trips[key] = {
        date: dateStr,
        monthIndex: wibDate.getUTCMonth(),
        email: driverEmail,
        driverName: driverName,
        vehicleName: vehiclePlat,
        totalWeight: 0,
        totalVolume: 0,
        tasksCount: 0,
      };
    }

    if (task.flow !== 'Pickup') {
      trips[key].totalWeight += Math.abs(Number(task.weightKg || 0));
      trips[key].totalVolume += Math.abs(Number(task.volumeCbm || 0));
    }

    trips[key].tasksCount += 1;
  });

  Object.values(trips).forEach((trip) => {
    const specs = driverMap[trip.email];

    const maxWeight = specs?.maxWeight && specs.maxWeight > 0 ? specs.maxWeight : 1;
    const maxVolume = specs?.maxVolume && specs.maxVolume > 0 ? specs.maxVolume : 1;

    const weightPct = (trip.totalWeight / maxWeight) * 100;
    const volPct = (trip.totalVolume / maxVolume) * 100;

    const maxPct = Math.max(weightPct, volPct);
    const boundBy = weightPct >= volPct ? 'Weight' : 'Volume';

    trip.maxPct = maxPct;
    trip.weightPct = weightPct;
    trip.volPct = volPct;
    trip.maxWeight = maxWeight;
    trip.maxVolume = maxVolume;
    trip.boundBy = boundBy;
    trip.isOverload = maxPct > 100;

    const monthIdx = trip.monthIndex;

    if (monthlyData[monthIdx]) {
      if (maxPct > 100) {
        monthlyData[monthIdx].overload += 1;
      } else if (maxPct >= 85) {
        monthlyData[monthIdx].full += 1;
      } else if (maxPct >= 60) {
        monthlyData[monthIdx].normal += 1;
      } else if (maxPct >= 40) {
        monthlyData[monthIdx].low += 1;
      } else {
        monthlyData[monthIdx].veryLow += 1;
      }

      const day = parseInt(trip.date.split('-')[2], 10);
      if (!monthlyData[monthIdx].details[day]) {
        monthlyData[monthIdx].details[day] = [];
      }
      monthlyData[monthIdx].details[day].push(trip);
    }
  });

  return monthlyData;
};

export function processServiceLevelData(
  allTasks,
  view = 'monthly',
  selectedMonthKey = null,
  hubId = null,
  localeCode = 'id-ID'
) {
  if (!allTasks || isEmpty(allTasks)) return [];

  const SPECIAL_HUBS = ['6895a281bc530d4a4908f5ef', '68b8038b1aa98343380e3ab2'];
  const isSpecialHub = hubId && SPECIAL_HUBS.includes(hubId);

  const grouped = {};

  allTasks.forEach((task) => {
    // 1. Cek Assignee
    if (!task.assignee || isEmpty(task.assignee)) return;

    // 2. FILTER: Hapus Flow Pickup dari perhitungan Total Task
    if (task.flow && String(task.flow).toUpperCase() === 'PICKUP') {
      return;
    }

    // 3. Filter Hub
    if (hubId) {
      const taskHub =
        task.hubId ||
        (task.hub && (task.hub._id || task.hub.id)) ||
        task.branchId ||
        (task.branch && (task.branch._id || task.branch.id)) ||
        task.originHubId ||
        task.sourceHubId ||
        null;
      if (taskHub && String(taskHub) !== String(hubId)) {
        return;
      }
    }

    // 4. Cek Tanggal
    const dateStr = task.doneTime || task.createdTime;
    const wibTime = parseAndShiftToUTC7(dateStr);
    if (!wibTime) return;

    const year = wibTime.getFullYear();
    const month = String(wibTime.getMonth() + 1).padStart(2, '0');
    const day = String(wibTime.getDate()).padStart(2, '0');

    const monthKey = `${year}-${month}`;
    const dayKey = `${year}-${month}-${day}`;

    let key, label;
    if (view === 'monthly') {
      key = monthKey;
      label = wibTime.toLocaleDateString(localeCode, { month: 'short' });
    } else if (view === 'daily') {
      if (monthKey !== selectedMonthKey) return;
      if (wibTime.getDay() === 0) return;
      key = dayKey;
      label = day;
    } else {
      return;
    }

    if (!grouped[key]) {
      grouped[key] = {
        key,
        label,
        total: 0,
        SUKSES: 0,
        PENDING: 0,
        BATAL: 0,
        PARTIAL: 0,
        PENDING_GR: 0,
      };
    }

    // Hitung Total (Task Pickup sudah dikecualikan di atas)
    grouped[key].total += 1;

    // Cek Status Delivery (Menggunakan statusDelivery)
    if (task.statusDelivery) {
      const rawStatus = String(task.statusDelivery).toUpperCase();
      const status = rawStatus.replace('_', ' ').trim();

      if (status.startsWith('SUKSES')) {
        grouped[key].SUKSES += 1;
      } else if (
        status.startsWith('PENDING GR') ||
        status === 'PENDING GR' ||
        status === 'PENDING_GR'
      ) {
        grouped[key].PENDING_GR += 1;
      } else if (status.startsWith('PENDING')) {
        grouped[key].PENDING += 1;
      } else if (status.startsWith('BATAL')) {
        grouped[key].BATAL += 1;
      } else if (status.startsWith('TERIMA SEBAGIAN') || status.startsWith('PARTIAL')) {
        grouped[key].PARTIAL += 1;
      }
    }
  });

  return Object.values(grouped)
    .sort((a, b) => a.key.localeCompare(b.key))
    .map((item) => ({
      ...item,
      rate: item.total > 0 ? parseFloat(((item.SUKSES / item.total) * 100).toFixed(1)) : 0,
    }));
}

export function processSequenceAccuracyData(
  allTasks,
  view = 'monthly',
  selectedMonthKey = null,
  localeCode = 'id-ID'
) {
  if (!allTasks || isEmpty(allTasks)) return [];
  const driverDateMap = {};
  allTasks.forEach((task) => {
    // 1. FILTER: Hapus Flow Pickup (UPDATE BARU)
    if (task.flow && String(task.flow).toUpperCase() === 'PICKUP') {
      return;
    }

    const email = task.assignee && task.assignee[0] ? task.assignee[0].toLowerCase() : null;
    if (!email) return;
    const dateStr = task.doneTime || task.createdTime;
    const wibTime = parseAndShiftToUTC7(dateStr);
    if (!wibTime) return;
    const year = wibTime.getFullYear();
    const month = String(wibTime.getMonth() + 1).padStart(2, '0');
    const day = String(wibTime.getDate()).padStart(2, '0');
    const dateKey = `${year}-${month}-${day}`;
    const groupingKey = `${email}_${dateKey}`;
    const flow = task.flow || '';
    const isGR = flow.toUpperCase().includes('GR');
    const arrivalSource = isGR
      ? task.page1DoneTime
      : task.klikJikaSudahSampai || task.klikJikaAndaSudahSampai;
    const arrDate = parseAndShiftToUTC7(arrivalSource);
    const arrivalTimestamp = arrDate ? arrDate.getTime() : 9999999999999;
    if (!driverDateMap[groupingKey]) driverDateMap[groupingKey] = [];
    driverDateMap[groupingKey].push({
      roSequence: task.routePlannedOrder,
      arrivalTimestamp,
      monthKey: `${year}-${month}`,
      dayKey: dateKey,
      dayLabel: day,
      monthLabel: wibTime.toLocaleDateString(localeCode, { month: 'short' }),
    });
  });
  const processedResults = [];
  Object.values(driverDateMap).forEach((group) => {
    group.sort((a, b) => a.arrivalTimestamp - b.arrivalTimestamp);
    group.forEach((item, index) => {
      const realSeq = index + 1;
      let status = 'manual';
      if (item.roSequence !== null && item.roSequence !== undefined) {
        status = parseInt(item.roSequence) === realSeq ? 'match' : 'mismatch';
      } else {
        status = 'manual';
      }
      processedResults.push({ ...item, status });
    });
  });
  const groupedChart = {};
  processedResults.forEach((item) => {
    if (view === 'daily') {
      if (selectedMonthKey && item.monthKey !== selectedMonthKey) return;
    }
    const key = view === 'monthly' ? item.monthKey : item.dayKey;
    const label = view === 'monthly' ? item.monthLabel : item.dayLabel;
    if (!groupedChart[key]) {
      groupedChart[key] = { key, label, match: 0, mismatch: 0, manual: 0, total: 0 };
    }
    groupedChart[key].total += 1;
    groupedChart[key][item.status] += 1;
  });
  return Object.values(groupedChart)
    .sort((a, b) => a.key.localeCompare(b.key))
    .map((item) => ({
      name: item.label,
      key: item.key,
      match: item.match,
      mismatch: item.mismatch,
      manual: item.manual,
      total: item.total,
      rate: item.total > 0 ? parseFloat(((item.match / item.total) * 100).toFixed(1)) : 0,
    }));
}

export const processRoutingVsActualData = ({ tasks, results, drivers, searchQuery }) => {
  if (!tasks || !drivers) return [];

  const emailToDriverMap = drivers.reduce((acc, driver) => {
    const normalized = normalizeEmail(driver.email);
    if (normalized) {
      acc[normalized] = { plat: driver.plat || null, name: driver.name };
    }
    return acc;
  }, {});

  const hubTimesMap = new Map();
  if (results) {
    const filteredResults = results.filter((item) => item.dispatchStatus === 'done');
    for (const result of filteredResults) {
      if (result.result && Array.isArray(result.result.routing)) {
        for (const route of result.result.routing) {
          const driverEmail = normalizeEmail(route.assignee);
          const driverInfo = driverEmail ? emailToDriverMap[driverEmail] : null;
          const driverName = driverInfo ? driverInfo.name : driverEmail || 'N/A';
          if (!driverName || !Array.isArray(route.trips) || isEmpty(route.trips)) continue;

          const hubTrips = route.trips.filter((trip) => trip.isHub === true);
          if (hubTrips.length > 0) {
            const firstHub = hubTrips[0];
            const lastHub = hubTrips[hubTrips.length - 1];
            const hubLocation = firstHub.coordinate || null;

            hubTimesMap.set(driverName, {
              hubETD: formatSimpleTime(firstHub.etd) || '-',
              hubETA: formatSimpleTime(lastHub.eta) || '-',
              hubLongLat: hubLocation,
            });
          }
        }
      }
    }
  }

  const driverStats = new Map();
  const allTaskData = [];

  for (const task of tasks) {
    const flow = task.flow;
    const emailString =
      Array.isArray(task.assignee) && task.assignee.length > 0 ? task.assignee[0] : null;
    const driverEmail = normalizeEmail(emailString);
    const driverInfo = driverEmail ? emailToDriverMap[driverEmail] : null;
    const driverName = driverInfo ? driverInfo.name : driverEmail || 'N/A';
    let statusLabel = '';
    if (flow !== 'Pickup') {
      if (task.statusDelivery && task.statusDelivery.length > 0) {
        statusLabel = task.statusDelivery[0].toUpperCase();
      } else if (flow.includes('GR')) {
        if (task.statusGr && task.statusGr.length > 0) {
          statusLabel = task.statusGr[0].toUpperCase();
        }
      }
    } else {
      statusLabel = task.status && task.status.toUpperCase();
    }
    statusLabel = task.status !== 'ONGOING' ? statusLabel : '-';
    if (flow === 'Pickup' && statusLabel === 'DONE') statusLabel = 'SUKSES';
    let { fullCustomerName: customerName } = parseCustomerString(task.customerOrder);
    if (isEmpty(customerName)) customerName = task.customerName;

    if (driverName !== 'N/A') {
      const stats = driverStats.get(driverName) || {
        plat: null,
        driverEmail: driverEmail,
      };
      if (!stats.plat && driverInfo && driverInfo.plat) {
        stats.plat = driverInfo.plat;
      }
      driverStats.set(driverName, stats);
    }

    let actualArrival, actualDeparture;
    if (flow && flow.toUpperCase().includes('GR')) {
      actualArrival = task.page1DoneTime;
      actualDeparture = task.page1DoneTime;
    } else if (flow && flow.toUpperCase().includes('PICKUP')) {
      actualArrival = task.klikJikaAndaSudahSampaiDiGudang;
      actualDeparture = task.page1DoneTime;
    } else {
      actualArrival = task.klikJikaSudahSampai;
      actualDeparture = task.page3DoneTime;
    }

    const roSequence = task.routePlannedOrder || 0;
    const etaVal = formatSimpleTime(task.eta);
    const etdVal = formatSimpleTime(task.etd);
    const openTimeVal = formatSimpleTime(task.openTime) || '-';
    const closeTimeVal = formatSimpleTime(task.closeTime) || '-';
    const actualArrVal = formatTimestampToHHMM(actualArrival) || '-';

    let hoursStatus = null;
    if (actualArrVal !== '-' && openTimeVal !== '-' && closeTimeVal !== '-') {
      const isInside =
        openTimeVal > closeTimeVal
          ? actualArrVal >= openTimeVal || actualArrVal <= closeTimeVal
          : actualArrVal >= openTimeVal && actualArrVal <= closeTimeVal;

      if (isInside) {
        hoursStatus = 'yes';
      } else if (actualArrVal < openTimeVal) {
        hoursStatus = 'early';
      } else {
        hoursStatus = 'no';
      }
    }

    let actualVisitTimeVal = '-';
    if (actualArrival && actualDeparture) {
      const start = new Date(actualArrival).getTime();
      const end = new Date(actualDeparture).getTime();
      if (!isNaN(start) && !isNaN(end) && end >= start) {
        const diffMs = end - start;
        const diffMins = Math.ceil(diffMs / 60000);
        actualVisitTimeVal = diffMins;
      }
    }

    allTaskData.push({
      driver: driverName,
      plat: driverInfo ? driverInfo.plat : null,
      actualArrivalTimestamp: actualArrival ? new Date(actualArrival).getTime() : null,
      roSequence: roSequence,
      statusLabel: statusLabel,
      flow: flow,
      customerName: customerName,
      openTime: openTimeVal,
      closeTime: closeTimeVal,
      eta: etaVal || '-',
      etd: etdVal || '-',
      actualArrival: actualArrVal,
      actualDeparture: formatTimestampToHHMM(actualDeparture) || '-',
      visitTime: task.visitTime || '-',
      actualVisitTime: actualVisitTimeVal,
      realSequence: 0,
      isManualAssign: roSequence === 0,
      longlat: task.longlat,
      isWithinHoursStatus: hoursStatus,
    });
  }

  allTaskData.sort((a, b) => {
    const driverCompare = a.driver.localeCompare(b.driver);
    if (driverCompare !== 0) return driverCompare;
    const timeA = a.actualArrivalTimestamp || Infinity;
    const timeB = b.actualArrivalTimestamp || Infinity;
    return timeA - timeB;
  });

  let currentDriver = null;
  let rankCounter = 1;
  for (const row of allTaskData) {
    if (row.driver !== currentDriver) {
      currentDriver = row.driver;
      rankCounter = 1;
    }
    if (row.actualArrivalTimestamp !== null) {
      row.realSequence = rankCounter;
      rankCounter++;
    } else {
      row.realSequence = null;
    }
  }

  const tasksByNameMap = new Map();
  for (const task of allTaskData) {
    if (!tasksByNameMap.has(task.driver)) {
      tasksByNameMap.set(task.driver, []);
    }
    tasksByNameMap.get(task.driver).push(task);
  }

  const getSortGroup = (platStr) => {
    if (!platStr) return 1;
    const platUpper = platStr.toUpperCase();
    if (platUpper.includes('DM')) return 3;
    if (platUpper.includes('SEWA')) return 2;
    return 1;
  };

  let driverList = Array.from(driverStats.entries()).map(([driverName, stats]) => {
    return {
      plat: stats.plat,
      driver: driverName,
    };
  });

  driverList.sort((a, b) => {
    const groupA = getSortGroup(a.plat);
    const groupB = getSortGroup(b.plat);
    if (groupA !== groupB) {
      return groupA - groupB;
    }
    return (a.driver || '').localeCompare(b.driver || '');
  });

  const finalRows = [];
  // Perbaiki handling saat searchQuery kosong
  const query = (searchQuery || '').toLowerCase();

  for (const driverRow of driverList) {
    const driverName = driverRow.driver;
    const driverPlat = driverRow.plat;
    const driverTasks = tasksByNameMap.get(driverName) || [];
    const hubTimes = hubTimesMap.get(driverName) || {
      hubETD: '-',
      hubETA: '-',
      hubLongLat: null,
    };

    const isDriverMatch =
      driverName.toLowerCase().includes(query) ||
      (driverPlat && driverPlat.toLowerCase().includes(query));

    const matchingTasks = driverTasks.filter((t) => {
      if (isDriverMatch) return true;
      return t.customerName && t.customerName.toLowerCase().includes(query);
    });

    if (isEmpty(matchingTasks) && !isDriverMatch) continue;

    finalRows.push({
      type: 'HUB_START',
      driver: driverName,
      plat: driverPlat,
      time: hubTimes.hubETD,
      longlat: hubTimes.hubLongLat,
      customerName: 'HUB',
    });

    matchingTasks.sort((a, b) => {
      return (a.roSequence || 0) - (b.roSequence || 0);
    });

    matchingTasks.forEach((t) => {
      finalRows.push({
        type: 'TASK',
        ...t,
      });
    });

    finalRows.push({
      type: 'HUB_END',
      driver: driverName,
      plat: driverPlat,
      time: hubTimes.hubETA,
      longlat: hubTimes.hubLongLat,
      customerName: 'HUB',
    });

    finalRows.push({ type: 'SPACER' });
  }

  return finalRows;
};

export const calculateDashboard = (tasksArray, driverMap, isIndonesian) => {
  if (isEmpty(tasksArray)) {
    return {
      totalTasks: 0,
      unassigned: 0,
      manualAssignList: [],
      unassignedList: [],
      done: 0,
      ongoing: 0,
      assignedTasks: 0,
      flowDelivery: 0,
      flowReDelivery: 0,
      flowPendingGR: 0,
      crossDayTasks: [],
      totalDry: 0,
      totalFrozen: 0,
      assignedDry: 0,
      assignedFrozen: 0,
    };
  }

  let manualAssignList = [];
  let crossDayTasks = [];
  let unassignedList = [];
  let done = 0;
  let ongoing = 0;
  let unassigned = 0;
  let flowDelivery = 0;
  let flowReDelivery = 0;
  let flowPendingGR = 0;
  let totalDry = 0;
  let totalFrozen = 0;
  let assignedDry = 0;
  let assignedFrozen = 0;

  for (const task of tasksArray) {
    const customerName = parseCustomerString(task.customerName || task.customerOrder).name || 'N/A';
    const flow = task.flow || 'N/A';
    let displayOrderId = '-';
    if (task.orderId) {
      const orderParts = task.orderId.split(',').filter(Boolean);
      if (orderParts.length > 1) {
        displayOrderId = `${orderParts[0].trim()} (+${orderParts.length - 1})`;
      } else if (orderParts.length === 1) {
        displayOrderId = orderParts[0].trim();
      }
    }

    const typeStorage = (task.typeStorage || '').toUpperCase();
    const isDry = typeStorage === 'DRY';
    const isFrozen = typeStorage === 'FROZEN';

    if (isDry) totalDry++;
    if (isFrozen) totalFrozen++;

    if (task.status === 'DONE') done++;
    else if (task.status === 'ONGOING') ongoing++;
    else if (task.status === 'UNASSIGNED') {
      unassigned++;
      unassignedList.push({
        customer: customerName,
        flow,
        soNumber: task.orderId || '-',
        truncateSoNumber: displayOrderId,
      });
    }

    const isAssigned = task.status !== 'UNASSIGNED';

    if (isAssigned) {
      if (isDry) assignedDry++;
      if (isFrozen) assignedFrozen++;
    }

    const manualCategory = !task.routePlannedOrder || !task.eta || !task.etd;
    if (manualCategory && isAssigned) {
      const rawAssignee = task.assignee && task.assignee.length > 0 ? task.assignee[0] : 'N/A';
      let finalAssignee = driverMap.get(normalizeEmail(rawAssignee)) || rawAssignee;
      if (finalAssignee === 'N/A') finalAssignee = '-';

      manualAssignList.push({
        customer: customerName,
        driver: finalAssignee,
        flow,
        soNumber: task.orderId || '-',
        truncateSoNumber: displayOrderId,
      });
    }

    if (flow === 'Delivery') flowDelivery++;
    else if (flow.includes('Re Delivery')) flowReDelivery++;
    else if (flow.includes('Pending GR')) flowPendingGR++;

    if (task.status === 'DONE' && task.startTime && task.doneTime) {
      const startDateWIB = formatDateWIB(task.startTime, 'DD-MM-YYYY');
      const doneDateWIB = formatDateWIB(task.doneTime, 'DD-MM-YYYY');

      if (startDateWIB && doneDateWIB && startDateWIB !== doneDateWIB) {
        const startDate = new Date(task.startTime);
        const doneDate = new Date(task.doneTime);
        const diffInMs = doneDate.getTime() - startDate.getTime();
        const diffInDays = Math.ceil(diffInMs / (1000 * 60 * 60 * 24));
        const datePlusText = isIndonesian ? 'H+' : 'D+';
        const rawAssignee = task.assignee && task.assignee.length > 0 ? task.assignee[0] : 'N/A';
        const driverName = driverMap.get(normalizeEmail(rawAssignee)) || rawAssignee;
        crossDayTasks.push({
          customer: customerName,
          doneDateDisplay: `${doneDateWIB} (${datePlusText}${diffInDays})`,
          driver: driverName,
          soNumber: task.orderId || '-',
          truncateSoNumber: displayOrderId,
        });
      }
    }
  }

  unassignedList.sort((a, b) => a.flow.localeCompare(b.flow));
  manualAssignList.sort((a, b) => a.driver.localeCompare(b.driver));
  crossDayTasks.sort((a, b) => a.driver.localeCompare(b.driver));

  return {
    totalTasks: tasksArray.length,
    unassigned,
    manualAssignList,
    unassignedList,
    done,
    ongoing,
    assignedTasks: done + ongoing,
    flowDelivery,
    flowReDelivery,
    flowPendingGR,
    crossDayTasks,
    totalDry,
    totalFrozen,
    assignedDry,
    assignedFrozen,
  };
};

export const downloadRoutingVsActual = (data, t, selectedDate, hubLabel) => {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return;
  }

  const sortedData = [...data].sort((a, b) => {
    const driverA = a.driver || '';
    const driverB = b.driver || '';

    if (driverA < driverB) return -1;
    if (driverA > driverB) return 1;

    return (a.routeSequence || 0) - (b.routeSequence || 0);
  });

  const wb = XLSX.utils.book_new();

  const headers = [
    t('common.flow'),
    t('common.license_number'),
    t('common.driver'),
    t('common.customer_name'),
    t('dashboard.tab.routingreal.status'),
    t('common.open_time'),
    t('common.close_time'),
    t('common.eta'),
    t('common.actual_arrival'),
    t('common.etd'),
    t('common.actual_departure'),
    t('common.visit_plan'),
    t('common.visit_actual'),
    t('common.ro_seq'),
    t('common.actual_seq'),
    t('dashboard.tab.routingreal.is_match'),
    t('dashboard.tab.routingreal.is_within_hours'),
  ];

  const sheetData = [headers];
  const manualAssignRows = new Set();

  let lastDriver = null;

  sortedData.forEach((row, index) => {
    if (row.type === 'SPACER') {
      return;
    }

    const currentDriver = row.driver || 'Unknown';
    const isHubStart = row.type === 'HUB_START';
    const isHubEnd = row.type === 'HUB_END';
    const isHub = isHubStart || isHubEnd;

    if (lastDriver !== null && currentDriver !== lastDriver) {
      sheetData.push(Array(17).fill(''));
    }
    lastDriver = currentDriver;

    if (!isHub && row.isManualAssign) {
      manualAssignRows.add(sheetData.length);
    }

    const flow = isHub ? null : row.flow;
    const plat = isHub ? null : row.plat;
    const driver = isHub ? null : row.driver;

    let customer = row.customerName || '-';
    if (isHub) {
      customer = `HUB`;
    }

    const status = isHub ? null : row.statusLabel;
    const open = isHub ? null : row.openTime;
    const close = isHub ? null : row.closeTime;

    const eta = isHubStart ? row.time : row.eta;
    const arrival = isHub ? null : row.actualArrival;
    const etd = isHubEnd ? row.time : row.etd;
    const departure = isHub ? null : row.actualDeparture;

    const visitTime = isHub ? null : row.visitTime;
    const actVisit = isHub ? null : row.actualVisitTime;

    const isRoSeqNull = row.roSequence === null || row.roSequence === 0;
    const isRealSeqNull = row.realSequence === null || row.realSequence === 0;
    const roSeq = isHub ? null : isRoSeqNull ? '-' : row.roSequence;
    const realSeq = isHub ? null : isRealSeqNull ? '-' : row.realSequence;
    const isMatch = roSeq === realSeq;
    const match = isHub
      ? null
      : isRealSeqNull
        ? '-'
        : isMatch
          ? t('common.status.match')
          : t('common.status.mismatch');

    let withinHoursText = isHub ? null : '-';
    if (!isHub && row.isWithinHoursStatus) {
      if (row.isWithinHoursStatus === 'yes') withinHoursText = t('dashboard.tab.routingreal.yes');
      else if (row.isWithinHoursStatus === 'early')
        withinHoursText = t('dashboard.tab.routingreal.early');
      else if (row.isWithinHoursStatus === 'no')
        withinHoursText = t('dashboard.tab.routingreal.no');
    }

    sheetData.push([
      flow,
      plat,
      driver,
      customer,
      status,
      open,
      close,
      eta,
      arrival,
      etd,
      departure,
      visitTime,
      actVisit,
      roSeq,
      realSeq,
      match,
      withinHoursText,
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  const colWidths = headers.map((_, colIdx) => {
    let maxLength = 0;
    sheetData.forEach((row) => {
      const cell = row[colIdx];
      if (cell !== null && cell !== undefined) {
        maxLength = Math.max(maxLength, cell.toString().length);
      }
    });
    return { wch: Math.max(maxLength + 2, 10) };
  });

  ws['!cols'] = colWidths;

  // Override lebar kolom sempit (nilai 3-4 char, header wrap text)
  colWidths[11] = { wch: 10 }; // visit plan
  colWidths[12] = { wch: 10 }; // visit actual
  colWidths[13] = { wch: 10 }; // ro seq
  colWidths[14] = { wch: 10 }; // actual seq

  const leftAlignment = { alignment: { horizontal: 'left', vertical: 'center' } };
  const centerAlignment = {
    alignment: { horizontal: 'center', vertical: 'center' },
  };

  const headerStyle = {
    ...centerAlignment,
    font: { bold: true, color: { rgb: '000000' } },
    fill: { fgColor: { rgb: 'EFEFEF' } },
    border: {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' },
    },
  };

  const hubRedStyle = {
    ...centerAlignment,
    font: { bold: true, color: { rgb: 'FF0000' } },
  };

  const textGreenStyle = { ...centerAlignment, font: { bold: true, color: { rgb: '16A34A' } } };
  const textAmberStyle = { ...centerAlignment, font: { bold: true, color: { rgb: 'F59E0B' } } };
  const textRedStyle = { ...centerAlignment, font: { bold: true, color: { rgb: 'DC2626' } } };

  // Warna background per kolom: header (lebih gelap) & data (lebih terang)
  // Col 5,6=Green | 7,8=Orange | 9,10=Yellow | 11,12=Pink | 13,14=Blue
  const colFillMap = {
    5: { header: 'A7F3D0', data: 'D1FAE5' }, // open_time  - green
    6: { header: 'A7F3D0', data: 'D1FAE5' }, // close_time - green
    7: { header: 'FED7AA', data: 'FFEDD5' }, // eta        - orange
    8: { header: 'FED7AA', data: 'FFEDD5' }, // actual arr - orange
    9: { header: 'FDE68A', data: 'FEF9C3' }, // etd        - yellow
    10: { header: 'FDE68A', data: 'FEF9C3' }, // actual dep - yellow
    11: { header: 'FBCFE8', data: 'FCE7F3' }, // visit plan - pink
    12: { header: 'FBCFE8', data: 'FCE7F3' }, // visit act  - pink
    13: { header: 'BFDBFE', data: 'DBEAFE' }, // ro seq     - blue
    14: { header: 'BFDBFE', data: 'DBEAFE' }, // actual seq - blue
  };

  const range = XLSX.utils.decode_range(ws['!ref']);
  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
      if (!ws[cellRef]) continue;

      if (R === 0) {
        const colFill = colFillMap[C];
        const isNarrowCol = C >= 11 && C <= 14;
        ws[cellRef].s = {
          ...headerStyle,
          ...(isNarrowCol
            ? { alignment: { horizontal: 'center', vertical: 'center', wrapText: true } }
            : {}),
          ...(colFill ? { fill: { fgColor: { rgb: colFill.header } } } : {}),
        };
      } else {
        const firstCellRef = XLSX.utils.encode_cell({ r: R, c: 0 });
        const isSpacerRow =
          (!ws[firstCellRef] || isEmpty(ws[firstCellRef].v)) &&
          !(ws[XLSX.utils.encode_cell({ r: R, c: 3 })]?.v === 'HUB');

        // Spacer row: skip semua styling (tidak ada warna apapun)
        if (isSpacerRow) continue;

        // Cols 0-3: rata kiri | Cols 4-16: rata kanan
        if (C <= 3) {
          ws[cellRef].s = { ...leftAlignment };
        } else if (C >= 4 && C <= 16) {
          const colFill = colFillMap[C];
          ws[cellRef].s = {
            ...centerAlignment,
            ...(colFill ? { fill: { fgColor: { rgb: colFill.data } } } : {}),
          };
        }

        if (manualAssignRows.has(R)) {
          ws[cellRef].s = {
            ...(C <= 3 ? leftAlignment : centerAlignment),
            fill: { fgColor: { rgb: 'FECACA' } },
          };
        }

        const customerCellRef = XLSX.utils.encode_cell({ r: R, c: 3 });
        if (ws[customerCellRef] && ws[customerCellRef].v === 'HUB') {
          ws[cellRef].s = hubRedStyle;
        }

        if (C === 15) {
          if (ws[cellRef].v === t('common.status.mismatch')) ws[cellRef].s = textRedStyle;
          else if (ws[cellRef].v === t('common.status.match')) ws[cellRef].s = textGreenStyle;
        }

        if (C === 16) {
          if (ws[cellRef].v === t('dashboard.tab.routingreal.yes')) ws[cellRef].s = textGreenStyle;
          else if (ws[cellRef].v === t('dashboard.tab.routingreal.early'))
            ws[cellRef].s = textAmberStyle;
          else if (ws[cellRef].v === t('dashboard.tab.routingreal.no'))
            ws[cellRef].s = textRedStyle;
        }
      }
    }
  }

  XLSX.utils.book_append_sheet(wb, ws, 'Routing vs Actual');

  const dateStr = formatDateUniversal(selectedDate || new Date(), 'DD.MM.YYYY');
  const safeHubLabel = hubLabel ? ` - ${hubLabel}` : '';

  XLSX.writeFile(wb, `${t('dashboard.tabs.routing_vs_actual')} - ${dateStr}${safeHubLabel}.xlsx`);
};

export const getStatusBadge = (pct, t) => {
  if (pct > 100)
    return {
      label: t('dashboard.charts.load_capacity.overload'),
      classes: 'text-[#e7000b] border-[#e7000b] dark:text-[#ffa2a2] dark:border-[#ffa2a2]',
      range: '> 100%',
    };
  if (pct >= 85)
    return {
      label: t('dashboard.charts.load_capacity.full'),
      classes: 'text-[#d97706] border-[#d97706] dark:text-[#FC9827] dark:border-[#FC9827]',
      range: '85-100%',
    };
  if (pct >= 60)
    return {
      label: t('dashboard.charts.load_capacity.normal'),
      classes: ' text-[#00a63e] border-[#00a63e] dark:text-[#7bf1a8] dark:border-[#7bf1a8]',
      range: '60-85%',
    };
  if (pct >= 40)
    return {
      label: t('dashboard.charts.load_capacity.low'),
      classes: 'text-[#962EFF] border-[#962EFF] dark:text-[#CF9FFF] dark:border-[#CF9FFF]',
      range: '40-60%',
    };
  return {
    label: t('dashboard.charts.load_capacity.very_low'),
    classes: 'text-[#4c9bf4] border-[#4c9bf4] dark:text-[#86BBF9] dark:border-[#86BBF9]',
    range: '< 40%',
  };
};
