// File: lib/reportGenerators/rangkumanSheets/taskSummarySheet.js
import * as XLSX from 'xlsx-js-style';
import { BASE_STYLES, BORDERS, FILL_STYLES, FONT_STYLES, HEADER_STYLES } from './reportStyles';

// --- HELPERS (Sama dengan UI) ---
function getRoutingDateKey(deliveryDateObj) {
  const d = new Date(deliveryDateObj);
  const day = d.getDay();
  let offset = 1;
  if (day === 1) offset = 2; // Senin -> Sabtu
  d.setDate(d.getDate() - offset);

  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const da = d.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${da}`;
}

function calculatePct(num, den) {
  const n = num || 0;
  const d = den || 0;
  if (d === 0) return 0; // Return number for Excel
  return n / d;
}

export function generateTaskSummarySheet(wb, metrics, startDateStr, endDateStr, masterTruckData) {
  const headers = [
    'Date',
    'Type',
    'Drop Point (DP)',
    'Drop Task (DT)',
    '% Drop Task (%DT)',
    'Manual Assign (MA)',
    '% Manual Assign (%MA)',
    'Redelivery Task (RT)',
    '% Redelivery Task (%RT)',
    'Cancelled Order (CO)',
    '% Cancel Order (%CO)',
    'Partial Received (PR)',
    '% Partial Received (%PR)',
    'Master Truck (MT)',
    'TMS Vehicle (TV)',
    'Vehicle Adjusted (VA)',
    'Total Vehicled Used (TVU)',
    '% Total Vehicled Used (%TVU)',
  ];

  const excelData = [headers];
  const merges = [];
  const sundayRows = new Set(); // Simpan index baris minggu

  // --- GENERATE DATA ---
  const current = new Date(startDateStr);
  const end = new Date(endDateStr);
  let currentRow = 1; // Start after header

  // Mapping Master Truck (Default 0 jika undefined)
  const mtDry = masterTruckData?.Dry?.Total || 0;
  const mtFrozen = masterTruckData?.Frozen?.Total || 0;

  while (current <= end) {
    const day = current.getDate().toString().padStart(2, '0');
    const month = (current.getMonth() + 1).toString().padStart(2, '0');
    const year = current.getFullYear();
    const displayDate = `${day}-${month}-${year}`;
    const isSunday = current.getDay() === 0;

    // 1. MINGGU
    if (isSunday) {
      excelData.push([displayDate, 'Libur (Minggu)', ...Array(16).fill('')]);
      excelData.push(['', '', ...Array(16).fill('')]); // Dummy row for merge

      // Merge Date Column
      merges.push({ s: { r: currentRow, c: 0 }, e: { r: currentRow + 1, c: 0 } });
      // Merge Libur Text
      merges.push({ s: { r: currentRow, c: 1 }, e: { r: currentRow + 1, c: 17 } });

      sundayRows.add(currentRow);
      sundayRows.add(currentRow + 1);
      currentRow += 2;
    }
    // 2. HARI KERJA
    else {
      const routingKey = getRoutingDateKey(current);
      const data = metrics ? metrics[routingKey] : null;
      const d = data?.dry || {};
      const f = data?.frozen || {};

      // ROW DRY
      excelData.push([
        displayDate,
        'Dry',
        d.dp || 0,
        d.dt_total || 0,
        calculatePct(d.dt_total, d.dp),
        d.ma_total || 0,
        calculatePct(d.ma_total, d.dp),
        d.rt || 0,
        calculatePct(d.rt, d.dp),
        d.co || 0,
        calculatePct(d.co, d.dp),
        d.pr || 0,
        calculatePct(d.pr, d.dp),
        mtDry,
        d.tv || 0,
        d.va || 0,
        d.tvu || 0,
        calculatePct(d.tvu, mtDry),
      ]);

      // ROW FROZEN
      excelData.push([
        '',
        'Frozen',
        f.dp || 0,
        f.dt_total || 0,
        calculatePct(f.dt_total, f.dp),
        f.ma_total || 0,
        calculatePct(f.ma_total, f.dp),
        f.rt || 0,
        calculatePct(f.rt, f.dp),
        f.co || 0,
        calculatePct(f.co, f.dp),
        f.pr || 0,
        calculatePct(f.pr, f.dp),
        mtFrozen,
        f.tv || 0,
        f.va || 0,
        f.tvu || 0,
        calculatePct(f.tvu, mtFrozen),
      ]);

      // Merge Date Column
      merges.push({ s: { r: currentRow, c: 0 }, e: { r: currentRow + 1, c: 0 } });
      currentRow += 2;
    }

    current.setDate(current.getDate() + 1);
  }

  const ws = XLSX.utils.aoa_to_sheet(excelData);
  ws['!merges'] = merges;

  // --- STYLING ---
  const range = XLSX.utils.decode_range(ws['!ref']);

  // Define styles map by column index
  const headerFills = {
    0: FILL_STYLES.taskYellow, // Date
    1: FILL_STYLES.taskYellow, // Type
    2: FILL_STYLES.taskPink, // DP
    3: FILL_STYLES.taskGreen, // DT
    4: FILL_STYLES.taskGreen, // %DT
    5: FILL_STYLES.taskRed, // MA
    6: FILL_STYLES.taskRed, // %MA
    7: FILL_STYLES.taskCyan, // RT
    8: FILL_STYLES.taskCyan, // %RT
    9: FILL_STYLES.taskBlue, // CO
    10: FILL_STYLES.taskBlue, // %CO
    11: FILL_STYLES.taskGray, // PR
    12: FILL_STYLES.taskGray, // %PR
    13: FILL_STYLES.taskYellow, // MT
    14: FILL_STYLES.taskYellow, // TV
    15: FILL_STYLES.taskYellow, // VA
    16: FILL_STYLES.taskViolet, // TVU
    17: FILL_STYLES.taskViolet, // %TVU
  };

  // Percentage Columns Indices (0-based) -> Apply fill to data cells
  const pctCols = [4, 6, 8, 10, 12, 17];

  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
      if (!ws[cellRef]) ws[cellRef] = { t: 's', v: '' }; // Ensure empty cells exist for styling
      const cell = ws[cellRef];

      // 1. HEADER (Row 0)
      if (R === 0) {
        cell.s = {
          ...HEADER_STYLES.main,
          fill: headerFills[C] || HEADER_STYLES.main.fill,
          border: BORDERS.thin,
        };
      }
      // 2. DATA ROWS
      else {
        // Base Style
        cell.s = { ...BASE_STYLES.center };

        // Minggu Style
        if (sundayRows.has(R)) {
          cell.s.fill = FILL_STYLES.red;
          cell.s.font = { ...FONT_STYLES.bold, color: { rgb: '990000' } }; // Red text
          if (C === 1) {
            // Kolom merged "Libur"
            cell.s.alignment = { horizontal: 'center', vertical: 'center' };
          }
        }
        // Hari Biasa Style
        else {
          // Date & Type alignment
          if (C === 0)
            cell.s = {
              ...BASE_STYLES.center,
              alignment: { vertical: 'center', horizontal: 'center' },
            };
          if (C === 1) cell.s.font = FONT_STYLES.bold;

          // Percentage Formatting
          if (pctCols.includes(C)) {
            cell.t = 'n';
            cell.s.numFmt = '0.00%';
            // Apply Column Background Color (as per request point 2)
            cell.s.fill = headerFills[C];
          }
        }
      }
    }
  }

  // Column Widths
  ws['!cols'] = [
    { wch: 12 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 12 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Task Summary');
}
