// File: src/features/dashboard/help.js
import {
  formatDateUniversal,
  isEmpty,
  normalizeEmail,
  parseAndShiftToUTC7,
  parseCustomerString,
} from '@/lib/utils';

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

  const grouped = {};

  allTasks.forEach((task) => {
    if (!task.assignee || isEmpty(task.assignee)) return;
    if (task.flow && String(task.flow).toUpperCase() === 'PICKUP') {
      return;
    }
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
    grouped[key].total += 1;
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

export const calculateDashboard = (tasksArray, driverMap, isIndonesian) => {
  if (isEmpty(tasksArray)) {
    return {
      totalTasks: 0,
      unassigned: 0,
      manualAssignList: [],
      unassignedList: [],
      diffDayList: [],
      done: 0,
      ongoing: 0,
      assignedTasks: 0,
      flowDelivery: 0,
      flowReDelivery: 0,
      totalDry: 0,
      totalFrozen: 0,
      assignedDry: 0,
      assignedFrozen: 0,
      success: 0,
      partial: 0,
      cancel: 0,
      pending: 0,
      pendingGr: 0,
      taskId: null,
    };
  }

  let manualAssignList = [];
  let diffDayList = [];
  let unassignedList = [];
  let successList = [];
  let partialList = [];
  let pendingList = [];
  let cancelList = [];
  let pendingGrList = [];
  let done = 0;
  let ongoing = 0;
  let unassigned = 0;
  let flowDelivery = 0;
  let flowReDelivery = 0;
  let totalDry = 0;
  let totalFrozen = 0;
  let assignedDry = 0;
  let assignedFrozen = 0;
  let success = 0;
  let partial = 0;
  let cancel = 0;
  let pending = 0;
  let pendingGr = 0;

  for (const task of tasksArray) {
    const {
      name: customerName,
      invoiceNumber,
      truncateInvoice,
      isTruncated,
    } = parseCustomerString(task.customerOrder) || 'N/A';
    const rawAssignee = task.assignee && task.assignee.length > 0 ? task.assignee[0] : 'N/A';
    let finalAssignee = driverMap.get(normalizeEmail(rawAssignee)) || rawAssignee;
    if (finalAssignee === 'N/A') finalAssignee = '-';
    const taskId = task._id || '-';
    const flow = task.flow || 'N/A';
    const typeStorage = (task.typeStorage || '').toUpperCase();
    const isDry = typeStorage === 'DRY';
    const isFrozen = typeStorage === 'FROZEN';

    if (isDry) totalDry++;
    if (isFrozen) totalFrozen++;
    const baseData = {
      customer: customerName,
      flow,
      soNumber: invoiceNumber || '-',
      truncateSoNumber: truncateInvoice,
      isTruncated,
      driver: finalAssignee,
      taskId,
    };
    if (task.status === 'DONE') {
      done++;
      const statusDelivery = task.statusDelivery[0].toLowerCase();
      if (statusDelivery === 'sukses') {
        successList.push(baseData);
        success++;
      } else if (statusDelivery === 'terima sebagian') {
        partialList.push(baseData);
        partial++;
      } else if (statusDelivery === 'batal') {
        cancelList.push(baseData);
        cancel++;
      } else if (statusDelivery === 'pending') {
        pendingList.push(baseData);
        pending++;
      } else if (statusDelivery === 'pending gr') {
        pendingGrList.push(baseData);
        pendingGr++;
      }
    } else if (task.status === 'ONGOING') ongoing++;
    else if (task.status === 'UNASSIGNED') {
      unassigned++;
      unassignedList.push(baseData);
    }

    const isAssigned = task.status !== 'UNASSIGNED';

    if (isAssigned) {
      if (isDry) assignedDry++;
      if (isFrozen) assignedFrozen++;
    }

    const manualCategory = !task.routePlannedOrder || !task.eta || !task.etd;
    if (manualCategory && isAssigned) {
      manualAssignList.push(baseData);
    }

    if (flow === 'Delivery') flowDelivery++;
    else if (flow.includes('Re Delivery')) flowReDelivery++;

    if (task.status === 'DONE' && task.startTime && task.doneTime) {
      const startDateWIB = formatDateUniversal(task.startTime, 'DD-MM-YYYY');
      const doneDateWIB = formatDateUniversal(task.doneTime, 'DD-MM-YYYY');

      if (startDateWIB && doneDateWIB && startDateWIB !== doneDateWIB) {
        const startDate = new Date(task.startTime);
        const doneDate = new Date(task.doneTime);
        const diffInMs = doneDate.getTime() - startDate.getTime();
        const diffInDays = Math.ceil(diffInMs / (1000 * 60 * 60 * 24));
        const datePlusText = isIndonesian ? 'H+' : 'D+';
        diffDayList.push({
          ...baseData,
          doneDateDisplay: `${doneDateWIB} (${datePlusText}${diffInDays})`,
        });
      }
    }
  }

  unassignedList.sort((a, b) => a.flow.localeCompare(b.flow));
  manualAssignList.sort((a, b) => a.driver.localeCompare(b.driver));
  diffDayList.sort((a, b) => a.driver.localeCompare(b.driver));
  successList.sort((a, b) => a.driver.localeCompare(b.driver));
  partialList.sort((a, b) => a.driver.localeCompare(b.driver));
  cancelList.sort((a, b) => a.driver.localeCompare(b.driver));
  pendingList.sort((a, b) => a.driver.localeCompare(b.driver));
  pendingGrList.sort((a, b) => a.driver.localeCompare(b.driver));

  return {
    totalTasks: tasksArray.length,
    unassigned,
    manualAssignList,
    unassignedList,
    diffDayList,
    successList,
    partialList,
    cancelList,
    pendingList,
    pendingGrList,
    done,
    ongoing,
    assignedTasks: done + ongoing,
    flowDelivery,
    flowReDelivery,
    totalDry,
    totalFrozen,
    assignedDry,
    assignedFrozen,
    success,
    partial,
    cancel,
    pending,
    pendingGr,
  };
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
