// File: lib/dashboardHelper.js

function parseDateSafe(dateStr) {
  if (!dateStr) return null;
  let iso = dateStr.replace(' ', 'T');
  if (!iso.endsWith('Z') && !iso.includes('+')) iso += 'Z';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
}

function isTaskSuccess(task) {
  if (!task.label || task.label.length === 0) return false;
  const status = task.label[0].toUpperCase();
  return status === 'SUKSES';
}

// --- UPDATE 1: SERVICE LEVEL (FILTER DRIVER) ---
export function processServiceLevelData(allTasks, view = 'monthly', selectedMonthKey = null) {
  if (!allTasks || allTasks.length === 0) return [];
  const grouped = {};

  allTasks.forEach((task) => {
    // Filter: Hanya task yang punya driver (assignee tidak kosong)
    if (!task.assignee || task.assignee.length === 0) return;

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

    if (view === 'monthly') {
      if (!grouped[monthKey]) {
        const label = wibTime.toLocaleDateString('id-ID', { month: 'short' });
        grouped[monthKey] = { key: monthKey, label, total: 0, success: 0 };
      }
      grouped[monthKey].total += 1;
      if (isTaskSuccess(task)) grouped[monthKey].success += 1;
    } else if (view === 'daily' && selectedMonthKey) {
      if (monthKey !== selectedMonthKey) return;
      if (wibTime.getDay() === 0) return;
      if (!grouped[dayKey]) {
        const label = day;
        grouped[dayKey] = { key: dayKey, label, total: 0, success: 0 };
      }
      grouped[dayKey].total += 1;
      if (isTaskSuccess(task)) grouped[dayKey].success += 1;
    }
  });
  return Object.values(grouped)
    .sort((a, b) => a.key.localeCompare(b.key))
    .map((item) => ({
      name: item.label,
      key: item.key,
      total: item.total,
      success: item.success,
      rate: item.total > 0 ? parseFloat(((item.success / item.total) * 100).toFixed(1)) : 0,
    }));
}

// --- UPDATE 2: SEQUENCE ACCURACY (STACKED DATA) ---
export function processSequenceAccuracyData(allTasks, view = 'monthly', selectedMonthKey = null) {
  if (!allTasks || allTasks.length === 0) return [];

  // 1. Grouping Real Sequence (Per Driver Per Hari)
  const driverDateMap = {};

  allTasks.forEach((task) => {
    // Filter: Wajib punya driver (karena sequence butuh driver)
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

  // 2. Hitung Status Per Task (Match/Mismatch/Manual)
  const processedResults = [];

  Object.values(driverDateMap).forEach((group) => {
    // Sort by Actual Arrival
    group.sort((a, b) => a.arrivalTimestamp - b.arrivalTimestamp);

    group.forEach((item, index) => {
      const realSeq = index + 1;
      let status = 'manual';

      if (item.roSequence !== null && item.roSequence !== undefined) {
        // Jika ada RO, cek match
        status = parseInt(item.roSequence) === realSeq ? 'match' : 'mismatch';
      } else {
        // Jika tidak ada RO, Manual
        status = 'manual';
      }

      processedResults.push({
        ...item,
        status,
      });
    });
  });

  // 3. Aggregasi Data Stacked
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
    groupedChart[key][item.status] += 1; // Increment match/mismatch/manual
  });

  // 4. Format Output
  return Object.values(groupedChart)
    .sort((a, b) => a.key.localeCompare(b.key))
    .map((item) => ({
      name: item.label,
      key: item.key,
      match: item.match,
      mismatch: item.mismatch,
      manual: item.manual,
      total: item.total,
      // Rate Sesuai = (Match + Manual) / Total ??
      // Atau murni Match / Total?
      // Sesuai request: "manual assign dianggap sesuai".
      rate:
        item.total > 0
          ? parseFloat((((item.match + item.manual) / item.total) * 100).toFixed(1))
          : 0,
    }));
}
