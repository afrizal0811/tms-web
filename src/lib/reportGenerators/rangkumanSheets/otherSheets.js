// File: src/lib/reportGenerators/rangkumanSheets/otherSheets.js
import * as XLSX from 'xlsx-js-style';
import { styles } from './reportStyles';

export function generateTaskSummarySheet(wb) {
  const ws = XLSX.utils.aoa_to_sheet([
    [
      'Date',
      'Plat',
      'Driver',
      'Total Outlet',
      'Total Delivery',
      'Info Manual Assign',
      'Info Beda Hari',
    ],
  ]);
  ['A1', 'B1', 'C1', 'D1', 'E1', 'F1', 'G1'].forEach((cell) => {
    if (ws[cell]) ws[cell].s = styles.header;
  });
  ws['!cols'] = [
    { wch: 12 },
    { wch: 15 },
    { wch: 25 },
    { wch: 15 },
    { wch: 15 },
    { wch: 30 },
    { wch: 30 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, 'Task Summary');
}

export function generatePendingReasonsSheet(wb) {
  const ws = XLSX.utils.aoa_to_sheet([
    ['Date', 'Flow', 'Plat', 'Driver', 'Customer Name', 'Status', 'Reason', 'Visit Time'],
  ]);
  ['A1', 'B1', 'C1', 'D1', 'E1', 'F1', 'G1', 'H1'].forEach((cell) => {
    if (ws[cell]) ws[cell].s = styles.header;
  });
  ws['!cols'] = [
    { wch: 12 },
    { wch: 10 },
    { wch: 15 },
    { wch: 25 },
    { wch: 30 },
    { wch: 20 },
    { wch: 40 },
    { wch: 15 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, 'Pending Reasons');
}

export function generateTimeDriverSheet(wb) {
  const ws = XLSX.utils.aoa_to_sheet([
    ['Date', 'Plat', 'Driver', 'Start Time', 'Finish Time', 'Duration'],
  ]);
  ['A1', 'B1', 'C1', 'D1', 'E1', 'F1'].forEach((cell) => {
    if (ws[cell]) ws[cell].s = styles.header;
  });
  ws['!cols'] = [{ wch: 12 }, { wch: 15 }, { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, ws, 'Time Driver');
}

export function generateTruckDetailSheet(wb) {
  const ws = XLSX.utils.aoa_to_sheet([
    ['Date', 'Plat', 'Driver', 'Weight %', 'Volume %', 'Total Distance (m)', 'Ship Duration'],
  ]);
  ['A1', 'B1', 'C1', 'D1', 'E1', 'F1', 'G1'].forEach((cell) => {
    if (ws[cell]) ws[cell].s = styles.header;
  });
  ws['!cols'] = [
    { wch: 12 },
    { wch: 15 },
    { wch: 25 },
    { wch: 15 },
    { wch: 15 },
    { wch: 20 },
    { wch: 15 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, 'Truck Detail');
}

export function generateTruckUsageSheet(wb) {
  const ws = XLSX.utils.aoa_to_sheet([['Date', 'Vehicle Type', 'Count (Dry)', 'Count (Frozen)']]);
  ['A1', 'B1', 'C1', 'D1'].forEach((cell) => {
    if (ws[cell]) ws[cell].s = styles.header;
  });
  ws['!cols'] = [{ wch: 12 }, { wch: 20 }, { wch: 15 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, ws, 'Truck Usage');
}
