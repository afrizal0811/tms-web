import { getLocalStorage } from '@/lib/localStorageHandler';
import { toastError, toastInfo, toastSuccess, toastWarning } from '@/lib/toast';
import { formatDateUniversal, isDateSunday, isEmpty } from '@/lib/utils';
import JSZip from 'jszip';
import * as XLSX from 'xlsx-js-style';

export const getDatesInRange = (startDate, endDate) => {
  const dates = [];
  let currentDate = new Date(startDate);
  currentDate.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);
  while (currentDate <= end) {
    dates.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }
  return dates;
};

export const bulkDownloader = async ({
  startDate,
  endDate,
  driverData,
  zipPrefix,
  setIsLoading,
  processDateCallback,
  t,
}) => {
  if (!driverData || isEmpty(driverData)) {
    toastError(t('common.toast.error', { err: t('common.no_driver') }));
    return;
  }

  setIsLoading(true);
  toastInfo(t('report.toast.processing'));

  try {
    const originalStartDateString = formatDateUniversal(startDate, 'DD.MM.YYYY');
    const originalEndDateString = formatDateUniversal(endDate, 'DD.MM.YYYY');
    const {
      storedLocation: hubId,
      storedLocationName: hubName,
      storedLocationAcronym,
    } = getLocalStorage();
    const hubLabel = storedLocationAcronym || hubName;
    const datesToProcess = getDatesInRange(startDate, endDate);
    const zip = new JSZip();
    let filesGenerated = 0;
    let sundaysSkipped = 0;
    const skippedDates = [];

    for (const dateObj of datesToProcess) {
      const dateForFile = formatDateUniversal(dateObj);
      if (isDateSunday(dateForFile)) {
        sundaysSkipped++;
        continue;
      }
      try {
        const result = await processDateCallback({
          dateObj,
          dateForFile,
          hubId,
          hubName: hubLabel,
        });
        if (result?.error) {
          skippedDates.push(dateForFile);
          continue;
        }

        if (result?.wb || result?.excelFileName) {
          const { wb, excelFileName } = result;
          const excelUint8Array = XLSX.write(wb, {
            bookType: 'xlsx',
            type: 'array',
          });
          zip.file(excelFileName, excelUint8Array);
          filesGenerated++;
          continue;
        }

        skippedDates.push(dateForFile);
      } catch (err) {
        skippedDates.push(dateForFile);
        console.error(err);
      }
    }

    const totalSkipped = skippedDates.length + sundaysSkipped;
    const failedZipText = t('report.toast.failed_zip');
    const noDataText = t('common.no_data');
    const skipDateText = t('report.toast.skip_data', {
      skippedDates: skippedDates.length,
    });
    const skipSundayText = t('report.toast.skip_sunday', {
      sundaysSkipped,
    });

    if (filesGenerated === 0) {
      throw new Error(`${failedZipText}, ${noDataText.toLowerCase()}`);
    }

    if (totalSkipped > 0) {
      if (skippedDates.length > 0 && sundaysSkipped > 0) {
        toastWarning(`${skipDateText}, ${skipSundayText.toLowerCase()}`);
      } else if (skippedDates.length > 0) {
        toastWarning(skipDateText);
      } else if (sundaysSkipped > 0) {
        toastWarning(skipSundayText);
      }
    }

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(zipBlob);
    link.download = `${zipPrefix} - (${originalStartDateString} - ${originalEndDateString}) - ${hubLabel}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toastSuccess(t('common.toast.success'));
  } catch (e) {
    toastError(t('common.toast.error', { err: e.message }));
  } finally {
    setIsLoading(false);
  }
};

export async function validateRoutingFile(file) {
  try {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });

    const firstSheetName = workbook.SheetNames[0];
    const isSheetNameMatch = firstSheetName.toLowerCase() === 'summary';

    const worksheet = workbook.Sheets[firstSheetName];
    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

    let headerRowClean = [];
    let isCellsMatch = false;

    for (let i = 0; i < Math.min(15, rows.length); i++) {
      const rowStr = rows[i]
        .join('')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');

      if (rowStr.includes('vehicleoptimized') && rowStr.includes('totalvehicle')) {
        headerRowClean = rows[i].map((h) =>
          String(h || '')
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '')
        );
        break;
      }
    }

    if (headerRowClean.length > 0) {
      const requiredHeaders = [
        'vehicleoptimized',
        'totalvehicle',
        'vehiclepercentage',
        'visitoptimized',
        'totalvisit',
        'visitpercentage',
        'totaldistancem',
        'averagespeedkmh',
      ];
      isCellsMatch = requiredHeaders.every((req) => headerRowClean.includes(req));
    }

    return isSheetNameMatch || isCellsMatch;
  } catch (error) {
    return false;
  }
}

export async function validateTaskFile(file) {
  try {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

    let headerRowClean = [];
    let headerFound = false;

    for (let i = 0; i < Math.min(15, rows.length); i++) {
      const rowStr = rows[i]
        .join('')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
      if (rowStr.includes('assignedto') && rowStr.includes('statusdelivery')) {
        headerRowClean = rows[i].map((h) =>
          String(h || '')
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '')
        );
        headerFound = true;
        break;
      }
    }

    if (!headerFound) return false;

    const requiredHeaders = [
      'flow',
      'starttime',
      'assignedto',
      'assignedvehicle',
      'statusgr',
      'alasan',
      'customerorder',
      'typestorage',
      'statusdelivery',
      'gpssesuai',
    ];

    const isMatch = requiredHeaders.every((req) => headerRowClean.includes(req));
    return isMatch;
  } catch (error) {
    return false;
  }
}
