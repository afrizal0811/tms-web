'use client';

import BaseModal from '@/components/BaseModal';
import Button from '@/components/Button';
import CustomDatePicker from '@/components/CustomDatePicker';
import Tooltip from '@/components/Tooltip';
import FileUploader from '@/components/fileUploader/FileUploader';
import { executeDownload } from '@/features/kpi/help';
import { getDriverData } from '@/lib/driverData';
import { getLocalStorage } from '@/lib/localStorageHandler';
import { toastError } from '@/lib/toast';
import { tomorrowDate } from '@/lib/utils';
import { useEffect, useRef, useState } from 'react';

export default function KpiPage() {
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

  const settingsRef = useRef(null);
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

  useEffect(() => {
    function handleClickOutside(event) {
      if (settingsRef.current && !settingsRef.current.contains(event.target)) {
        setIsSettingsOpen(false);
      }
    }
    if (isSettingsOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isSettingsOpen]);

  const handleFetchData = async () => {
    if (isManualMode && isEmptyUploadedFile) {
      return toastError('Silahkan upload file Data Routing dan Data Task!');
    }

    const drivers = await getDriverData(selectedHub.id);
    if (drivers.length === 0) {
      toastError('Data driver kosong, mohon pilih ulang lokasi.');
      return;
    }
    setLoading(true);
    try {
      await executeDownload({
        downloadMode: isBulkMode ? 'bulk' : 'single',
        singleDate,
        startDate,
        endDate,
        selectedHub,
        drivers,
        dataSource: isManualMode ? 'manual' : 'auto',
        routingFiles,
        taskFiles,
        setProgressText: () => {},
      });
      setIsModalOpen(false);
    } catch (error) {
      toastError(error.message || 'Gagal mengambil data.');
    } finally {
      setLoading(false);
    }
  };

  const informationComp = (tooltipContent) => (
    <Tooltip tooltipContent={tooltipContent}>
      <span className="flex items-center cursor-help">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          className="w-4 h-4 text-gray-400"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
      </span>
    </Tooltip>
  );

  return (
    <div className="flex flex-col items-center w-full max-w-6xl mx-auto p-4">
      <h1 className="text-3xl sm:text-4xl font-bold mb-8 text-center text-slate-900 dark:text-slate-100">
        {isManualMode ? 'Manual Laporan KPI' : 'Laporan KPI'}
      </h1>

      <div className="flex flex-col sm:flex-row justify-center items-center sm:items-start gap-6 sm:gap-12 w-full">
        {!isManualMode && (
          <div className="flex flex-col items-center w-full max-w-xs">
            <label className="text-lg mb-2 text-gray-500 dark:text-slate-400 font-medium text-center select-none flex items-center gap-1">
              {isBulkMode ? 'Rentang Tanggal' : 'Tanggal Pengiriman'}{' '}
              {informationComp('Pilih tanggal data KPI')}
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
                className="max-w-xs cursor-pointer"
                maxDate={tomorrowDate()}
              />
            ) : (
              <CustomDatePicker
                selected={singleDate}
                onChange={setSingleDate}
                disabled={loading}
                className="max-w-xs cursor-pointer"
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
          Pengaturan
        </button>
        {isSettingsOpen && (
          <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-64 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-md shadow-lg z-50 p-4 flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="bulkMode"
                disabled={loading || isManualMode}
                checked={isBulkMode}
                onChange={(e) => setIsBulkMode(e.target.checked)}
                className="w-4 h-4 text-sky-600 rounded border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 focus:ring-sky-500 disabled:opacity-50 cursor-pointer"
              />
              <label
                htmlFor="bulkMode"
                className={`text-sm select-none ${loading || isManualMode ? 'text-slate-400 dark:text-slate-500' : 'text-gray-600 dark:text-slate-300 cursor-pointer'}`}
              >
                Mode Bulk
              </label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="manualMode"
                disabled={loading}
                checked={isManualMode}
                onChange={(e) => {
                  setIsManualMode(e.target.checked);
                  if (e.target.checked) setIsBulkMode(false);
                }}
                className="w-4 h-4 text-sky-600 rounded border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 focus:ring-sky-500 cursor-pointer"
              />
              <label
                htmlFor="manualMode"
                className="text-sm text-gray-600 dark:text-slate-300 cursor-pointer select-none"
              >
                Manual
              </label>
              {informationComp('Gunakan file Excel')}
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-row flex-wrap gap-4 w-full justify-center">
        <Button
          onClick={isManualMode ? () => setIsModalOpen(true) : handleFetchData}
          disabled={loading}
          isLoading={loading}
          text={isManualMode ? 'Upload File' : 'Unduh'}
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
        title="Upload File KPI"
        maxWidth="max-w-7xl w-[95%]"
        footer={
          <Button
            text="Unduh"
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
    </div>
  );
}
