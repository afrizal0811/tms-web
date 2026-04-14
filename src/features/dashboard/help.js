import { formatDateUniversal, isEmpty } from '@/lib/utils';
import * as XLSX from 'xlsx-js-style';

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
    t('dashboard.tab.routingreal.flow'),
    t('common.number_plates'),
    t('common.driver'),
    t('common.customer_name'),
    t('dashboard.tab.routingreal.status'),
    t('dashboard.tab.routingreal.open_time'),
    t('dashboard.tab.routingreal.close_time'),
    t('common.eta'),
    t('common.etd'),
    t('dashboard.tab.routingreal.etd'),
    t('dashboard.tab.routingreal.actual_departure'),
    t('dashboard.tab.routingreal.visit_plan'),
    t('dashboard.tab.routingreal.visit_actual'),
    t('dashboard.tab.routingreal.ro_seq'),
    t('dashboard.tab.routingreal.actual_seq'),
    t('dashboard.tab.routingreal.is_same'),
  ];

  const sheetData = [headers];

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
      sheetData.push(Array(16).fill(''));
    }
    lastDriver = currentDriver;

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
          ? t('dashboard.tab.routingreal.match')
          : t('dashboard.tab.routingreal.mismatch');

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
  // --- STYLING ---
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

  // Style Merah Background (untuk Match X)
  const redStyle = {
    ...centerAlignment,
    font: { bold: true, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: 'FF0000' } },
  };

  // Style Hijau Text (untuk Match OK)
  const greenStyle = {
    ...centerAlignment,
    font: { bold: true, color: { rgb: '000000' } },
    fill: { fgColor: { rgb: '00FF00' } },
  };

  // 1. TAMBAHAN BARU: Style Merah Text (untuk HUB)
  const hubRedStyle = {
    ...centerAlignment,
    font: { bold: true, color: { rgb: 'FF0000' } }, // Text Merah
  };

  const range = XLSX.utils.decode_range(ws['!ref']);
  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
      if (!ws[cellRef]) continue;

      if (R === 0) {
        if (C >= 4 && C <= 15) {
          ws[cellRef].s = {
            ...headerStyle,
          };
        } else {
          ws[cellRef].s = headerStyle;
        }
      } else {
        // Cek baris kosong -> Skip styling
        const firstCellRef = XLSX.utils.encode_cell({ r: R, c: 0 });
        if (C >= 4 && C <= 15) {
          ws[cellRef].s = {
            ...centerAlignment,
          };
        }

        if (
          (!ws[firstCellRef] || isEmpty(ws[firstCellRef].v)) &&
          !(ws[XLSX.utils.encode_cell({ r: R, c: 3 })]?.v === 'HUB')
        ) {
          continue;
        }

        // 2. TAMBAHAN BARU: Cek Kolom Customer (Index 3)
        const customerCellRef = XLSX.utils.encode_cell({ r: R, c: 3 });
        if (ws[customerCellRef] && ws[customerCellRef].v === 'HUB') {
          ws[cellRef].s = hubRedStyle;
        }

        // Cek Kolom Match (Index 15)
        if (C === 15) {
          if (ws[cellRef].v === 'Beda' || ws[cellRef].v === 'Mismatch') ws[cellRef].s = redStyle;
          else if (ws[cellRef].v === 'Sama' || ws[cellRef].v === 'Match')
            ws[cellRef].s = greenStyle;
        }
      }
    }
  }

  XLSX.utils.book_append_sheet(wb, ws, 'Routing vs Actual');

  // Menggunakan tanggal dari Datepicker dan akronim (hubLabel)
  const dateStr = formatDateUniversal(selectedDate || new Date(), 'DD.MM.YYYY');
  const safeHubLabel = hubLabel ? ` - ${hubLabel}` : '';

  XLSX.writeFile(wb, `${t('dashboard.tabs.routing_vs_actual')} - ${dateStr}${safeHubLabel}.xlsx`);
};

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
    sangatRendah: 0,
    rendah: 0,
    optimal: 0,
    penuh: 0,
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
        monthlyData[monthIdx].penuh += 1;
      } else if (maxPct >= 60) {
        monthlyData[monthIdx].optimal += 1;
      } else if (maxPct >= 40) {
        monthlyData[monthIdx].rendah += 1;
      } else {
        monthlyData[monthIdx].sangatRendah += 1;
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

export const getStatusBadge = (pct, t) => {
  if (pct > 100)
    return {
      label: t('dashboard.charts.load_capacity.overload'),
      classes: 'bg-red-50 text-red-600 border-red-200',
      range: '> 100%',
    };
  if (pct >= 85)
    return {
      label: t('dashboard.charts.load_capacity.full'),
      classes: 'bg-orange-50 text-orange-600 border-orange-200',
      range: '85-100%',
    };
  if (pct >= 60)
    return {
      label: t('dashboard.charts.load_capacity.optimal'),
      classes: 'bg-emerald-50 text-emerald-600 border-emerald-200',
      range: '60-85%',
    };
  if (pct >= 40)
    return {
      label: t('dashboard.charts.load_capacity.low'),
      classes: 'bg-blue-50 text-blue-600 border-blue-200',
      range: '40-60%',
    };
  return {
    label: t('dashboard.charts.load_capacity.very_low'),
    classes: 'bg-slate-100 text-slate-600 border-slate-200',
    range: '< 40%',
  };
};
