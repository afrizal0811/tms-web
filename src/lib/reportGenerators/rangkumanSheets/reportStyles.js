// File: lib/reportGenerators/rangkumanSheets/reportStyles.js

// --- 1. DEFINISI WARNA (PALETTE) ---
export const COLORS = {
  header: { rgb: 'D9D2E9' }, // Ungu Muda (Header Umum)
  headerBlue: { rgb: '4472C4' }, // Biru Tua (Header Pending Reason)

  dry: { rgb: 'FAE2D5' }, // Peach (Dry)
  dryTotal: { rgb: 'F9CB9C' }, // Orange Muda (Total Dry)

  frozen: { rgb: 'DBE9F7' }, // Biru Muda (Frozen)
  frozenTotal: { rgb: 'C9DAF8' }, // Biru Agak Tua (Total Frozen)

  otv: { rgb: 'D9F2D0' }, // Hijau Muda (OTV)

  sunday: { rgb: 'FFC7CE' }, // Merah Muda (Minggu/Libur)
  alert: { rgb: 'FF0000' }, // Merah Terang (Overlimit)
  yellowWarn: { rgb: 'FFFF00' }, // Kuning (Warning 0)

  masterTotal: { rgb: 'E2EFDA' }, // Hijau Muda (Master Total - Legacy)
  subHeader: { rgb: 'D9E1F2' }, // Biru Abu (Sub Header Truck Usage)
  white: { rgb: 'FFFFFF' },
};

// --- 2. DEFINISI BORDER ---
export const BORDERS = {
  thin: { style: 'thin', color: { auto: 1 } },
  medium: { style: 'medium', color: { auto: 1 } },
};

// --- 3. STYLE DASAR ---
export const BASE_STYLES = {
  center: { alignment: { horizontal: 'center', vertical: 'center' } },
  left: { alignment: { horizontal: 'left', vertical: 'center', indent: 1 } },

  // Style Dasar Sel dengan Border Tipis
  cellCenter: {
    alignment: { horizontal: 'center', vertical: 'center' },
    border: { top: BORDERS.thin, bottom: BORDERS.thin, left: BORDERS.thin, right: BORDERS.thin },
  },

  // Style Dasar Sel (Hanya Top Bottom)
  cellRow: {
    alignment: { horizontal: 'center', vertical: 'center' },
    border: { top: BORDERS.thin, bottom: BORDERS.thin },
  },
};

// --- 4. STYLE HEADER ---
export const HEADER_STYLES = {
  main: {
    font: { bold: true },
    fill: { patternType: 'solid', fgColor: COLORS.header },
    alignment: { horizontal: 'center', vertical: 'center' },
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
  red: { patternType: 'solid', fgColor: COLORS.sunday }, // Minggu / Error Empty
  alertRed: { patternType: 'solid', fgColor: COLORS.alert }, // Overlimit
  yellow: { patternType: 'solid', fgColor: COLORS.yellowWarn }, // Warning

  // Kategori
  dry: { patternType: 'solid', fgColor: COLORS.dry },
  dryTotal: { patternType: 'solid', fgColor: COLORS.dryTotal },
  frozen: { patternType: 'solid', fgColor: COLORS.frozen },
  frozenTotal: { patternType: 'solid', fgColor: COLORS.frozenTotal },
  otv: { patternType: 'solid', fgColor: COLORS.otv },
};

export const FONT_STYLES = {
  bold: { bold: true },
  whiteBold: { bold: true, color: COLORS.white },
  redBold: { bold: true, color: { rgb: '9C0006' } }, // Merah Tua (Text)
};
