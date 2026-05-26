export const reportStyles = {
  centerStyle: { alignment: { horizontal: 'center', vertical: 'center' } },
  defaultHeaderStyle: {
    alignment: { horizontal: 'center', vertical: 'center' },
    font: { bold: true },
  },
  greenHeaderStyle: {
    alignment: { horizontal: 'center', vertical: 'center' },
    font: { bold: true },
    fill: { patternType: 'solid', fgColor: { rgb: '84FA92' } },
  },
  distanceHeaderStyle: {
    font: { bold: true },
    alignment: { horizontal: 'center', vertical: 'center' },
  },
  distanceDataStyle: {
    alignment: { horizontal: 'center', vertical: 'center' },
    t: 'n',
    z: '0.00',
  },
  usageDataNumStyle: {
    alignment: { horizontal: 'center', vertical: 'center' },
    t: 'n',
  },
  usageDataLabelStyle: {
    alignment: { horizontal: 'left', vertical: 'center' },
  },
  helpDataStyle: {
    alignment: { horizontal: 'left', vertical: 'center' },
  },
};

export const reportColumns = {
  truckDetailCenterAligned: [2, 3, 4, 7, 8, 9],
  distanceSummary: [{ wch: 15 }, { wch: 15 }],
  truckUsage: [{ wch: 20 }, { wch: 15 }, { wch: 15 }],
  help: [{ wch: 28 }, { wch: 30 }, { wch: 20 }, { wch: 22 }, { wch: 45 }],
};

export const getRoutingHeaders = (translate) => ({
  truckDetail: [
    translate('common.license_number'),
    translate('common.driver'),
    translate('excel.routing.headers.weight_pct'),
    translate('excel.routing.headers.volume_pct'),
    translate('excel.routing.headers.total_dist'),
    translate('excel.routing.headers.total_visits'),
    translate('excel.routing.headers.total_delivery'),
    translate('excel.routing.headers.ship_dur'),
    translate('excel.routing.headers.eta_first'),
    translate('excel.routing.headers.etd_hub'),
  ],
  truckDetailGreen: [
    translate('excel.routing.headers.weight_pct'),
    translate('excel.routing.headers.volume_pct'),
    translate('excel.routing.headers.total_dist'),
    translate('excel.routing.headers.total_visits'),
    translate('excel.routing.headers.total_delivery'),
    translate('excel.routing.headers.ship_dur'),
  ],
  distanceSummary: [
    translate('excel.routing.headers.dry_km'),
    translate('excel.routing.headers.frozen_km'),
  ],
  truckUsage: [
    translate('common.vehicle_type'),
    translate('excel.routing.headers.count_dry'),
    translate('excel.routing.headers.count_frozen'),
  ],
  help: [
    translate('excel.routing.headers.routing_id'),
    translate('excel.routing.headers.routing_name'),
    translate('excel.routing.headers.created_by'),
    translate('excel.routing.headers.created_at'),
    translate('excel.routing.headers.routing_result'),
  ],
});

export const getRoutingSheetNames = (translate) => ({
  truckDetail: translate('excel.routing.sheets.truck_detail'),
  distSummary: translate('excel.routing.sheets.dist_summary'),
  truckUsage: translate('excel.routing.sheets.truck_usage'),
  help: translate('excel.routing.sheets.help'),
});
