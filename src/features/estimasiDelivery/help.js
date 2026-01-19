// File: src/features/estimasiDelivery/help.js
import { getLocalStorage } from '@/lib/localStorageHandler';
import {
  formatSimpleTime,
  formatTimestampToDDMMYYYY_UTC7,
  formatTimestampToQuotedHHMM_UTC7,
  isEmpty,
  normalizeEmail,
  parseCustomerString,
} from '@/lib/utils';
import { StyleSheet } from '@react-pdf/renderer';
import * as XLSX from 'xlsx-js-style';
import { toastError, toastSuccess } from '../../lib/toastHelper';

export function parseSONumber(visitName) {
  if (!visitName) return '';
  const str = String(visitName);
  const matches = str.match(/(SO|SS)\d{4}-\d+/g);
  return matches ? matches.join(', ') : '';
}

export function processDriverTimeMap(apiData, selectedDateStr) {
  const timeMap = new Map();

  if (!Array.isArray(apiData) || isEmpty(apiData)) return timeMap;

  const [y, m, d] = selectedDateStr.split('-');
  const targetDateFormatted = `${d}-${m}-${y}`;

  apiData.forEach((item) => {
    const trackedTime = Math.abs(item.trackedTime || 0);
    const totalDistance = item.finish?.totalDistance || 0;

    if (trackedTime < 10 || totalDistance <= 5) return;

    const startTime = item.startTime;
    const startDateFormatted = formatTimestampToDDMMYYYY_UTC7(startTime);

    if (startDateFormatted !== targetDateFormatted) return;
    const rawStart = formatTimestampToQuotedHHMM_UTC7(startTime);
    const startDisplay = rawStart ? rawStart.replace("'", '') : '-';
    const finishTime = item.finish?.finishTime;
    const rawFinish = formatTimestampToQuotedHHMM_UTC7(finishTime);
    const finishDisplay = rawFinish ? rawFinish.replace("'", '') : '-';
    const email = normalizeEmail(item.email);
    if (email) {
      timeMap.set(email, {
        jamBerangkat: startDisplay,
        jamKembali: finishDisplay,
      });
    }
  });

  return timeMap;
}

function sanitizeSheetName(name, existingNames) {
  if (!name) return 'Sheet';
  let safeName = String(name).replace(/[:*?\/\\\[\]]/g, ' ');
  safeName = safeName.replace(/\s+/g, ' ').trim();
  if (!safeName) safeName = 'Sheet';
  let candidateName = safeName.substring(0, 31);
  let counter = 1;
  while (existingNames.has(candidateName)) {
    const suffix = ` (${counter})`;
    const maxBaseLength = 31 - suffix.length;
    candidateName = `${safeName.substring(0, maxBaseLength)}${suffix}`;
    counter++;
  }
  existingNames.add(candidateName);
  return candidateName;
}

function createCell(value, style) {
  const safeValue = value === null || value === undefined ? '' : value;
  const cell = { v: safeValue };
  if (style && Object.keys(style).length > 0) {
    cell.s = style;
  }
  return cell;
}

export const handleConfirmDownload = ({ filteredVehicleRoutes, setIsDownloading, t }) => {
  setIsDownloading(true);
  try {
    const wb = XLSX.utils.book_new();
    const usedSheetNames = new Set();

    const headerStyle = { font: { bold: true } };
    const redBoldStyle = { font: { color: { rgb: 'FF0000' }, bold: true } };
    const redNormalStyle = { font: { color: { rgb: 'FF0000' } } };

    filteredVehicleRoutes.forEach((route) => {
      const sheetName = sanitizeSheetName(route.vehicleName || 'Vehicle', usedSheetNames);

      const headers = [
        'No.',
        t('estimation.visit'),
        t('estimation.no_so'),
        t('estimation.open_time'),
        t('estimation.close_time'),
        t('estimation.est_arrival'),
        t('estimation.est_depart'),
      ];

      const dataForSheet = [];
      dataForSheet.push(headers.map((h) => createCell(h, headerStyle)));

      route.trips.forEach((trip, tripIndex) => {
        const isHub = trip.isHub;
        const isFirstHub = isHub && trip.order === 0;
        const isLastHub = isHub && tripIndex === route.trips.length - 1;

        const rowStyle = isHub ? redNormalStyle : null;
        const hubNameStyle = isHub ? redBoldStyle : null;

        const visitName = isHub ? 'HUB' : parseCustomerString(trip.visitName).name;
        const soNumber = isHub ? '' : parseSONumber(trip.visitName);
        const openTime = isHub ? '' : formatSimpleTime(trip.timeWindow?.startTime);
        const closeTime = isHub ? '' : formatSimpleTime(trip.timeWindow?.endTime);
        const estArr = isFirstHub ? '' : formatSimpleTime(trip.eta);
        const estDep = isLastHub ? '' : formatSimpleTime(trip.etd);

        const row = [
          createCell(trip.order, rowStyle),
          createCell(visitName, hubNameStyle || rowStyle),
          createCell(soNumber, rowStyle),
          createCell(openTime, rowStyle),
          createCell(closeTime, rowStyle),
          createCell(estArr, rowStyle),
          createCell(estDep, rowStyle),
        ];

        dataForSheet.push(row);
      });

      const ws = XLSX.utils.aoa_to_sheet(dataForSheet, { cellStyles: true });
      ws['!cols'] = [
        { wch: 5 },
        { wch: 40 },
        { wch: 25 },
        { wch: 12 },
        { wch: 12 },
        { wch: 18 },
        { wch: 20 },
      ];
      StyleSheet;

      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    });

    if (wb.SheetNames.length === 0) {
      toastError(t('estimation.toast.no_data'));
      return;
    } else {
      const { storedLocationName: locationName } = getLocalStorage() || '-';
      const fileName = `${t('estimation.title')} - ${locationName}.xlsx`;
      XLSX.writeFile(wb, fileName);
      toastSuccess(t('estimation.toast.success'));
    }
  } catch (e) {
    console.error('Download Error:', e);
    toastError(e.message || 'Gagal mengunduh file');
  } finally {
    setIsDownloading(false);
  }
};

