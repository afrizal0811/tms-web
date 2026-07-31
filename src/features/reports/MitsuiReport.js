'use client';

import Button from '@/components/Button';
import CustomDatePicker from '@/components/CustomDatePicker';
import ConfirmModal from '@/components/modal/ConfirmModal';
import RadioCard from '@/components/RadioCard';
import { useLanguage } from '@/context/LanguageContext';
import { getLocalStorage } from '@/lib/localStorageHandler';
import { toastError, toastSuccess } from '@/lib/toast';
import { formatDateUniversal, isEmpty, tomorrowDate } from '@/lib/utils';
import JSZip from 'jszip';
import { useState } from 'react';
import * as XLSX from 'xlsx-js-style';
import { getDatesInRange, processManualTaskReport, processTaskRoutingReport } from './helper/help';

export default function MitsuiReport() {
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [reportType, setReportType] = useState('detail');
  const [isLoading, setIsLoading] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const { t } = useLanguage();

  const reportOptions = [
    {
      id: 'detail',
      label: t('report.task_routing'),
      tooltip: t('report.tooltip.task_routing_info'),
    },
    {
      id: 'manual',
      label: t('report.task_manual'),
      tooltip: t('report.tooltip.task_manual_info'),
    },
  ];

  const executeProcess = async () => {
    setIsLoading(true);
    setShowWarningModal(false);
    try {
      const { storedLocation, storedLocationName, storedLocationAcronym } = getLocalStorage();
      const datesToProcess = getDatesInRange(startDate, endDate || startDate);
      const locationName = storedLocationAcronym || storedLocationName;

      const generatedFiles =
        reportType === 'detail'
          ? await processTaskRoutingReport(storedLocation, datesToProcess, locationName, t)
          : await processManualTaskReport(storedLocation, datesToProcess, locationName, t);

      if (generatedFiles.length === 0) {
        throw new Error(t('common.no_data'));
      }

      const reportTitleName =
        reportType === 'detail' ? t('report.task_routing') : t('report.task_manual');

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

        const zipUrl = URL.createObjectURL(content);
        const link = document.createElement('a');
        link.href = zipUrl;
        link.download = `${reportTitleName} - ${fileNameDate} - ${locationName}.zip`;
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
        {t('report.mitsui_report')}
      </h1>

      <div className="flex justify-center mb-6 w-full">
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

      <div className="flex flex-col items-center mb-10 w-full">
        <span className="text-lg mb-3 text-gray-500 dark:text-slate-400 font-medium text-center select-none">
          {t('common.type')}
        </span>
        <RadioCard
          options={reportOptions}
          selected={reportType}
          onChange={setReportType}
          disabled={isLoading}
        />
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
