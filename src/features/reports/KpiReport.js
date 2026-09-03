'use client';

import FileUploader from '@/components/fileUploader/FileUploader';
import Modal from '@/components/modal/Modal';
import Report from '@/components/page/Report';
import { useLanguage } from '@/context/LanguageContext';
import { handleKpiDownload } from '@/features/reports/helper/help';
import { getDriverData } from '@/lib/driverData';
import { getLocalStorage } from '@/lib/localStorageHandler';
import { toastError } from '@/lib/toast';
import { tomorrowDate } from '@/lib/utils';
import { useEffect, useState } from 'react';

export default function KpiReport() {
  const [isManualMode, setIsManualMode] = useState(false);
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [routingFiles, setRoutingFiles] = useState([]);
  const [taskFiles, setTaskFiles] = useState([]);
  const [singleDate, setSingleDate] = useState(new Date());
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [selectedHub, setSelectedHub] = useState({ id: '', name: '' });

  const { t, isIndonesian } = useLanguage();
  const isEmptyUploadedFile = routingFiles.length === 0 || taskFiles.length === 0;

  useEffect(() => {
    const { storedUser } = getLocalStorage();
    const userData = JSON.parse(storedUser);
    setSelectedHub({ id: userData.activeHubId, name: userData.activeHubAcronym });
  }, []);

  useEffect(() => {
    setRoutingFiles([]);
    setTaskFiles([]);
  }, [selectedHub]);

  const modeToggleConfig = {
    bulk: { current: isBulkMode, setCurrent: setIsBulkMode, others: [setIsManualMode] },
    manual: { current: isManualMode, setCurrent: setIsManualMode, others: [setIsBulkMode] },
  };

  const handleRadioToggle = (mode) => {
    if (loading) return;
    const config = modeToggleConfig[mode];
    if (!config) return;
    const nextState = !config.current;
    config.setCurrent(nextState);
    if (nextState) config.others.forEach((setOther) => setOther(false));
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

  const handleAction = () => {
    if (isManualMode) {
      setIsModalOpen(true);
    } else {
      handleFetchData();
    }
  };

  const manualText = isManualMode ? 'Manual' : '';
  const bulkText = isBulkMode ? t('common.bulk') : '';
  const prefixText = `${manualText} ${bulkText}`.trim();
  const titleMenu = isIndonesian
    ? `${t('report.kpi_report')} ${prefixText}`.trim()
    : `${prefixText} ${t('report.kpi_report')}`.trim();

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
      onToggleMode={handleRadioToggle}
      availableModes={['bulk', 'manual']}
      singleDate={singleDate}
      onSingleDateChange={setSingleDate}
      startDate={startDate}
      endDate={endDate}
      onDateRangeChange={handleDateRangeChange}
      maxDate={tomorrowDate()}
      isLoading={loading}
      onAction={handleAction}
      actionText={isManualMode ? t('common.upload') : t('common.download')}
      modals={
        <Modal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setRoutingFiles([]);
            setTaskFiles([]);
          }}
          title={t('common.upload')}
          maxWidth="max-w-7xl w-[95%]"
          footer={
            <button
              onClick={handleFetchData}
              disabled={isEmptyUploadedFile || loading}
              className={`w-full sm:w-auto min-w-[150px] ml-auto px-4 py-2 rounded-md font-medium text-white ${
                isEmptyUploadedFile || loading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-sky-600 hover:bg-sky-700'
              }`}
            >
              {loading ? '...' : t('common.download')}
            </button>
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
        </Modal>
      }
    />
  );
}
