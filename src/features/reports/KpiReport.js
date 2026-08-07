'use client';

import BaseModal from '@/components/BaseModal';
import Button from '@/components/Button';
import CustomDatePicker from '@/components/CustomDatePicker';
import FileUploader from '@/components/fileUploader/FileUploader';
import ConfirmModal from '@/components/modal/ConfirmModal';
import { useLanguage } from '@/context/LanguageContext';
import { handleKpiDownload } from '@/features/reports/helper/help';
import { getDriverData } from '@/lib/driverData';
import { getLocalStorage } from '@/lib/localStorageHandler';
import { toastError } from '@/lib/toast';
import { tomorrowDate } from '@/lib/utils';
import { useEffect, useRef, useState } from 'react';

export default function KpiReport() {
  const [isManualMode, setIsManualMode] = useState(false);
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [routingFiles, setRoutingFiles] = useState([]);
  const [taskFiles, setTaskFiles] = useState([]);
  const [singleDate, setSingleDate] = useState(new Date());
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [selectedHub, setSelectedHub] = useState({ id: '', name: '' });
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);

  const { t, isIndonesian } = useLanguage();
  const settingsRef = useRef(null);
  const isEmptyUploadedFile = routingFiles.length === 0 || taskFiles.length === 0;

  const isRangeInvalid =
    isBulkMode &&
    (!startDate || !endDate || startDate > endDate || startDate.getTime() === endDate.getTime());

  useEffect(() => {
    const { storedUser } = getLocalStorage();
    const userData = JSON.parse(storedUser);
    setSelectedHub({ id: userData.activeHubId, name: userData.activeHubAcronym });
  }, []);

  useEffect(() => {
    setRoutingFiles([]);
    setTaskFiles([]);
  }, [selectedHub]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (settingsRef.current && !settingsRef.current.contains(event.target)) {
        setIsSettingsOpen(false);
      }
    }
    if (isSettingsOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isSettingsOpen]);

  const handleRadioToggle = (mode) => {
    if (loading) return;

    if (mode === 'bulk') {
      const nextState = !isBulkMode;
      setIsBulkMode(nextState);
      if (nextState) setIsManualMode(false);
    } else if (mode === 'manual') {
      const nextState = !isManualMode;
      setIsManualMode(nextState);
      if (nextState) setIsBulkMode(false);
    }
  };

  const handleFetchData = async () => {
    const drivers = await getDriverData(selectedHub.id);
    if (drivers.length === 0) {
      toastError(t('common.no_driver'));
      return;
    }
    setLoading(true);
    try {
      await handleKpiDownload({
        downloadMode: isBulkMode ? 'bulk' : 'single',
        singleDate,
        startDate,
        endDate,
        selectedHub,
        drivers,
        dataSource: isManualMode ? 'manual' : 'auto',
        routingFiles,
        taskFiles,
      });
      setIsModalOpen(false);
    } catch (error) {
      toastError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const executeWithCheck = (actionFn) => {
    if (isBulkMode) {
      const validEndDate = endDate || startDate;
      const diffTime = Math.abs(validEndDate - startDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays > 14) {
        setPendingAction(() => actionFn);
        setShowWarningModal(true);
        return;
      }
    }
    actionFn();
  };

  const handleConfirmProcess = () => {
    setShowWarningModal(false);
    if (pendingAction) {
      pendingAction();
      setPendingAction(null);
    }
  };

  const handleCancelProcess = () => {
    setShowWarningModal(false);
    setPendingAction(null);
  };

  const manualText = isManualMode ? 'Manual' : '';
  const bulkText = isBulkMode ? t('common.bulk') : '';
  const prefixText = `${manualText} ${bulkText}`.trim();
  const titleMenu = isIndonesian
    ? `${t('report.kpi_report')} ${prefixText}`.trim()
    : `${prefixText} ${t('report.kpi_report')}`.trim();

  return (
    <div className="flex flex-col items-center w-full max-w-6xl mx-auto p-4">
      <h1 className="text-3xl sm:text-4xl font-bold mb-8 text-center text-slate-900 dark:text-slate-100">
        {titleMenu}
      </h1>

      <div className="flex flex-col sm:flex-row justify-center items-center sm:items-start gap-6 sm:gap-12 w-full">
        {!isManualMode && (
          <div className="flex flex-col items-center w-full max-w-xs">
            <label className="text-lg mb-2 text-gray-500 dark:text-slate-400 font-medium text-center select-none flex items-center gap-1">
              {isBulkMode ? t('common.range_delivery') : t('common.delivery_date')}
            </label>
            {isBulkMode ? (
              <CustomDatePicker
                selectsRange={true}
                startDate={startDate}
                endDate={endDate}
                onChange={(dates) => {
                  const [start, end] = dates;
                  setStartDate(start);
                  setEndDate(end);
                }}
                disabled={loading}
                className="w-full sm:w-[320px] block cursor-pointer"
                wrapperClassName="w-full block"
                maxDate={tomorrowDate()}
              />
            ) : (
              <CustomDatePicker
                selected={singleDate}
                onChange={setSingleDate}
                disabled={loading}
                className="w-full sm:w-[320px] block cursor-pointer"
                wrapperClassName="w-full block"
                maxDate={tomorrowDate()}
              />
            )}
          </div>
        )}
      </div>

      <div className="relative mt-2 mb-4" ref={settingsRef}>
        <button
          onClick={() => setIsSettingsOpen(!isSettingsOpen)}
          className="text-sm text-sky-600 dark:text-sky-400 font-medium hover:underline focus:outline-none cursor-pointer"
        >
          {t('setting.title')}
        </button>
        {isSettingsOpen && (
          <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-64 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-md shadow-lg z-50 p-4 flex flex-col gap-4">
            <div
              onClick={() => handleRadioToggle('bulk')}
              className={`flex items-center gap-2 ${
                loading
                  ? 'cursor-not-allowed text-slate-400 dark:text-slate-500'
                  : 'cursor-pointer text-gray-600 dark:text-slate-300'
              }`}
            >
              <input
                type="radio"
                name="kpiMode"
                checked={isBulkMode}
                readOnly
                disabled={loading}
                className="w-4 h-4 text-sky-600 border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 focus:ring-sky-500 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed pointer-events-none"
              />
              <span className="text-sm select-none w-full">{t('common.bulk')}</span>
            </div>

            <div
              onClick={() => handleRadioToggle('manual')}
              className={`flex items-center justify-between ${
                loading
                  ? 'cursor-not-allowed text-slate-400 dark:text-slate-500'
                  : 'cursor-pointer text-gray-600 dark:text-slate-300'
              }`}
            >
              <div className="flex items-center gap-2 w-full">
                <input
                  type="radio"
                  name="kpiMode"
                  checked={isManualMode}
                  readOnly
                  disabled={loading}
                  className="w-4 h-4 text-sky-600 border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 focus:ring-sky-500 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed pointer-events-none"
                />
                <span className="text-sm select-none w-full">Manual</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-row flex-wrap gap-4 w-full justify-center">
        <Button
          onClick={
            isManualMode ? () => setIsModalOpen(true) : () => executeWithCheck(handleFetchData)
          }
          disabled={loading || isRangeInvalid}
          isLoading={loading}
          text={isManualMode ? t('common.upload') : t('common.download')}
          width="w-full sm:w-auto min-w-[200px]"
        />
      </div>

      <BaseModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setRoutingFiles([]);
          setTaskFiles([]);
        }}
        title={t('common.upload')}
        maxWidth="max-w-7xl w-[95%]"
        footer={
          <Button
            text={t('common.download')}
            onClick={handleFetchData}
            isLoading={loading}
            disabled={isEmptyUploadedFile || loading}
            width="w-full sm:w-auto min-w-[150px] ml-auto"
          />
        }
      >
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative p-2">
            <FileUploader
              labelKey="routing"
              files={routingFiles}
              onUpdateFiles={setRoutingFiles}
              inputId="routing-file-input"
              tutorialKey="routing"
            />
            <div className="hidden md:block absolute top-0 bottom-0 left-1/2 border-l border-dashed border-slate-300 dark:border-slate-700 -translate-x-1/2" />
            <FileUploader
              labelKey="task"
              files={taskFiles}
              onUpdateFiles={setTaskFiles}
              inputId="task-file-input"
              tutorialKey="delivery"
            />
          </div>
        </div>
      </BaseModal>
      <ConfirmModal
        isOpen={showWarningModal}
        title={t('common.modal.data_load_title')}
        message={t('common.modal.data_load_message', { days: 14 })}
        onConfirm={handleConfirmProcess}
        onCancel={handleCancelProcess}
      />
    </div>
  );
}
