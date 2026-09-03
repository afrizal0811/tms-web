'use client';

import RadioButton from '@/components/button/RadioButton';
import Report from '@/components/page/Report';
import { useLanguage } from '@/context/LanguageContext';
import { getLocalStorage } from '@/lib/localStorageHandler';
import { toastError, toastSuccess } from '@/lib/toast';
import { formatDateUniversal, tomorrowDate } from '@/lib/utils';
import JSZip from 'jszip';
import { useState } from 'react';
import * as XLSX from 'xlsx-js-style';
import {
  getDatesInRange,
  processTaskDateReport,
  processTaskManualReport,
  processTaskRoutingReport,
} from './helper/help';

export default function CustomReport() {
  const [singleDate, setSingleDate] = useState(new Date());
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [reportType, setReportType] = useState('detail');
  const [isLoading, setIsLoading] = useState(false);

  const { t, isIndonesian } = useLanguage();

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
    {
      id: 'task_date',
      label: t('report.task_date'),
      tooltip: t('report.tooltip.task_date_info'),
    },
  ];

  const handleRadioToggle = (mode) => {
    if (isLoading) return;
    if (mode === 'bulk') setIsBulkMode(!isBulkMode);
  };

  const executeProcess = async () => {
    setIsLoading(true);
    try {
      const { storedLocation, storedLocationName, storedLocationAcronym } = getLocalStorage();
      const datesToProcess = isBulkMode
        ? getDatesInRange(startDate, endDate || startDate)
        : [singleDate];
      const locationName = storedLocationAcronym || storedLocationName;

      let generatedFiles = [];
      let reportTitleName = '';

      const reportTypeConfig = {
        detail: { process: processTaskRoutingReport, title: t('report.task_routing') },
        manual: { process: processTaskManualReport, title: t('report.task_manual') },
        task_date: { process: processTaskDateReport, title: t('report.task_date') },
      };

      const config = reportTypeConfig[reportType];
      if (config) {
        generatedFiles = await config.process(storedLocation, datesToProcess, locationName, t);
        reportTitleName = config.title;
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

        const startFormat = isBulkMode
          ? formatDateUniversal(startDate, 'DD.MM.YYYY')
          : formatDateUniversal(singleDate, 'DD.MM.YYYY');
        const endFormat =
          isBulkMode && endDate ? formatDateUniversal(endDate, 'DD.MM.YYYY') : startFormat;
        const fileNameDate =
          isBulkMode && startFormat !== endFormat ? `${startFormat} to ${endFormat}` : startFormat;

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

  const handleDateRangeChange = (dates) => {
    const [start, end] = dates;
    setStartDate(start);
    setEndDate(end);
  };

  const bulkText = isBulkMode ? t('common.bulk') : '';
  const titleMenu = isIndonesian
    ? `${t('report.custom_report')} ${bulkText}`.trim()
    : `${bulkText} ${t('report.custom_report')}`.trim();

  return (
    <Report
      title={titleMenu}
      isBulkMode={isBulkMode}
      onToggleMode={handleRadioToggle}
      availableModes={['bulk']}
      singleDate={singleDate}
      onSingleDateChange={setSingleDate}
      startDate={startDate}
      endDate={endDate}
      onDateRangeChange={handleDateRangeChange}
      maxDate={tomorrowDate(true)}
      isLoading={isLoading}
      onAction={executeProcess}
      actionText={t('common.download')}
      extraContent={
        <div className="flex flex-col items-center mb-10 w-full">
          <span className="text-lg mb-3 text-gray-500 dark:text-slate-400 font-medium text-center select-none">
            {t('common.type')}
          </span>
          <RadioButton
            options={reportOptions}
            selected={reportType}
            onChange={setReportType}
            disabled={isLoading}
          />
        </div>
      }
    />
  );
}
