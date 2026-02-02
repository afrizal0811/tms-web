// File: lib/dashboardHelper.js

import { isEmpty } from './utils';

function parseDateSafe(dateStr) {
  if (!dateStr) return null;
  let iso = dateStr.replace(' ', 'T');
  if (!iso.endsWith('Z') && !iso.includes('+')) iso += 'Z';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
}

export function processServiceLevelData(
  allTasks,
  view = 'monthly',
  selectedMonthKey = null,
  hubId = null
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
    const parsed = parseDateSafe(dateStr);
    if (!parsed) return;
    const d = parsed;
    const utc = d.getTime() + d.getTimezoneOffset() * 60000;
    const wibTime = new Date(utc + 3600000 * 7);

    const year = wibTime.getFullYear();
    const month = String(wibTime.getMonth() + 1).padStart(2, '0');
    const day = String(wibTime.getDate()).padStart(2, '0');

    const monthKey = `${year}-${month}`;
    const dayKey = `${year}-${month}-${day}`;

    let key, label;
    if (view === 'monthly') {
      key = monthKey;
      label = wibTime.toLocaleDateString('id-ID', { month: 'short' });
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

export function processSequenceAccuracyData(allTasks, view = 'monthly', selectedMonthKey = null) {
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
    if (!dateStr) return;
    const d = parseDateSafe(dateStr);
    if (!d) return;
    const utc = d.getTime() + d.getTimezoneOffset() * 60000;
    const wibTime = new Date(utc + 3600000 * 7);
    if (wibTime.getDay() === 0) return;
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
    const arrDate = parseDateSafe(arrivalSource);
    const arrivalTimestamp = arrDate ? arrDate.getTime() : 9999999999999;
    if (!driverDateMap[groupingKey]) driverDateMap[groupingKey] = [];
    driverDateMap[groupingKey].push({
      roSequence: task.routePlannedOrder,
      arrivalTimestamp,
      monthKey: `${year}-${month}`,
      dayKey: dateKey,
      dayLabel: day,
      monthLabel: wibTime.toLocaleDateString('id-ID', { month: 'short' }),
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

export function processExceptionData(
  allTasks,
  view = 'monthly',
  selectedMonthKey = null,
  hubId = null
) {
  if (!allTasks || isEmpty(allTasks)) return [];
  const SPECIAL_HUBS = ['6895a281bc530d4a4908f5ef', '68b8038b1aa98343380e3ab2'];
  const isSpecialHub = hubId && SPECIAL_HUBS.includes(hubId);
  const grouped = {};
  allTasks.forEach((task) => {
    // 1. FILTER: Hapus Flow Pickup (UPDATE BARU - Konsistensi)
    if (task.flow && String(task.flow).toUpperCase() === 'PICKUP') {
      return;
    }

    const dateStr = task.doneTime || task.createdTime;
    if (!dateStr) return;
    const d = new Date(dateStr);
    const utc = d.getTime() + d.getTimezoneOffset() * 60000;
    const wibTime = new Date(utc + 3600000 * 7);
    const year = wibTime.getFullYear();
    const month = String(wibTime.getMonth() + 1).padStart(2, '0');
    const day = String(wibTime.getDate()).padStart(2, '0');
    const monthKey = `${year}-${month}`;
    const dayKey = `${year}-${month}-${day}`;
    let key, label;
    if (view === 'monthly') {
      key = monthKey;
      label = wibTime.toLocaleDateString('id-ID', { month: 'short' });
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
        totalTasks: 0,
        totalException: 0,
        pending: 0,
        batal: 0,
        partial: 0,
        pending_gr: 0,
      };
    }
    grouped[key].totalTasks += 1;
    // Menggunakan statusDelivery juga di sini sesuai perubahan global
    if (task.statusDelivery) {
      const status = String(task.statusDelivery).toUpperCase();
      if (status === 'PENDING') {
        grouped[key].pending += 1;
        grouped[key].totalException += 1;
      } else if (status === 'BATAL') {
        grouped[key].batal += 1;
        grouped[key].totalException += 1;
      } else if (status === 'TERIMA SEBAGIAN') {
        grouped[key].partial += 1;
        grouped[key].totalException += 1;
      } else if (status === 'PENDING GR') {
        if (isSpecialHub) {
          grouped[key].pending_gr += 1;
          grouped[key].totalException += 1;
        }
      }
    }
  });
  return Object.values(grouped)
    .sort((a, b) => a.key.localeCompare(b.key))
    .map((item) => ({
      ...item,
      rate:
        item.totalTasks > 0
          ? parseFloat(((item.totalException / item.totalTasks) * 100).toFixed(1))
          : 0,
    }));
}