export const styles = StyleSheet.create({
  page: {
    padding: 20,
    fontSize: 9,
    fontFamily: 'Helvetica',
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
  },

  headerContainer: {
    flexDirection: 'column',
    marginBottom: 5,
  },
  titleRow: {
    marginBottom: 10,
    borderBottomWidth: 1.5,
    borderColor: '#000',
    alignSelf: 'flex-start',
    paddingBottom: 2,
  },
  mainTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },

  formSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  inputsContainer: {
    flex: 1,
    marginRight: 20,
    flexDirection: 'column',
    gap: 4,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },

  labelCol1: { width: 50, fontSize: 8, fontWeight: 'bold' },
  lineCol1: {
    width: 140,
    borderBottomWidth: 1,
    borderColor: '#000',
    height: 12,
    justifyContent: 'flex-end',
  },
  spacer: { width: 15 },
  labelCol2: { width: 70, fontSize: 8, fontWeight: 'bold', textAlign: 'right', paddingRight: 2 },
  lineCol2: {
    width: 50,
    borderBottomWidth: 1,
    borderColor: '#000',
    height: 12,
    justifyContent: 'flex-end',
  },
  labelCol3: { width: 90, fontSize: 8, fontWeight: 'bold', textAlign: 'right', paddingRight: 2 },
  lineCol3: {
    flex: 1,
    borderBottomWidth: 1,
    borderColor: '#000',
    height: 12,
    justifyContent: 'flex-end',
  },
  inputText: {
    fontSize: 9,
    marginLeft: 5,
    marginBottom: 1,
  },

  miniTable: {
    width: 180,
    borderWidth: 1,
    borderColor: '#000',
    flexDirection: 'column',
  },
  miniTableRow: {
    flexDirection: 'row',
    height: 15,
  },
  miniTableHeader: {
    backgroundColor: '#E5E7EB',
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    flexDirection: 'row',
    height: 15,
    alignItems: 'center',
  },
  miniCell: {
    borderRightWidth: 1,
    borderColor: '#000',
    fontSize: 7,
    justifyContent: 'center',
    textAlign: 'center',
    height: '100%',
    paddingTop: 2,
  },
  colNoUrut: { width: 50, borderRightWidth: 1 },
  colBln: { width: 30, borderRightWidth: 1 },
  colNamaDriver: { flex: 1, borderRightWidth: 0 },

  tableContainer: {
    marginTop: 5,
    flexDirection: 'column',
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderColor: '#000',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    minHeight: 18,
    alignItems: 'stretch',
  },
  tableHeaderRow: {
    backgroundColor: '#E5E7EB',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  cell: {
    borderRightWidth: 1,
    borderRightColor: '#000',
    padding: 2,
    justifyContent: 'center',
    fontSize: 8,
  },
  headerCell: {
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 7,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // --- 3. UPDATE WIDTHS (REVISI) ---
  colFaktur: { width: '15%' }, // Update: 15%
  colOutlet: { width: '18%' }, // Update: 18%
  colQty: { width: '5%', textAlign: 'center' },
  colBiayaParent: { width: '37%', padding: 0 },
  colJml: { width: '10%', textAlign: 'center' },
  colKetParent: { width: '15%', padding: 0 },

  nestedHeaderTop: {
    borderBottomWidth: 1,
    borderColor: '#000',
    textAlign: 'center',
    height: 10,
    fontSize: 7,
    justifyContent: 'center',
    width: '100%',
  },
  nestedSubContainer: {
    flexDirection: 'row',
    flex: 1,
    width: '100%',
  },
  nestedSubCell: {
    flex: 1,
    borderRightWidth: 1,
    borderColor: '#000',
    textAlign: 'center',
    fontSize: 6,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 1,
    paddingHorizontal: 1,
  },
  nestedSubCellLast: { borderRightWidth: 0 },

  footerLabelCell: {
    backgroundColor: '#E5E7EB',
    fontWeight: 'bold',
    fontSize: 7,
    justifyContent: 'center',
    paddingLeft: 5,
  },

  infoBox: {
    marginTop: 5,
    borderWidth: 1,
    borderColor: '#000',
    padding: 4,
    flexDirection: 'row',
    gap: 10,
    alignSelf: 'flex-start',
  },
  infoTextColumn: {
    flexDirection: 'column',
    gap: 1,
  },
  infoText: {
    fontSize: 7,
    fontFamily: 'Helvetica',
  },

  signatureSection: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 20,
  },
  signatureBox: {
    flex: 1,
  },
  signatureHeader: {
    fontSize: 7,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  sigTable: {
    borderWidth: 1,
    borderColor: '#000',
    flexDirection: 'column',
  },
  sigRowHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: '#000',
    backgroundColor: '#E5E7EB',
    height: 15,
  },
  sigRowBody: {
    flexDirection: 'row',
    height: 40,
  },
  sigRowFooter: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderColor: '#000',
    height: 15,
  },
  sigCell: {
    flex: 1,
    borderRightWidth: 1,
    borderColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    textAlign: 'center',
    fontSize: 7,
  },
  sigCellLast: {
    borderRightWidth: 0,
  },
});
