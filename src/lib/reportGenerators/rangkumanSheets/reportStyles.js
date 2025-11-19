// File: src/lib/reportGenerators/rangkumanSheets/reportStyles.js

export const styles = {
  header: {
    font: { bold: true, color: { rgb: 'FFFFFF' } },
    fill: { patternType: 'solid', fgColor: { rgb: '4472C4' } }, // Biru Header
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: {
      top: { style: 'thin', color: { auto: 1 } },
      bottom: { style: 'thin', color: { auto: 1 } },
      left: { style: 'thin', color: { auto: 1 } },
      right: { style: 'thin', color: { auto: 1 } },
    },
  },
  // Warna untuk penanda hari Minggu
  pinkFill: {
    patternType: 'solid',
    fgColor: { rgb: 'F2DCDB' },
  },
  // Warna kuning untuk header sub-section
  yellowHeader: {
    patternType: 'solid',
    fgColor: { rgb: 'FFFF99' },
  },
  // Warna kuning muda untuk kolom data tertentu
  yellowData: {
    patternType: 'solid',
    fgColor: { rgb: 'FFF2CC' },
  },
  center: {
    alignment: { horizontal: 'center', vertical: 'center' },
  },
  numberFormat: {
    alignment: { horizontal: 'center', vertical: 'center' },
    numFmt: '#,##0.00',
  },
};
