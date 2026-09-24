import { getLocalStorage } from '@/lib/localStorageHandler';
import { toastError, toastSuccess, toastWarning } from '@/lib/toast';
import { formatDateUniversal, isDateSunday, isEmpty } from '@/lib/utils';
import JSZip from 'jszip';
import * as XLSX from 'xlsx-js-style';

export const getPreviousRoutingDate = (dateInput) => {
  const d = new Date(dateInput);
  d.setDate(d.getDate() - (d.getDay() === 1 ? 2 : 1));
  return d;
};

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

export const bulkZipDownloader = async ({
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
        console.error(err);
        skippedDates.push(dateForFile);
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
    toastError(t('common.toast.error', { err: e.message }), e);
  } finally {
    setIsLoading(false);
  }
};

export const bulkExcelDownloader = async ({
  startDate,
  endDate,
  locationName,
  title,
  setIsLoading,
  fetchFilesCallback,
  t,
}) => {
  setIsLoading(true);
  try {
    const files = await fetchFilesCallback();
    if (!files || files.length === 0) throw new Error(t('common.no_data'));

    const wb = XLSX.utils.book_new();
    const sheetDataMap = {};
    const sheetColsMap = {};

    files.forEach((file) => {
      file.wb.SheetNames.forEach((sheetName) => {
        const sheet = file.wb.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        if (!sheetDataMap[sheetName]) {
          sheetDataMap[sheetName] = [...json];
          sheetColsMap[sheetName] = sheet['!cols'];
        } else {
          sheetDataMap[sheetName].push(...json.slice(1));
        }
      });
    });

    Object.keys(sheetDataMap).forEach((sheetName) => {
      const ws = XLSX.utils.aoa_to_sheet(sheetDataMap[sheetName]);
      ws['!cols'] = sheetColsMap[sheetName];

      if (ws['!ref']) {
        const range = XLSX.utils.decode_range(ws['!ref']);
        for (let C = 0; C <= range.e.c; ++C) {
          const cell = XLSX.utils.encode_cell({ r: 0, c: C });
          if (ws[cell]) {
            ws[cell].s = {
              font: { bold: true, color: { rgb: 'FFFFFF' } },
              fill: { patternType: 'solid', fgColor: { rgb: '0369A1' } },
              alignment: { horizontal: 'center', vertical: 'center' },
            };
          }
        }
      }
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    });

    const startStr = formatDateUniversal(startDate, 'DD.MM.YYYY');
    const endStr = formatDateUniversal(endDate || startDate, 'DD.MM.YYYY');
    const dateRangeStr = startStr !== endStr ? `${startStr} to ${endStr}` : startStr;
    const finalName = `${title} - ${dateRangeStr} - ${locationName}.xlsx`;

    XLSX.writeFile(wb, finalName);
    toastSuccess(t('common.toast.success'));
  } catch (err) {
    toastError(t('common.toast.error', { err: err.message }), err);
  } finally {
    setIsLoading(false);
  }
};
