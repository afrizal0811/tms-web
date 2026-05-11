// File: src/lib/reportGenerators/taskCountReport.js
import { formatDateUniversal, formatLongDate } from '@/lib/utils';
import * as XLSX from 'xlsx-js-style';

export function generateTaskCountWorkbook(allTasks, selectedHubs, startDate, endDate, t) {
  const wb = XLSX.utils.book_new();
  const noteRow1 = t('report.tc_detail.note_one');
  const noteRow2 = t('report.tc_detail.note_two');

  const summary = {};
  selectedHubs.forEach((hub) => {
    summary[hub.id] = { name: hub.name, total: 0, daily: {} };
  });

  const trashTasks = [];
  const uniqueDatesSet = new Set();

  let currentD = new Date(startDate);
  currentD.setHours(0, 0, 0, 0);
  const endD = new Date(endDate);
  endD.setHours(0, 0, 0, 0);

  while (currentD <= endD) {
    const dKey = formatDateUniversal(currentD);
    uniqueDatesSet.add(dKey);
    currentD.setDate(currentD.getDate() + 1);
  }

  allTasks.forEach((task) => {
    if (task._isFromTrash) {
      trashTasks.push(task);
      return;
    }

    const hubId = task.hubId;
    if (summary[hubId] && task.startTime) {
      const tDate = new Date(task.startTime);
      const dKey = formatDateUniversal(tDate);
      uniqueDatesSet.add(dKey);

      if (summary[hubId].daily[dKey] === undefined) {
        summary[hubId].daily[dKey] = 0;
      }
      summary[hubId].daily[dKey]++;
      summary[hubId].total++;
    }
  });

  const datesKeys = Array.from(uniqueDatesSet).sort((a, b) => new Date(a) - new Date(b));

  const headerStyle = {
    font: { bold: true, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: '0284C7' } },
    alignment: { horizontal: 'center' },
  };
  const subTotalStyle = { font: { bold: true }, fill: { fgColor: { rgb: 'F1F5F9' } } };
  const grandTotalStyle = { font: { bold: true }, fill: { fgColor: { rgb: 'E2E8F0' } } };
  const noteStyle = { font: { italic: true, color: { rgb: '64748B' }, sz: 9 } };

  // ==========================================
  // SHEET 1: RANGKUMAN
  // ==========================================
  const rangkumanData = [['Nama Cabang (Hub)', 'Jumlah Tugas']];
  let totalAllHubs = 0;

  selectedHubs.forEach((hub) => {
    const t = summary[hub.id].total;
    rangkumanData.push([hub.name, t]);
    totalAllHubs += t;
  });

  const idxTotal = rangkumanData.length;
  rangkumanData.push(['Total', totalAllHubs]);

  const idxTrash = rangkumanData.length;
  rangkumanData.push(['Total Tugas Dihapus (Trash)', trashTasks.length]);

  const idxGrand = rangkumanData.length;
  rangkumanData.push(['Grand Total', totalAllHubs + trashTasks.length]);

  // Tambahkan Note 2 Baris di bawah Rangkuman
  rangkumanData.push([]);
  rangkumanData.push([noteRow1]);
  rangkumanData.push([noteRow2]);

  const wsRangkuman = XLSX.utils.aoa_to_sheet(rangkumanData);
  wsRangkuman['A1'].s = headerStyle;
  wsRangkuman['B1'].s = headerStyle;
  wsRangkuman['!cols'] = [{ wch: 35 }, { wch: 15 }];

  // Styling Baris Total
  [idxTotal, idxTrash, idxGrand].forEach((idx, i) => {
    const style = idx === idxGrand ? grandTotalStyle : subTotalStyle;
    const row = idx + 1;
    if (wsRangkuman[`A${row}`]) wsRangkuman[`A${row}`].s = style;
    if (wsRangkuman[`B${row}`]) wsRangkuman[`B${row}`].s = style;
  });

  // Styling Note
  if (wsRangkuman[`A${idxGrand + 3}`]) wsRangkuman[`A${idxGrand + 3}`].s = noteStyle;
  if (wsRangkuman[`A${idxGrand + 4}`]) wsRangkuman[`A${idxGrand + 4}`].s = noteStyle;

  XLSX.utils.book_append_sheet(wb, wsRangkuman, 'Rangkuman');

  // ==========================================
  // SHEET 2..N: PER HUB
  // ==========================================
  selectedHubs.forEach((hub) => {
    const hubData = [['Tanggal', 'Jumlah Tugas']];
    let hubTotal = 0;
    datesKeys.forEach((dKey) => {
      const t = summary[hub.id].daily[dKey] || 0;
      hubData.push([formatLongDate(dKey), t]);
      hubTotal += t;
    });
    hubData.push(['TOTAL', hubTotal]);

    const wsHub = XLSX.utils.aoa_to_sheet(hubData);
    wsHub['A1'].s = headerStyle;
    wsHub['B1'].s = headerStyle;
    wsHub['!cols'] = [{ wch: 25 }, { wch: 15 }];
    const lastRow = hubData.length;
    if (wsHub[`A${lastRow}`]) wsHub[`A${lastRow}`].s = grandTotalStyle;
    if (wsHub[`B${lastRow}`]) wsHub[`B${lastRow}`].s = grandTotalStyle;

    let sheetName = hub.name
      .replace(/[\[\]*?\/\\:]/g, '')
      .substring(0, 31)
      .trim();
    XLSX.utils.book_append_sheet(wb, wsHub, sheetName || 'Hub');
  });

  // ==========================================
  // SHEET: TRASH
  // ==========================================
  const dateRangeStr = `${formatLongDate(startDate)} - ${formatLongDate(endDate)}`;

  const trashRows = [
    [`Task dihapus dari tanggal ${dateRangeStr}: ${trashTasks.length}`],
    [],
    [noteRow1], // Note Sebelum Tabel (Baris 1)
    [noteRow2], // Note Sebelum Tabel (Baris 2)
    [],
    ['Task ID', 'Hub Name', 'Task Name', 'Created At (UTC+7)', 'Deleted At (UTC+7)', 'Deleted By'],
  ];

  trashTasks.forEach((t) => {
    const cStr = t.createdTime
      ? `${formatLongDate(t.createdTime)} ${formatDateUniversal(t.createdTime, 'HH:mm:ss')}`
      : '-';
    const dStr = t.deletedTime
      ? `${formatLongDate(t.deletedTime)} ${formatDateUniversal(t.deletedTime, 'HH:mm:ss')}`
      : '-';
    trashRows.push([
      t._id || '-',
      t.hub?.name || '-',
      t.customerName || t.dataName || t.title || '-',
      cStr,
      dStr,
      t.deletedBy || '-',
    ]);
  });

  // Note Sesudah Tabel
  trashRows.push([]);
  trashRows.push([noteRow1]);
  trashRows.push([noteRow2]);

  const wsTrash = XLSX.utils.aoa_to_sheet(trashRows);
  wsTrash['!cols'] = [{ wch: 30 }, { wch: 20 }, { wch: 40 }, { wch: 25 }, { wch: 25 }, { wch: 20 }];

  // Styling
  wsTrash['A1'].s = { font: { bold: true, sz: 12 } };

  // Style Note Sebelum Tabel (Baris 3 & 4)
  wsTrash['A3'].s = noteStyle;
  wsTrash['A4'].s = noteStyle;

  // Style Header Tabel (Baris 6)
  ['A', 'B', 'C', 'D', 'E', 'F'].forEach((col) => {
    if (wsTrash[`${col}6`]) wsTrash[`${col}6`].s = headerStyle;
  });

  // Style Note Sesudah Tabel
  const lastNoteIdx = trashRows.length;
  if (wsTrash[`A${lastNoteIdx - 1}`]) wsTrash[`A${lastNoteIdx - 1}`].s = noteStyle;
  if (wsTrash[`A${lastNoteIdx}`]) wsTrash[`A${lastNoteIdx}`].s = noteStyle;

  XLSX.utils.book_append_sheet(wb, wsTrash, 'Trash');

  return wb;
}
