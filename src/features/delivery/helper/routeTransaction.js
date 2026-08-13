import {
  formatDateUniversal,
  isBypassSo,
  isEmpty,
  isValidSo,
  parseCustomerString,
  standardizeSo,
} from '@/lib/utils';
import JSZip from 'jszip';
import * as XLSX from 'xlsx-js-style';
import { toastError, toastSuccess } from '../../../lib/toast';
import {
  abortIfNoRoutingResults,
  getLocationName,
  getUniqueFileName,
  isTripRedelivery,
  sortRoutingResultsByCreatedTime,
  triggerDownload,
  sanitizeName,
} from './shared';

const buildSegments = (trips, isSplitMultitrip) => {
  const segments = [];
  let currentSegment = [];

  (trips || []).forEach((trip) => {
    if (trip.isHub) {
      if (isSplitMultitrip && currentSegment.length > 0) {
        segments.push(currentSegment);
        currentSegment = [];
      }
    } else {
      currentSegment.push(trip);
    }
  });
  if (currentSegment.length > 0) segments.push(currentSegment);

  return segments;
};

const buildSoWorksheet = (processedRows, t) => {
  processedRows.sort((a, b) => {
    const validA = (isValidSo(a.so) || isBypassSo(a.so)) && !a.isInvalidCustomer;
    const validB = (isValidSo(b.so) || isBypassSo(b.so)) && !b.isInvalidCustomer;
    if (!validA && validB) return -1;
    if (validA && !validB) return 1;
    return a.so.localeCompare(b.so);
  });

  const getCleanSo = (so) => {
    if (isBypassSo(so)) {
      const match = so.match(/^([a-zA-Z]{2,5}\d{4}-\d{6})/);
      return match ? match[1].toUpperCase() : so;
    }
    return so;
  };

  const wsData = [
    ['Order Nbr.', 'Order Type'],
    ...processedRows.map((row) => {
      const isStrictValid = isValidSo(row.so) && !row.isInvalidCustomer;
      const isBypass = isBypassSo(row.so) && !row.isInvalidCustomer;
      const finalSo = getCleanSo(row.so);
      return isStrictValid || isBypass
        ? [finalSo, finalSo.substring(0, 2).toUpperCase()]
        : [finalSo, '-'];
    }),
  ];

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  ['A1', 'B1'].forEach((cell) => {
    if (ws[cell]) {
      ws[cell].s = {
        font: { bold: true, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '4F46E5' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: {
          top: { style: 'thin' },
          bottom: { style: 'thin' },
          left: { style: 'thin' },
          right: { style: 'thin' },
        },
      };
    }
  });

  processedRows.forEach((row, idx) => {
    const rowIndex = idx + 2;
    const cellRef = `A${rowIndex}`;
    const typeCellRef = `B${rowIndex}`;

    const isStrictValid = isValidSo(row.so) && !row.isInvalidCustomer;
    const isBypass = isBypassSo(row.so) && !row.isInvalidCustomer;
    const finalSo = getCleanSo(row.so);

    const baseStyle = {
      border: {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' },
      },
      alignment: { vertical: 'center', horizontal: 'left' },
    };

    if (!ws[cellRef]) ws[cellRef] = { v: finalSo };
    if (!ws[typeCellRef]) ws[typeCellRef] = { v: '-' };

    if (isBypass) {
      const bypassStyle = {
        ...baseStyle,
        fill: { fgColor: { rgb: 'FFF2CC' } },
      };
      ws[cellRef].s = bypassStyle;
      ws[typeCellRef].s = {
        ...bypassStyle,
        alignment: { vertical: 'center', horizontal: 'center' },
      };
    } else if (!isStrictValid) {
      const errorStyle = {
        ...baseStyle,
        fill: { fgColor: { rgb: 'FFC7CE' } },
        font: { color: { rgb: '9C0006' }, bold: true },
      };

      ws[cellRef].s = errorStyle;
      ws[typeCellRef].s = {
        ...errorStyle,
        alignment: { vertical: 'center', horizontal: 'center' },
      };
      ws[cellRef].c = [{ a: 'System', t: t('delivery.tooltip.invalid_invoice'), h: true }];
    } else {
      ws[cellRef].s = baseStyle;
      ws[typeCellRef].s = {
        ...baseStyle,
        alignment: { vertical: 'center', horizontal: 'center' },
      };
    }
  });

  ws['!cols'] = [0, 1].map((colIndex) => {
    let maxLen = 0;
    for (let r = 0; r < wsData.length; r++) {
      const cellValue = wsData[r][colIndex];
      if (cellValue !== null && cellValue !== undefined) {
        maxLen = Math.max(maxLen, cellValue.toString().length);
      }
    }
    return { wch: Math.min(Math.max(maxLen + 3, 14), 50) };
  });

  return ws;
};

export const handleFullRouteTransDownload = async ({
  filteredVehicleRoutes,
  setIsDownloading,
  t,
  selectedDate,
  excludeSoList = [],
  isSplitMultitrip,
}) => {
  setIsDownloading(true);
  try {
    const dateForFilename = formatDateUniversal(selectedDate, 'DD.MM.YYYY');
    const locationName = getLocationName();
    const zip = new JSZip();
    const seenFileNames = new Set();
    let fileCount = 0;
    let lastFileBuffer = null;
    let lastFileName = '';

    for (const route of filteredVehicleRoutes) {
      const cleanName = sanitizeName(route.vehicleName || 'Vehicle');
      const seenSO = new Set();
      const segments = buildSegments(route.trips, isSplitMultitrip);
      const generatedSegments = [];

      segments.forEach((segmentTrips) => {
        const processedRows = [];
        segmentTrips.forEach((trip) => {
          if (trip.orderId && !isTripRedelivery(trip)) {
            const parsedCust = parseCustomerString(trip.visitName);
            const isCustomerInvalid = isEmpty(parsedCust?.id) || isEmpty(parsedCust?.location);
            const rawSOs = (parsedCust.invoiceNumber || trip.orderId)
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean);

            rawSOs.forEach((rawSo) => {
              const standardizedSo = standardizeSo(rawSo);
              if (!seenSO.has(standardizedSo)) {
                seenSO.add(standardizedSo);
                if (!excludeSoList.includes(standardizedSo) && !excludeSoList.includes(rawSo)) {
                  processedRows.push({ so: standardizedSo, isInvalidCustomer: isCustomerInvalid });
                }
              }
            });
          }
        });
        if (processedRows.length > 0) generatedSegments.push(processedRows);
      });

      generatedSegments.forEach((processedRows, idx) => {
        const isMulti = generatedSegments.length > 1;
        const baseName = isMulti ? `${cleanName} - ${idx + 1}` : cleanName;
        const nameFile = isMulti
          ? `${baseName}.xlsx`
          : getUniqueFileName(baseName, dateForFilename, '.xlsx', seenFileNames);

        const ws = buildSoWorksheet(processedRows, t);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, baseName.substring(0, 31));

        const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });

        if (isMulti && filteredVehicleRoutes.length > 1) {
          zip.folder(`${cleanName} - ${dateForFilename}`).file(nameFile, excelBuffer);
        } else {
          zip.file(nameFile, excelBuffer);
        }

        fileCount++;
        lastFileBuffer = excelBuffer;
        lastFileName = nameFile;
      });
    }

    if (fileCount > 1) {
      const content = await zip.generateAsync({ type: 'blob' });
      let zipName = `Route Transaction - ${dateForFilename} - ${locationName}.zip`;
      if (filteredVehicleRoutes.length === 1) {
        const singleName = sanitizeName(filteredVehicleRoutes[0].vehicleName || 'Vehicle');
        zipName = `${singleName} - ${dateForFilename}.zip`;
      }
      triggerDownload(content, zipName);
      toastSuccess(t('common.toast.success'));
    } else if (fileCount === 1) {
      const blob = new Blob([lastFileBuffer], { type: 'application/octet-stream' });
      triggerDownload(blob, lastFileName);
      toastSuccess(t('common.toast.success'));
    } else {
      toastError(t('common.toast.error', { err: 'Tidak ada data valid' }));
    }
  } catch (err) {
    toastError(t('common.toast.error', { err: err.message }));
  } finally {
    setIsDownloading(false);
  }
};

