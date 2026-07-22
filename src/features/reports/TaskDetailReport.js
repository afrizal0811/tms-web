'use client';

import Button from '@/components/Button';
import CustomDatePicker from '@/components/CustomDatePicker';
import ConfirmModal from '@/components/modal/ConfirmModal';
import { useLanguage } from '@/context/LanguageContext';
import { getLocationHistories, getResult, getTasks } from '@/lib/api';
import { getDriverData } from '@/lib/driverData';
import { getCachedHubs, getLocalStorage } from '@/lib/localStorageHandler';
import {
  buildRoutingMap,
  buildSyncTimeMap,
  generateTaskDetailWorkbook,
  groupTasksByDriver,
} from '@/lib/reportGenerators/reports';
import { toastError, toastSuccess } from '@/lib/toast';
import {
  calculateStartFinishDates,
  formatDateUniversal,
  isEmpty,
  toApiDateString,
  tomorrowDate,
} from '@/lib/utils';
import JSZip from 'jszip';
import { useState } from 'react';
import * as XLSX from 'xlsx-js-style';
import { taskDetailHeaders, taskDetailKeyMapping } from './helper/constants';
import { getDatesInRange } from './helper/help';

const getReportDates = (start, end) => {
  const localStart = new Date(start);
  localStart.setHours(0, 0, 0, 0);

  const validEndDate = end ? new Date(end) : new Date(start);
  validEndDate.setHours(23, 59, 59, 999);

  const timeFromUtc = toApiDateString(localStart);
  const timeToUtc = toApiDateString(validEndDate);

  const startString = formatDateUniversal(localStart);
  const endString = formatDateUniversal(validEndDate);

  const { timeFrom: locTimeFrom } = calculateStartFinishDates(startString);
  const { timeTo: locTimeTo } = calculateStartFinishDates(endString);

  return { timeFromUtc, timeToUtc, locTimeFrom, locTimeTo, selectedDateString: startString };
};

export default function TaskDetailReport() {
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [isLoading, setIsLoading] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const { t } = useLanguage();

  const executeProcess = async () => {
    setIsLoading(true);
    setShowWarningModal(false);
    try {
      const { storedLocation, storedLocationName, storedLocationAcronym } = getLocalStorage();
      const driverData = await getDriverData(storedLocation);

      const hubsList = getCachedHubs() || [];
      const activeHub = hubsList.find((h) => h._id === storedLocation);
      const hubCoordsStr =
        activeHub?.lat && activeHub?.lng ? `${activeHub.lat},${activeHub.lng}` : null;

      const datesToProcess = getDatesInRange(startDate, endDate || startDate);
      const generatedFiles = [];

      for (const date of datesToProcess) {
        const { timeFromUtc, timeToUtc, locTimeFrom, locTimeTo, selectedDateString } =
          getReportDates(date, date);

        const [tasks, locHistories] = await Promise.all([
          getTasks({
            hubId: storedLocation,
            status: 'DONE,ONGOING',
            timeFrom: timeFromUtc,
            timeTo: timeToUtc,
            timeBy: 'startTime',
            limit: 1000,
          }),
          getLocationHistories({
            timeFrom: locTimeFrom,
            timeTo: locTimeTo,
            limit: 5000,
            startFinish: 'true',
            fields: 'finish,startTime,email,trackedTime,totalDistance',
            timeBy: 'createdTime',
          }),
        ]);

        const tasksData = !isEmpty(tasks) && Array.isArray(tasks) ? tasks : tasks?.data || [];
        if (isEmpty(tasksData)) continue;

        const uniqueRoutingIds = [
          ...new Set(tasksData.map((task) => task.routingResultId).filter(Boolean)),
        ];

        const routingResults = await Promise.all(uniqueRoutingIds.map((id) => getResult(id)));
        const routingMap = buildRoutingMap(routingResults);

        const timeMap = buildSyncTimeMap(locHistories, driverData, selectedDateString);
        const groupedData = groupTasksByDriver(tasksData);

        const wb = generateTaskDetailWorkbook(
          groupedData,
          timeMap,
          routingMap,
          hubCoordsStr,
          taskDetailHeaders,
          taskDetailKeyMapping
        );

        const dateStr = formatDateUniversal(date, 'DD.MM.YYYY');
        const locationName = storedLocationAcronym || storedLocationName;
        const fileName = `${t('report.task_detail_report')} - ${dateStr} - ${locationName}.xlsx`;

        const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });

        generatedFiles.push({ fileName, wb, wbout });
      }

      if (generatedFiles.length === 0) {
        throw new Error(t('common.no_data'));
      }

      if (generatedFiles.length === 1) {
        XLSX.writeFile(generatedFiles[0].wb, generatedFiles[0].fileName);
      } else {
        const zip = new JSZip();
        generatedFiles.forEach((file) => {
          zip.file(file.fileName, file.wbout);
        });

        const content = await zip.generateAsync({ type: 'blob' });
        const startFormat = formatDateUniversal(startDate, 'DD-MM-YYYY');
        const endFormat = endDate ? formatDateUniversal(endDate, 'DD.MM.YYYY') : startFormat;
        const fileNameDate =
          startFormat === endFormat ? startFormat : `${startFormat} to ${endFormat}`;
        const locationName = storedLocationAcronym || storedLocationName;

        const zipUrl = URL.createObjectURL(content);
        const link = document.createElement('a');
        link.href = zipUrl;
        link.download = `${t('report.task_detail_report')} - ${fileNameDate} - ${locationName}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(zipUrl);
      }

      toastSuccess(t('common.toast.success'));
    } catch (error) {
      toastError(t('common.toast.error', { err: error.message }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleProcess = () => {
    if (!startDate) {
      toastError('Silakan pilih tanggal terlebih dahulu.');
      return;
    }

    const validEndDate = endDate || startDate;

    const diffTime = Math.abs(validEndDate - startDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > 14) {
      setShowWarningModal(true);
    } else {
      executeProcess();
    }
  };

  const handleDateChange = (dates) => {
    const [start, end] = dates;
    if (isEmpty(start) && isEmpty(start)) {
      toastError(t('report.toast.select_date'));
      return;
    }
    setStartDate(start);
    setEndDate(end);
  };

  return (
    <div className="flex flex-col items-center w-full max-w-6xl p-4">
      <h1 className="text-3xl sm:text-4xl font-bold mb-8 text-center text-slate-900 dark:text-slate-100">
        {t('report.task_detail_report')}
      </h1>

      <div className="flex flex-col sm:flex-row justify-center items-center sm:items-start gap-6 sm:gap-12 mb-10 w-full">
        <div className="flex flex-col items-center w-full max-w-xs">
          <label
            htmlFor="detailDate"
            className="text-lg mb-2 text-gray-500 dark:text-slate-400 font-medium text-center select-none"
          >
            {t('common.range_delivery')}
          </label>
          <CustomDatePicker
            className="max-w-xs cursor-pointer"
            disabled={isLoading}
            id="detailDate"
            selectsRange
            startDate={startDate}
            endDate={endDate}
            onChange={handleDateChange}
            maxDate={tomorrowDate(true)}
          />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 w-full justify-center">
        <Button
          onClick={handleProcess}
          disabled={isLoading}
          isLoading={isLoading}
          text={t('common.download')}
          width="w-full sm:w-64"
        />
      </div>

      <ConfirmModal
        isOpen={showWarningModal}
        title={t('common.modal.data_load_title')}
        message={t('common.modal.data_load_message', { days: 14 })}
        onConfirm={executeProcess}
        onCancel={() => setShowWarningModal(false)}
      />
    </div>
  );
}
