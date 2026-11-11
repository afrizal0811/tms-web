import {
  DELIVERY_STATUS_KEYS,
  isTaskUnassigned,
  normalizeDeliveryStatus,
} from '@/lib/deliveryStatus';
import {
  formatDateUniversal,
  getBasePlate,
  normalizeEmail,
  parseCustomerString,
} from '@/lib/utils';
import * as XLSX from 'xlsx-js-style';

function hasFilledPendingDetail(pd) {
  if (!pd) return false;
  const fields = [pd.detailReason, pd.groupReason, pd.pic, pd.internalExternal];
  return fields.some((val) => val && String(val).trim() !== '' && String(val).trim() !== '-');
}

export function generateSheetPendingSO(tasksData, driverData, fallbackDate = null) {
  const allPendingRows = [];
  const incompleteDates = new Set();

  if (Array.isArray(tasksData)) {
    tasksData.forEach((task) => {
      if (isTaskUnassigned(task)) return;
      const pd = task.pendingDetail;
      const effectiveStatus = pd?.new_status || task.statusDelivery || task.status;
      if (normalizeDeliveryStatus(effectiveStatus) !== DELIVERY_STATUS_KEYS.PENDING) return;

      const driverName = task.driverName;
      const rawAssignee = task.assignee
        ? typeof task.assignee === 'string'
          ? task.assignee.split(',')[0].trim()
          : task.assignee
        : '';
      const email = normalizeEmail(rawAssignee);

      const driverInfo = (driverData || []).find(
        (d) =>
          (email && normalizeEmail(d.email) === email) ||
          (driverName && d.name && d.name.toUpperCase() === driverName.toUpperCase())
      );

      const rawPlat = driverInfo?.plat || task.basePlat || task.vehicleName || task.plat || '-';
      const finalPlat = getBasePlate(rawPlat);
      const finalDriver = driverInfo?.name || driverName || rawAssignee || '-';
      const custInfo = parseCustomerString(task.customerOrder || '');

      const rawDate = task.deliveryDate || task.delivery_date || task.startTime || fallbackDate;
      const sortDateRaw = rawDate ? formatDateUniversal(rawDate, 'YYYY-MM-DD') : '';
      const sortDate = sortDateRaw && sortDateRaw !== '-' ? sortDateRaw : '';
      const displayDate = rawDate ? formatDateUniversal(rawDate, 'DD-MM-YYYY') : '-';

      const detailText = pd?.detailReason ? String(pd.detailReason).trim() : '';
      const reason = detailText || task.reason || '-';
      const hasPendingDetail = hasFilledPendingDetail(pd);
      const isReasonEmpty = !hasPendingDetail || !reason || reason === '-' || reason.trim() === '';

      if (isReasonEmpty) {
        incompleteDates.add(sortDate);
      }

      allPendingRows.push({
        row: [
          displayDate,
          task.flow || '-',
          finalPlat,
          finalDriver,
          custInfo.fullCustomerName || custInfo.name || '-',
          custInfo.invoiceNumber || '-',
          reason,
        ],
        isReasonEmpty,
        sortDate,
        driver: finalDriver,
      });
    });
  }

  const pendingRows = allPendingRows.filter((r) => incompleteDates.has(r.sortDate));
  if (pendingRows.length === 0) {
    return { ws: null, incompleteDates };
  }

  pendingRows.sort((a, b) => {
    const dateCmp = String(a.sortDate).localeCompare(String(b.sortDate));
    if (dateCmp !== 0) return dateCmp;
    return String(a.driver || '')
      .toUpperCase()
      .localeCompare(String(b.driver || '').toUpperCase());
  });

  const sheetData = [
    ['Tanggal', 'Flow', 'Plat Nomor', 'Driver', 'Customer', 'Nomor Faktur', 'Reason'],
    ...pendingRows.map((p) => p.row),
    [],
    ['NOTE'],
    ['', 'data detail reason pending belum lengkap'],
  ];

  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  const styleHeader = {
    font: { bold: true },
    alignment: { horizontal: 'center', vertical: 'center' },
    fill: { fgColor: { rgb: 'EFEFEF' } },
    border: {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' },
    },
  };
  const styleCenter = { alignment: { horizontal: 'center', vertical: 'center' } };
  const styleLeft = { alignment: { horizontal: 'left', vertical: 'center' } };
  const styleCenterError = {
    alignment: { horizontal: 'center', vertical: 'center' },
    fill: { fgColor: { rgb: 'F6C5C0' } },
  };
  const styleLeftError = {
    alignment: { horizontal: 'left', vertical: 'center' },
    fill: { fgColor: { rgb: 'F6C5C0' } },
  };
  const styleNoteTitle = {
    font: { color: { rgb: 'FF0000' }, underline: true, bold: true },
    alignment: { horizontal: 'left', vertical: 'center' },
  };
  const styleLegendColor = {
    fill: { fgColor: { rgb: 'F6C5C0' } },
  };
  const styleLegendText = {
    alignment: { horizontal: 'left', vertical: 'center' },
  };

  const totalRows = sheetData.length;
  for (let R = 0; R < totalRows; ++R) {
    for (let C = 0; C < 7; ++C) {
      const cell = XLSX.utils.encode_cell({ r: R, c: C });
      if (!ws[cell]) ws[cell] = { v: '', t: 's' };

      if (R === 0) {
        ws[cell].s = styleHeader;
      } else if (R === totalRows - 2 && C === 0) {
        ws[cell].s = styleNoteTitle;
      } else if (R === totalRows - 1 && C === 0) {
        ws[cell].s = styleLegendColor;
      } else if (R === totalRows - 1 && C === 1) {
        ws[cell].s = styleLegendText;
      } else if (R > 0 && R < totalRows - 3) {
        const isError = pendingRows[R - 1]?.isReasonEmpty;
        ws[cell].s = isError
          ? C <= 2
            ? styleCenterError
            : styleLeftError
          : C <= 2
            ? styleCenter
            : styleLeft;
      }
    }
  }

  ws['!merges'] = [
    { s: { r: totalRows - 2, c: 0 }, e: { r: totalRows - 2, c: 6 } },
    { s: { r: totalRows - 1, c: 1 }, e: { r: totalRows - 1, c: 6 } },
  ];
  ws['!cols'] = [
    { wch: 15 },
    { wch: 15 },
    { wch: 15 },
    { wch: 30 },
    { wch: 45 },
    { wch: 20 },
    { wch: 35 },
  ];

  return { ws, incompleteDates };
}
