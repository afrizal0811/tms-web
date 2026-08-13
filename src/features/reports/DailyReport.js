'use client';

import Button from '@/components/Button';
import CustomDatePicker from '@/components/CustomDatePicker';
import Modal from '@/components/Modal';
import Tooltip from '@/components/Tooltip';
import FileUploader from '@/components/fileUploader/FileUploader';
import ConfirmModal from '@/components/modal/ConfirmModal';
import { useLanguage } from '@/context/LanguageContext';
import { formatDateUniversal, isDateSunday, isEmpty, tomorrowDate } from '@/lib/utils';
import { useEffect, useRef, useState } from 'react';
import { handleBulkDownload, handleManualDownload, handleSingleDownload } from './helper/help';
import Information from '@/components/Information';

const parseDate = (dateStr) => new Date(dateStr.replace(/-/g, '/'));

const calculateDefaultRoutingDate = (dateInput) => {
  const d = new Date(dateInput);
  d.setDate(d.getDate() - 1);
  if (d.getDay() === 0) d.setDate(d.getDate() - 1);
  return d;
};

export default function DailyReport({
  driverData,
  isAnyLoading,
  isMapping,
  selectedLocation,
  selectedLocationName,
  setIsAnyLoading,
  setIsMapping,
}) {
  const { t, isIndonesian } = useLanguage();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isManualMode, setIsManualMode] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedRoutingFiles, setSelectedRoutingFiles] = useState([]);
  const [selectedDeliveryFiles, setSelectedDeliveryFiles] = useState([]);
  const initialDate = parseDate(formatDateUniversal(new Date()));
  const [isCustomRouting, setIsCustomRouting] = useState(false);
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [routingDate, setRoutingDate] = useState(() => calculateDefaultRoutingDate(initialDate));
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [startDate, setStartDate] = useState(initialDate);
  const [endDate, setEndDate] = useState(initialDate);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);

  const settingsRef = useRef(null);
  const isEmptyUploadedFile = isEmpty(selectedRoutingFiles) || isEmpty(selectedDeliveryFiles);

  useEffect(() => {
    function handleClickOutside(event) {
      if (settingsRef.current && !settingsRef.current.contains(event.target)) {
        setIsSettingsOpen(false);
      }
    }
    if (isSettingsOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isSettingsOpen]);

  const selectedDateString = formatDateUniversal(selectedDate);
  const isDateInvalid = !isBulkMode && isDateSunday(selectedDateString);
  const isRangeInvalid =
    isBulkMode &&
    (!startDate || !endDate || startDate > endDate || startDate.getTime() === endDate.getTime());
  const disabledCommon = isAnyLoading || isMapping || isLoading;

  const triggerSingleDownload = () =>
    handleSingleDownload({
      selectedLocation,
      selectedLocationName,
      selectedDate,
      selectedDateString,
      isCustomRouting,
      routingDate,
      driverData,
      setIsLoading,
      setIsAnyLoading,
      setIsMapping,
      t,
    });

  const triggerBulkDownload = () =>
    handleBulkDownload({
      selectedLocation,
      startDate,
      endDate,
      driverData,
      setIsLoading,
      t,
    });

  const triggerManualDownload = () =>
    handleManualDownload({
      selectedLocation,
      selectedLocationName,
      selectedDate,
      selectedDateString,
      isCustomRouting,
      routingDate,
      selectedRoutingFiles,
      selectedDeliveryFiles,
      driverData,
      setIsLoading,
      setIsModalOpen,
      setSelectedRoutingFiles,
      setSelectedDeliveryFiles,
      t,
    });

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

  const MainDatePicker = (
    <div className="flex flex-col items-center w-full sm:w-[280px]">
      <label
        htmlFor="shippingDate"
        className="text-lg mb-2 text-gray-500 dark:text-slate-400 font-medium text-center select-none flex items-center justify-center gap-1 w-full"
      >
        {isBulkMode ? t('common.range_delivery') : t('common.delivery_date')}
        {!isCustomRouting && <Information infoText={t('report.tooltip.info_delivery')} />}
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
          disabled={disabledCommon}
          className="w-full sm:w-[280px] block cursor-pointer"
          wrapperClassName="w-full block"
          maxDate={tomorrowDate()}
        />
      ) : (
        <CustomDatePicker
          disabled={disabledCommon}
          id="shippingDate"
          maxDate={tomorrowDate()}
          onChange={(date) => {
            if (date) {
              setSelectedDate(date);
              setRoutingDate(calculateDefaultRoutingDate(date));
            }
          }}
          selected={selectedDate}
          className="w-full sm:w-[280px] block cursor-pointer"
          wrapperClassName="w-full block"
        />
      )}
    </div>
  );

  const SecondaryDatePicker = (
    <div className="flex flex-col items-center w-full sm:w-[280px] transition-opacity duration-300">
      <label
        htmlFor="routingDate"
        className="block text-lg mb-2 text-gray-500 dark:text-slate-400 font-medium text-center w-full"
      >
        {t('common.routing_date')}
      </label>
      <CustomDatePicker
        disabled={disabledCommon}
        id="routingDate"
        maxDate={selectedDate}
        onChange={(date) => {
          if (date) setRoutingDate(date);
        }}
        selected={routingDate}
        className="w-full sm:w-[280px] block cursor-pointer"
        wrapperClassName="w-full block"
      />
    </div>
  );

  const modeToggleConfig = {
    bulk: {
      current: isBulkMode,
      setCurrent: setIsBulkMode,
      others: [setIsManualMode, setIsCustomRouting],
    },
    manual: {
      current: isManualMode,
      setCurrent: setIsManualMode,
      others: [setIsBulkMode, setIsCustomRouting],
    },
    custom: {
      current: isCustomRouting,
      setCurrent: setIsCustomRouting,
      others: [setIsBulkMode, setIsManualMode],
    },
  };

  const handleRadioToggle = (mode) => {
    if (disabledCommon) return;
    const config = modeToggleConfig[mode];
    if (!config) return;
    const nextState = !config.current;
    config.setCurrent(nextState);
    if (nextState) config.others.forEach((setOther) => setOther(false));
  };

  const SettingButton = (
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
              disabledCommon
                ? 'cursor-not-allowed text-slate-400 dark:text-slate-500'
                : 'cursor-pointer text-gray-600 dark:text-slate-300'
            }`}
          >
            <input
              type="radio"
              name="reportMode"
              checked={isBulkMode}
              readOnly
              disabled={disabledCommon}
              className="w-4 h-4 text-sky-600 border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 focus:ring-sky-500 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed pointer-events-none"
            />
            <span className="text-sm select-none w-full">{t('common.bulk')}</span>
          </div>
          <div
            onClick={() => handleRadioToggle('manual')}
            className={`flex items-center gap-2 ${
              disabledCommon
                ? 'cursor-not-allowed text-slate-400 dark:text-slate-500'
                : 'cursor-pointer text-gray-600 dark:text-slate-300'
            }`}
          >
            <input
              type="radio"
              name="reportMode"
              checked={isManualMode}
              readOnly
              disabled={disabledCommon}
              className="w-4 h-4 text-sky-600 border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 focus:ring-sky-500 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed pointer-events-none"
            />
            <span className="text-sm select-none w-full">Manual</span>
          </div>
          <div
            onClick={() => handleRadioToggle('custom')}
            className={`flex items-center justify-between ${
              disabledCommon
                ? 'cursor-not-allowed text-slate-400 dark:text-slate-500'
                : 'cursor-pointer text-gray-600 dark:text-slate-300'
            }`}
          >
            <div className="flex items-center gap-2 w-full">
              <input
                type="radio"
                name="reportMode"
                checked={isCustomRouting}
                readOnly
                disabled={disabledCommon}
                className="w-4 h-4 text-sky-600 border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 focus:ring-sky-500 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed pointer-events-none"
              />
              <span className="text-sm select-none w-full">{t('report.change_date')}</span>
            </div>
            <Information infoText={t('report.tooltip.info_change_time')} />
          </div>
        </div>
      )}
    </div>
  );

  const manualText = isManualMode ? 'Manual' : '';
  const bulkText = isBulkMode ? t('common.bulk') : '';
  const prefixText = `${manualText} ${bulkText}`.trim();
  const titleMenu = isIndonesian
    ? `${t('report.daily_report')} ${prefixText}`.trim()
    : `${prefixText} ${t('report.daily_report')}`.trim();

  return (
    <div className="flex flex-col items-center w-full max-w-6xl p-4">
      <h1 className="text-3xl sm:text-4xl font-bold mb-8 text-center text-slate-900 dark:text-slate-100">
        {titleMenu}
      </h1>

      <div className="flex flex-col sm:flex-row justify-center items-center sm:items-start gap-6 sm:gap-12 w-full">
        {!isManualMode && MainDatePicker}
        {isCustomRouting && !isManualMode && !isBulkMode && SecondaryDatePicker}
      </div>
      {SettingButton}

      <div className="flex flex-row flex-wrap gap-4 w-full justify-center">
        <Button
          key="download"
          onClick={() => {
            if (isManualMode) {
              setIsModalOpen(true);
            } else if (isBulkMode) {
              executeWithCheck(triggerBulkDownload);
            } else {
              triggerSingleDownload();
            }
          }}
          disabled={disabledCommon || isDateInvalid || isRangeInvalid}
          isLoading={isLoading}
          text={isManualMode ? t('common.upload') : t('common.download')}
          width="w-full sm:w-auto min-w-[200px]"
        />
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedRoutingFiles([]);
          setSelectedDeliveryFiles([]);
        }}
        title={t('common.upload')}
        maxWidth="max-w-7xl w-[95%]"
        footer={
          <Button
            text={t('common.download')}
            onClick={triggerManualDownload}
            isLoading={isLoading}
            disabled={isEmptyUploadedFile || isLoading}
            width="w-full sm:w-auto min-w-[150px] ml-auto"
          />
        }
      >
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative p-2">
            <FileUploader
              labelKey="routing"
              files={selectedRoutingFiles}
              onUpdateFiles={setSelectedRoutingFiles}
              inputId="routing-file-input"
              tutorialKey="routing"
            />
            <div className="hidden md:block absolute top-0 bottom-0 left-1/2 border-l border-dashed border-slate-300 dark:border-slate-700 -translate-x-1/2" />
            <FileUploader
              labelKey="delivery"
              files={selectedDeliveryFiles}
              onUpdateFiles={setSelectedDeliveryFiles}
              inputId="delivery-file-input"
              tutorialKey="delivery"
            />
          </div>
        </div>
      </Modal>

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
