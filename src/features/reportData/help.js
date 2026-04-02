import { getLocalStorage } from '@/lib/localStorageHandler';
import { toastError, toastInfo, toastSuccess, toastWarning } from '@/lib/toastHelper';
import { formatDateUniversal, isDateSunday, isEmpty } from '@/lib/utils';
import JSZip from 'jszip';
import * as XLSX from 'xlsx-js-style';
/**
 * Helper untuk mendapatkan array tanggal di antara dua tanggal
 */
function getDatesInRange(startDate, endDate) {
  const dates = [];
  let currentDate = new Date(startDate);
  const stopDate = new Date(endDate);
  currentDate.setHours(12, 0, 0, 0);
  stopDate.setHours(12, 0, 0, 0);
  while (currentDate <= stopDate) {
    dates.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }
  return dates;
}

export const bulkDownloader = async ({
  startDate,
  endDate,
  driverData,
  reportType,
  zipPrefix,
  setIsLoading,
  setCurrentReport,
  processDateCallback,
  t,
}) => {
  let isRangeInvalid = false;
  if (!startDate || !endDate) {
    isRangeInvalid = true;
  } else if (startDate.getTime() === endDate.getTime()) {
    isRangeInvalid = true;
  } else if (startDate > endDate) {
    isRangeInvalid = true;
  }

  if (isRangeInvalid) {
    if (startDate && endDate && startDate.getTime() === endDate.getTime()) {
      toastError(t('report.toast.select_diff_date'));
    } else {
      toastError(t('common.invalid_date'));
    }
    return;
  }

  if (!driverData || isEmpty(driverData)) {
    toastError(t('report.toast.invalid_driver'));
    return;
  }

  setIsLoading(true);
  setCurrentReport(reportType);
  toastInfo(t('report.toast.processing'));

  try {
    const originalStartDateString = formatDateUniversal(startDate, 'DD.MM.YYYY');
    const originalEndDateString = formatDateUniversal(endDate, 'DD.MM.YYYY');
    const { storedLocation: hubId, storedLocationName: hubName } = getLocalStorage();

    if (!hubId) throw new Error('Data Hub tidak valid (ID Lokasi tidak ditemukan).');

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
          hubName,
        });

        if (result) {
          const { wb, excelFileName } = result;
          const excelUint8Array = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
          zip.file(excelFileName, excelUint8Array);
          filesGenerated++;
        } else {
          skippedDates.push(dateForFile);
        }
      } catch (err) {
        toastError(
          t('report.toast.failed_prossesing', { dateForFile: dateForFile, err: err.message })
        );
      }
    }

    if (filesGenerated === 0) {
      if (skippedDates.length > 0) {
        toastWarning(t('report.toast.no_data'));
      } else {
        toastError(t('report.toast.failed_zip', { zipPrefix: zipPrefix }));
      }
      return;
    }

    if (sundaysSkipped > 0 && isEmpty(skippedDates)) {
      toastWarning(t('report.toast.skip_sunday', { sundaysSkipped: sundaysSkipped }));
    } else if (sundaysSkipped > 0) {
      toastWarning(t('report.toast.skip_data', { skippedDates: skippedDates.length }));
    }

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(zipBlob);
    link.download = `${zipPrefix} ${originalStartDateString} - ${originalEndDateString}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toastSuccess(t('report.toast.success'));
  } catch (e) {
    toastError(e.message);
  } finally {
    setIsLoading(false);
    setCurrentReport(null);
  }
};
