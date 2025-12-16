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
