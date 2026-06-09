'use client';

export const FAILED_STATUSES = ['PENDING', 'BATAL', 'TERIMA SEBAGIAN'];
export const PENDING_SHEET_STATUSES_BASE = ['PENDING', 'BATAL', 'TERIMA SEBAGIAN'];

export const reportStyles = {
  headerStyle: {
    font: { bold: true },
    alignment: { horizontal: 'center', vertical: 'center' },
  },
  centerStyle: {
    alignment: { horizontal: 'center', vertical: 'center' },
  },
  wrapTextStyle: {
    alignment: { wrapText: true, vertical: 'center', horizontal: 'left' },
  },
  leftAlignStyle: {
    alignment: { horizontal: 'left', vertical: 'center' },
  },
  blueFillStyle: { fill: { patternType: 'solid', fgColor: { rgb: 'BDE5F8' } } },
  yellowFillStyle: { fill: { patternType: 'solid', fgColor: { rgb: 'ffe19c' } } },
  greenFillStyle: { fill: { patternType: 'solid', fgColor: { rgb: 'C6EFCE' } } },
  greenHeaderStyle: {
    alignment: { horizontal: 'center', vertical: 'center' },
    font: { bold: true },
    fill: { patternType: 'solid', fgColor: { rgb: '84fa92' } },
  },
  hubRedStyle: {
    alignment: { horizontal: 'center', vertical: 'center' },
    font: { bold: true, color: { rgb: 'FF0000' } },
  },
  routingDateTitle: {
    font: { bold: true, sz: 24, color: { rgb: 'FF0000' } },
    alignment: { horizontal: 'center', vertical: 'center' },
  },
  routingDateValue: {
    font: { bold: true, sz: 60 },
    alignment: { horizontal: 'center', vertical: 'center' },
  },
  separatorStyle: {
    fill: { patternType: 'solid', fgColor: { rgb: 'FA9D9D' } },
  },
  colFillMapRoVsReal: {
    5: { header: 'A7F3D0', data: 'D1FAE5' },
    6: { header: 'A7F3D0', data: 'D1FAE5' },
    7: { header: 'FED7AA', data: 'FFEDD5' },
    8: { header: 'FED7AA', data: 'FFEDD5' },
    9: { header: 'FDE68A', data: 'FEF9C3' },
    10: { header: 'FDE68A', data: 'FEF9C3' },
    11: { header: 'FBCFE8', data: 'FCE7F3' },
    12: { header: 'FBCFE8', data: 'FCE7F3' },
    13: { header: 'BFDBFE', data: 'DBEAFE' },
    14: { header: 'BFDBFE', data: 'DBEAFE' },
  },
};

export const getDeliveryHeaders = (translate, hasPendingGR) => {
  const pendingHeaders = [
    translate('common.flow'),
    translate('common.so_number'),
    translate('common.date'),
    translate('common.license_number'),
    translate('common.driver'),
    translate('common.status.cancel'),
    translate('common.status.partial'),
    translate('common.status.pending'),
  ];

  if (hasPendingGR) pendingHeaders.push(translate('common.status.pending_gr'));

  pendingHeaders.push(
    translate('excel.delivery.headers.reason'),
    '',
    translate('common.open_time'),
    translate('common.close_time'),
    translate('common.eta'),
    translate('common.etd'),
    translate('common.actual_arrival'),
    translate('common.actual_departure'),
    translate('common.visit_plan'),
    translate('common.visit_actual'),
    translate('common.customer_id'),
    translate('common.ro_seq'),
    translate('common.actual_seq'),
    translate('common.storage_type')
  );

  return {
    totalDelivered: [
      translate('common.license_number'),
      translate('common.driver'),
      translate('excel.delivery.headers.total_outlet'),
      translate('excel.delivery.headers.total_delivery'),
      translate('excel.delivery.headers.info_manual'),
      translate('excel.delivery.headers.info_diff_day'),
    ],
    pendingSO: pendingHeaders,
    updateLonglat: [
      translate('common.customer_name'),
      translate('common.customer_id'),
      translate('common.location_id'),
      translate('excel.delivery.headers.new_longlat'),
      translate('excel.delivery.headers.dist_diff'),
    ],
    roVsReal: [
      translate('common.flow'),
      translate('common.license_number'),
      translate('common.driver'),
      translate('common.customer_name'),
      translate('excel.delivery.headers.status_del'),
      translate('common.open_time'),
      translate('common.close_time'),
      translate('common.eta'),
      translate('common.actual_arrival'),
      translate('common.etd'),
      translate('common.actual_departure'),
      translate('common.visit_plan'),
      translate('common.visit_actual'),
      translate('common.ro_seq'),
      translate('common.actual_seq'),
      translate('excel.delivery.headers.is_match'),
      translate('dashboard.tab.routingreal.is_within_hours'),
    ],
  };
};

export const getDeliverySheetNames = (translate) => ({
  routingDate: translate('excel.delivery.sheets.routing_date'),
  totalDelivered: translate('excel.delivery.sheets.total_delivered'),
  pendingSO: translate('excel.delivery.sheets.pending_so'),
  updateLonglat: translate('excel.delivery.sheets.update_longlat'),
  roVsReal: translate('excel.delivery.sheets.ro_vs_real'),
});