export const handlePartialRouteTransDownload = async ({
  routingResults,
  setIsDownloading,
  t,
  selectedDate,
  excludeSoList = [],
  isSplitMultitrip,
}) => {
  setIsDownloading(true);
  try {
    const dateForFilename = formatDateUniversal(selectedDate, 'DD.MM.YYYY');
    const locationName = getLocationName();

    if (abortIfNoRoutingResults(routingResults, t, setIsDownloading)) return;

    const sortedRoutingResults = sortRoutingResultsByCreatedTime(routingResults);

    const masterZip = new JSZip();
    let masterHasData = false;
    const globalSeenSOByVehicle = new Map();
    let routingIndex = 1;

    for (const routing of sortedRoutingResults) {
      const status = routing.status || routing.dispatchStatus || '';
      if (String(status).toLowerCase() !== 'done') continue;
      const routes = routing.result?.routing || [];
      if (routes.length === 0) continue;

      const cleanRoutingName = sanitizeName(routing.name || routing._id || 'Routing');
      const zipFolderName = `Routing ${routingIndex} (${cleanRoutingName})`;
      routingIndex++;

      const routingZip = new JSZip();
      let routingHasData = false;
      const seenFileNames = new Set();

      for (const route of routes) {
        const cleanName = sanitizeName(route.vehicleName || route.vehicleId || 'Vehicle');

        if (!globalSeenSOByVehicle.has(cleanName)) {
          globalSeenSOByVehicle.set(cleanName, new Set());
        }
        const vehicleSeenSOs = globalSeenSOByVehicle.get(cleanName);

        const seenSO = new Set();
        const segments = buildSegments(route.trips, isSplitMultitrip);
        const generatedSegments = [];

        segments.forEach((segmentTrips) => {
          const processedRows = [];
          segmentTrips.forEach((trip) => {
            if (!isTripRedelivery(trip)) {
              const parsedCust = parseCustomerString(trip.visitName);
              const isCustomerInvalid = isEmpty(parsedCust?.id) || isEmpty(parsedCust?.location);
              const rawInvoice = parsedCust.invoiceNumber || trip.orderId || '';

              if (!rawInvoice) return;

              const rawSOs = rawInvoice
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean);

              rawSOs.forEach((rawSo) => {
                const standardizedSo = standardizeSo(rawSo);

                if (!vehicleSeenSOs.has(standardizedSo)) {
                  vehicleSeenSOs.add(standardizedSo);

                  if (!seenSO.has(standardizedSo)) {
                    seenSO.add(standardizedSo);
                    if (!excludeSoList.includes(standardizedSo) && !excludeSoList.includes(rawSo)) {
                      processedRows.push({
                        so: standardizedSo,
                        isInvalidCustomer: isCustomerInvalid,
                      });
                    }
                  }
                }
              });
            }
          });

          if (processedRows.length > 0) generatedSegments.push(processedRows);
        });

        generatedSegments.forEach((processedRows, idx) => {
          const isMulti = generatedSegments.length > 1;
          const baseName = isMulti ? `${cleanName} - ${idx + 1}` : cleanName;
          const nameFile = isMulti
            ? `${baseName}.xlsx`
            : getUniqueFileName(baseName, dateForFilename, '.xlsx', seenFileNames);

          const ws = buildSoWorksheet(processedRows, t);
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, baseName.substring(0, 31));
          const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });

          if (isMulti) {
            routingZip.folder(`${cleanName} - ${dateForFilename}`).file(nameFile, excelBuffer);
          } else {
            routingZip.file(nameFile, excelBuffer);
          }

          routingHasData = true;
        });
      }

      if (routingHasData) {
        masterHasData = true;
        const routingZipBlob = await routingZip.generateAsync({ type: 'blob' });
        masterZip.file(`${zipFolderName}.zip`, routingZipBlob);
      }
    }

    if (!masterHasData) {
      toastError(t('common.toast.error', { err: 'Tidak ada transaksi valid untuk diunduh' }));
      setIsDownloading(false);
      return;
    }

    const masterContent = await masterZip.generateAsync({ type: 'blob' });
    triggerDownload(masterContent, `Route Transaction - ${dateForFilename} - ${locationName}.zip`);
    toastSuccess(t('common.toast.success'));
  } catch (err) {
    toastError(t('common.toast.error', { err: err.message }));
  } finally {
    setIsDownloading(false);
  }
};
