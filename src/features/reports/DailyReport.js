'use client';

import CustomDatePicker from '@/components/CustomDatePicker';
import FileUploader from '@/components/fileUploader/FileUploader';
import Modal from '@/components/modal/Modal';
import Report from '@/components/page/Report';
import { useLanguage } from '@/context/LanguageContext';
import { formatDateUniversal, isDateSunday, isEmpty, tomorrowDate } from '@/lib/utils';
import { useState } from 'react';
import { handleBulkDownload, handleManualDownload, handleSingleDownload } from './helper/help';

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
  const [selectedRoutingFiles, setSelectedRoutingFiles] = useState([]);
  const [selectedDeliveryFiles, setSelectedDeliveryFiles] = useState([]);
  const initialDate = parseDate(formatDateUniversal(new Date()));
  const [isCustomRouting, setIsCustomRouting] = useState(false);
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [routingDate, setRoutingDate] = useState(() => calculateDefaultRoutingDate(initialDate));
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [startDate, setStartDate] = useState(initialDate);
  const [endDate, setEndDate] = useState(initialDate);

  const isEmptyUploadedFile = isEmpty(selectedRoutingFiles) || isEmpty(selectedDeliveryFiles);
  const selectedDateString = formatDateUniversal(selectedDate);
  const isDateInvalid = !isBulkMode && isDateSunday(selectedDateString);
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

  const handleAction = () => {
    if (isManualMode) {
      setIsModalOpen(true);
    } else if (isBulkMode) {
      triggerBulkDownload();
    } else {
      triggerSingleDownload();
    }
  };

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

  const manualText = isManualMode ? 'Manual' : '';
  const bulkText = isBulkMode ? t('common.bulk') : '';
  const prefixText = `${manualText} ${bulkText}`.trim();
  const titleMenu = isIndonesian
    ? `${t('report.daily_report')} ${prefixText}`.trim()
    : `${prefixText} ${t('report.daily_report')}`.trim();

  const handleSingleDateChange = (date) => {
    if (date) {
      setSelectedDate(date);
      setRoutingDate(calculateDefaultRoutingDate(date));
    }
  };

  const handleDateRangeChange = (dates) => {
    const [start, end] = dates;
    setStartDate(start);
    setEndDate(end);
  };

  return (
    <Report
      title={titleMenu}
      isBulkMode={isBulkMode}
      isManualMode={isManualMode}
      isCustomRouting={isCustomRouting}
      onToggleMode={handleRadioToggle}
      availableModes={['bulk', 'manual', 'custom']}
      singleDate={selectedDate}
      onSingleDateChange={handleSingleDateChange}
      startDate={startDate}
      endDate={endDate}
      onDateRangeChange={handleDateRangeChange}
      maxDate={tomorrowDate()}
      isLoading={disabledCommon}
      isActionDisabled={isDateInvalid}
      onAction={handleAction}
      actionText={isManualMode ? t('common.upload') : t('common.download')}
      showInfoDate={true}
      modals={
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
            <button
              onClick={triggerManualDownload}
              disabled={isEmptyUploadedFile || isLoading}
              className={`w-full sm:w-auto min-w-[150px] ml-auto px-4 py-2 rounded-md font-medium text-white ${
                isEmptyUploadedFile || isLoading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-sky-600 hover:bg-sky-700'
              }`}
            >
              {isLoading ? '...' : t('common.download')}
            </button>
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
      }
    >
      {isCustomRouting && !isManualMode && !isBulkMode && (
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
      )}
    </Report>
  );
}
