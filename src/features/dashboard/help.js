import * as XLSX from 'xlsx-js-style';

export const downloadRoutingVsActual = (data) => {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return;
  }

  // 1. Sort Data: Driver A-Z, lalu Sequence 0-9
  const sortedData = [...data].sort((a, b) => {
    const driverA = a.driver || '';
    const driverB = b.driver || '';

    // Sort by Driver Name
    if (driverA < driverB) return -1;
    if (driverA > driverB) return 1;

    // Jika driver sama, Sort by Route Sequence
    return (a.routeSequence || 0) - (b.routeSequence || 0);
  });

  const wb = XLSX.utils.book_new();

  const headers = [
    'Flow',
    'Plat',
    'Driver',
    'Customer / Outlet Name',
    'Status Delivery',
    'Open Time',
    'Close Time',
    'ETA',
    'Actual Arrival',
    'ETD',
    'Actual Departure',
    'Visit Time',
    'Actual Visit',
    'Routing Sequence',
    'Actual Sequence',
    'Is Match?',
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

    // JIKA DRIVER BERUBAH (dan bukan baris pertama) -> Tambah Baris Kosong
    if (lastDriver !== null && currentDriver !== lastDriver) {
      sheetData.push(Array(16).fill(''));
    }
    lastDriver = currentDriver;

    // --- MAPPING DATA ---
    const flow = isHub ? null : row.flow;
    const plat = isHub ? null : row.plat;
    const driver = isHub ? null : row.driver;

    // Logika Customer: HUB
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

    const roSeq = isHub ? null : row.roSequence === 0 ? '-' : row.roSequence;
    const realSeq = isHub ? null : row.realSequence === 0 ? '-' : row.realSequence;

    const isMatch = roSeq === realSeq;

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
      isHub ? null : isMatch ? 'SAMA' : 'BEDA',
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
          (!ws[firstCellRef] || ws[firstCellRef].v === '') &&
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
          if (ws[cellRef].v === 'BEDA') ws[cellRef].s = redStyle;
          else if (ws[cellRef].v === 'SAMA') ws[cellRef].s = greenStyle;
        }
      }
    }
  }

  XLSX.utils.book_append_sheet(wb, ws, 'Routing vs Actual');
  const dateStr = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, `Routing_vs_Actual_${dateStr}.xlsx`);
};

export const processLoadCapacityData = (tasks, driverData, year) => {
  const months = [
    'Januari',
    'Februari',
    'Maret',
    'April',
    'Mei',
    'Juni',
    'Juli',
    'Agustus',
    'September',
    'Oktober',
    'November',
    'Desember',
  ];

  // 1. Mapping Driver Data
  const driverMap = {};
  if (Array.isArray(driverData)) {
    driverData.forEach((d) => {
      if (d.email) {
        driverMap[d.email] = {
          maxWeight: Number(d.maxWeight) || 0,
          maxVolume: Number(d.maxVolume) || 0,
          name: d.name,
          plat: d.plat,
        };
      }
    });
  }

  // UPDATE: Inisialisasi 5 Kategori
  const monthlyData = months.map((m) => ({
    name: m,
    sangatRendah: 0, // < 40%
    rendah: 0, // 40-60%
    optimal: 0, // 60-85%
    penuh: 0, // 85-100%
    overload: 0, // > 100%
    details: {},
  }));

  const taskList = Array.isArray(tasks) ? tasks : tasks?.data || [];

  if (!taskList || taskList.length === 0) return monthlyData;

  // 2. Grouping Task per Driver per Hari
  const trips = {};

  taskList.forEach((task) => {
    if (!task || !task.startTime) return;

    const rawDate = new Date(task.startTime);
    if (isNaN(rawDate)) return;

    // Logic Shift +1 Hari
    const shiftedDate = new Date(rawDate);
    shiftedDate.setDate(shiftedDate.getDate() + 1);

    if (shiftedDate.getFullYear() !== year) return;

    const dateStr = shiftedDate.toISOString().split('T')[0];

    let driverEmail = task.assignedTo?.email;
    if (!driverEmail && Array.isArray(task.assignee) && task.assignee.length > 0) {
      driverEmail = task.assignee[0];
    }

    if (!driverEmail) return;

    const key = `${dateStr}_${driverEmail}`;

    if (!trips[key]) {
      const mapData = driverMap[driverEmail];
      const driverName = mapData?.name || task.assignedTo?.name || driverEmail;
      const vehiclePlat = mapData?.plat || task.assignedVehicle?.name || 'Unknown';

      trips[key] = {
        date: dateStr,
        monthIndex: shiftedDate.getMonth(),
        email: driverEmail,
        driverName: driverName,
        vehicleName: vehiclePlat,
        totalWeight: 0,
        totalVolume: 0,
        tasksCount: 0,
      };
    }

    // Akumulasi dengan Number()
    trips[key].totalWeight += Number(task.weightKg || 0);
    trips[key].totalVolume += Number(task.volumeCbm || 0);
    trips[key].tasksCount += 1;
  });

  // 3. Kalkulasi Persentase & Kategorisasi Baru
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

    // UPDATE: Logika Kategori Baru
    if (maxPct > 100) {
      monthlyData[monthIdx].overload += 1;
    } else if (maxPct >= 85) {
      // 85 - 100
      monthlyData[monthIdx].penuh += 1;
    } else if (maxPct >= 60) {
      // 60 - 85
      monthlyData[monthIdx].optimal += 1;
    } else if (maxPct >= 40) {
      // 40 - 60
      monthlyData[monthIdx].rendah += 1;
    } else {
      // < 40
      monthlyData[monthIdx].sangatRendah += 1;
    }

    const day = parseInt(trip.date.split('-')[2], 10);
    if (!monthlyData[monthIdx].details[day]) {
      monthlyData[monthIdx].details[day] = [];
    }
    monthlyData[monthIdx].details[day].push(trip);
  });

  return monthlyData;
};