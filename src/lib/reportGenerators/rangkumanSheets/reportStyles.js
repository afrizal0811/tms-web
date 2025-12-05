// File: lib/reportGenerators/rangkumanSheets/reportStyles.js

// --- 1. DEFINISI WARNA (PALETTE) ---
export const COLORS = {
  header: { rgb: 'D9D2E9' },
  headerBlue: { rgb: '4472C4' },

  dry: { rgb: 'FAE2D5' },
  dryTotal: { rgb: 'F9CB9C' },

  frozen: { rgb: 'DBE9F7' },
  frozenTotal: { rgb: 'C9DAF8' },

  otv: { rgb: 'D9F2D0' },

  sunday: { rgb: 'FFC7CE' },
  alert: { rgb: 'FF0000' },
  yellowWarn: { rgb: 'FFFF00' },

  masterTotal: { rgb: 'E2EFDA' },
  subHeader: { rgb: 'D9E1F2' },
  white: { rgb: 'FFFFFF' },

  // --- WARNA BARU: TASK SUMMARY ---
  taskYellow: { rgb: 'FFF2CC' }, // Date, Type, MT, TV, VA
  taskPink: { rgb: 'EAD1DC' }, // DP
  taskGreen: { rgb: 'D9EAD3' }, // DT, %DT
  taskRed: { rgb: 'F4CCCC' }, // MA, %MA
  taskCyan: { rgb: 'D0E0E3' }, // RT, %RT
  taskBlue: { rgb: 'CFE2F3' }, // CO, %CO
  taskGray: { rgb: 'CCCCCC' }, // PR, %PR
  taskViolet: { rgb: 'D9D2E9' }, // TVU, %TVU
};

// --- 2. DEFINISI BORDER ---
export const BORDERS = {
  thin: {
    top: { style: 'thin', color: { auto: 1 } },
    bottom: { style: 'thin', color: { auto: 1 } },
    left: { style: 'thin', color: { auto: 1 } },
    right: { style: 'thin', color: { auto: 1 } },
  },
  medium: { style: 'medium', color: { auto: 1 } },
};

// --- 3. STYLE DASAR ---
export const BASE_STYLES = {
  center: {
    alignment: { horizontal: 'center', vertical: 'center' },
    font: { name: 'Calibri', sz: 11 },
    border: BORDERS.thin,
  },
  left: {
    alignment: { horizontal: 'left', vertical: 'center' },
    font: { name: 'Calibri', sz: 11 },
    border: BORDERS.thin,
  },
  cellCenter: {
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    font: { name: 'Calibri', sz: 10 },
    border: BORDERS.thin,
  },
};

// --- 4. STYLE HEADER KHUSUS ---
export const HEADER_STYLES = {
  // Header Umum (Ungu Muda)
  main: {
    font: { bold: true },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    fill: { patternType: 'solid', fgColor: COLORS.header },
    border: { top: BORDERS.thin, bottom: BORDERS.thin },
  },

  // Header Biru (Pending Reason)
  blueHeader: {
    font: { bold: true, color: COLORS.white },
    fill: { patternType: 'solid', fgColor: COLORS.headerBlue },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: { top: BORDERS.thin, bottom: BORDERS.thin, left: BORDERS.thin, right: BORDERS.thin },
  },

  // Sub Header (Truck Usage Sections)
  subHeader: {
    font: { bold: true },
    fill: { patternType: 'solid', fgColor: COLORS.subHeader },
    border: { top: BORDERS.thin, bottom: BORDERS.thin, left: BORDERS.thin, right: BORDERS.thin },
  },
};

// --- 5. STYLE KONDISIONAL (PRESETS) ---
export const FILL_STYLES = {
  red: { patternType: 'solid', fgColor: COLORS.sunday },
  alertRed: { patternType: 'solid', fgColor: COLORS.alert },
  yellow: { patternType: 'solid', fgColor: COLORS.yellowWarn },

  // Kategori
  dry: { patternType: 'solid', fgColor: COLORS.dry },
  dryTotal: { patternType: 'solid', fgColor: COLORS.dryTotal },
  frozen: { patternType: 'solid', fgColor: COLORS.frozen },
  frozenTotal: { patternType: 'solid', fgColor: COLORS.frozenTotal },
  otv: { patternType: 'solid', fgColor: COLORS.otv },

  // Task Summary Fills
  taskYellow: { patternType: 'solid', fgColor: COLORS.taskYellow },
  taskPink: { patternType: 'solid', fgColor: COLORS.taskPink },
  taskGreen: { patternType: 'solid', fgColor: COLORS.taskGreen },
  taskRed: { patternType: 'solid', fgColor: COLORS.taskRed },
  taskCyan: { patternType: 'solid', fgColor: COLORS.taskCyan },
  taskBlue: { patternType: 'solid', fgColor: COLORS.taskBlue },
  taskGray: { patternType: 'solid', fgColor: COLORS.taskGray },
  taskViolet: { patternType: 'solid', fgColor: COLORS.taskViolet },
};

export const FONT_STYLES = {
  bold: { bold: true },
  whiteBold: { bold: true, color: COLORS.white },
};
