// File: src/lib/reportGenerators/rangkumanSheets/taskSummarySheet.js
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

export function generateTaskSummarySheet(
  wb,
  metrics,
  startDateStr,
  endDateStr,
  masterTruckData,
  translate
) {
  const headers = [
    translate('common.date'),
    translate('summary.tabs.task_summary.type'),
    'DP',
    'DT',
    '%DT',
    'MA',
    '%MA',
    'RT',
    '%RT',
    'CO',
    '%CO',
    'PR',
    '%PR',
    'MT',
    'TV',
    'VA',
    'TVU',
    '%TVU',
  ];

  const excelData = [headers];
  const merges = [];
  const sundayRows = new Set(); // Simpan index baris minggu
  const zeroDpRows = new Set(); // --- Simpan index baris DP = 0 ---

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
      excelData.push([
        displayDate,
        translate('summary.tabs.task_summary.holiday'),
        ...Array(16).fill(''),
      ]);
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

      // --- LOGIKA MENYIMPAN BARIS JIKA TOTAL DP = 0 ---
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const currentMidnight = new Date(current);
      currentMidnight.setHours(0, 0, 0, 0);
      const isPastOrToday = currentMidnight <= today;

      // PERBAIKAN: Gunakan (d.dp || 0) agar undefined diubah jadi 0
      if ((d.dp || 0) === 0 && (f.dp || 0) === 0 && isPastOrToday) {
        zeroDpRows.add(currentRow);
        zeroDpRows.add(currentRow + 1); // Tambahkan baris Frozen agar merge di Excel terwarnai penuh
      }

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

  excelData.push([]);

  // --- BAGIAN LEGENDA ---
  excelData.push([translate('summary.tabs.task_summary.explanation')]);
  const legendTitleRow = excelData.length - 1;

  merges.push({ s: { r: legendTitleRow, c: 0 }, e: { r: legendTitleRow, c: 2 } });

  const legendMap = [
    { label: 'DP', key: 'dp' },
    { label: 'DT', key: 'dt' },
    { label: 'MA', key: 'ma' },
    { label: 'RT', key: 'rt' },
    { label: 'CO', key: 'co' },
    { label: 'PR', key: 'pr' },
    { label: 'MT', key: 'mt' },
    { label: 'TV', key: 'tv' },
    { label: 'VA', key: 'va' },
    { label: 'TVU', key: 'tvu' },
  ];

  const legendStartRow = excelData.length;

  legendMap.forEach((item, idx) => {
    // Label Kolom A (misal: "DP")
    const label = `${item.label}`;
    // Deskripsi Kolom B
    const desc = translate(`summary.tabs.task_summary.${item.key}`);

    excelData.push([label, desc]);

    // Merge Deskripsi (Kolom B sampai R)
    const r = legendStartRow + idx;
    merges.push({ s: { r: r, c: 1 }, e: { r: r, c: 17 } });
  });

  const ws = XLSX.utils.aoa_to_sheet(excelData);
  ws['!merges'] = merges;

  // --- STYLING ---
  const range = XLSX.utils.decode_range(ws['!ref']);
  const headerFills = {
    0: FILL_STYLES.taskYellow,
    1: FILL_STYLES.taskYellow,
    2: FILL_STYLES.taskPink,
    3: FILL_STYLES.taskGreen,
    4: FILL_STYLES.taskGreen,
    5: FILL_STYLES.taskRed,
    6: FILL_STYLES.taskRed,
    7: FILL_STYLES.taskCyan,
    8: FILL_STYLES.taskCyan,
    9: FILL_STYLES.taskBlue,
    10: FILL_STYLES.taskBlue,
    11: FILL_STYLES.taskGray,
    12: FILL_STYLES.taskGray,
    13: FILL_STYLES.taskYellow,
    14: FILL_STYLES.taskYellow,
    15: FILL_STYLES.taskYellow,
    16: FILL_STYLES.taskViolet,
    17: FILL_STYLES.taskViolet,
  };
  const pctCols = [4, 6, 8, 10, 12, 17];

  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
      if (!ws[cellRef]) ws[cellRef] = { t: 's', v: '' };
      const cell = ws[cellRef];

      // --- STYLE LEGENDA ---
      if (R >= legendTitleRow) {
        if (R === legendTitleRow && C === 0) {
          // Style Judul Legenda
          cell.s = { font: { bold: true, underline: true }, alignment: { horizontal: 'left' } };
        } else if (R >= legendStartRow) {
          if (C === 0) {
            // KOLOM A: LABEL (DP, DT, dll) dengan WARNA BACKGROUND
            const legendIndex = R - legendStartRow;
            const legendKey = legendMap[legendIndex]?.key;

            // Tentukan warna berdasarkan Key (Mapping Manual agar sesuai Header)
            let legendFill = null;
            switch (legendKey) {
              case 'dp':
                legendFill = FILL_STYLES.taskPink;
                break;
              case 'dt':
                legendFill = FILL_STYLES.taskGreen;
                break;
              case 'ma':
                legendFill = FILL_STYLES.taskRed;
                break;
              case 'rt':
                legendFill = FILL_STYLES.taskCyan;
                break;
              case 'co':
                legendFill = FILL_STYLES.taskBlue;
                break;
              case 'pr':
                legendFill = FILL_STYLES.taskGray;
                break;
              case 'mt':
              case 'tv':
              case 'va':
                legendFill = FILL_STYLES.taskYellow;
                break;
              case 'tvu':
                legendFill = FILL_STYLES.taskViolet;
                break;
              default:
                legendFill = null;
            }

            cell.s = {
              font: { bold: true },
              alignment: { horizontal: 'center', vertical: 'top' },
              fill: legendFill,
              border: BORDERS.thin, // Tambah border agar terlihat rapi seperti tombol/header
            };
          } else if (C === 1) {
            // KOLOM B: DESKRIPSI
            cell.s = { alignment: { horizontal: 'left', wrapText: true, vertical: 'top' } };
          }
        }
        continue;
      }
      // ---------------------

      // STYLE HEADER & DATA
      if (R === 0) {
        cell.s = {
          ...HEADER_STYLES.main,
          fill: headerFills[C] || HEADER_STYLES.main.fill,
          border: BORDERS.thin,
        };
      } else {
        cell.s = { ...BASE_STYLES.center };
        if (sundayRows.has(R)) {
          cell.s.fill = FILL_STYLES.red;
          cell.s.font = { ...FONT_STYLES.bold, color: { rgb: '990000' } };
          if (C === 1) cell.s.alignment = { horizontal: 'center', vertical: 'center' };
        } else {
          if (C === 0) {
            cell.s = {
              ...BASE_STYLES.center,
              alignment: { vertical: 'center', horizontal: 'center' },
            };
            // --- TERAPKAN WARNA MERAH KHUSUS UNTUK CELL TANGGAL JIKA DP = 0 ---
            if (zeroDpRows.has(R)) {
              cell.s.fill = { patternType: 'solid', fgColor: { rgb: 'FFC7CE' } };
              cell.s.font = { ...FONT_STYLES.bold, color: { rgb: '9C0006' } };
            }
          }
          if (C === 1) cell.s.font = FONT_STYLES.bold;
          if (pctCols.includes(C)) {
            cell.t = 'n';
            cell.s.numFmt = '0.00%';
            cell.s.fill = headerFills[C];
          }
        }
      }
    }
  }

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

  XLSX.utils.book_append_sheet(wb, ws, translate('summary.tabs.task_summary.title'));
}
