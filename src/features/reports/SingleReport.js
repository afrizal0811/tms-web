'use client';

import Accordion from '@/components/Accordion';
import BaseModal from '@/components/BaseModal';
import Button from '@/components/Button';
import Carousel from '@/components/Carousel';
import CustomDatePicker from '@/components/CustomDatePicker';
import FileUploader from '@/components/FileUploader';
import Tooltip from '@/components/Tooltip';
import { useLanguage } from '@/context/LanguageContext';
import {
  getHubs,
  getLocationHistories,
  getResultsSummary,
  getTasks,
  getVehicleMappings,
  getVehicleTypes,
} from '@/lib/api';
import { getOrFetchDriverData } from '@/lib/driverDataHelper';
import { getLocalStorage } from '@/lib/localStorageHandler';
import {
  generateManualDeliveryWorkbook,
  generateManualRoutingWorkbook,
  generateTimeSummaryWorkbook,
} from '@/lib/reportGenerators';
import { generateAutoReportWorkbook } from '@/lib/reportGenerators/reports/AutoReport';
import { generateManualReportWorkbook } from '@/lib/reportGenerators/reports/ManualReport';
import { toastError, toastSuccess } from '@/lib/toast';
import {
  calculateStartFinishDates,
  formatDateUniversal,
  isDateSunday,
  isEmpty,
  tomorrowDate,
} from '@/lib/utils';
import { useEffect, useRef, useState } from 'react';
import * as XLSX from 'xlsx-js-style';
import { getTutorialData } from './helper/constants';
import { getDeliveryDate, validateRoutingFile, validateTaskFile } from './helper/help';

const parseDate = (dateStr) => new Date(dateStr.replace(/-/g, '/'));

export default function SingleReport({
  driverData,
  isAnyLoading,
  isMapping,
  selectedLocation,
  selectedLocationName,
  setIsAnyLoading,
  setIsMapping,
}) {
  const { t } = useLanguage();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isManualProcessing, setIsManualProcessing] = useState(false);
  const [reportType, setReportType] = useState('');
  const [isManualMode, setIsManualMode] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [selectedRoutingFiles, setSelectedRoutingFiles] = useState([]);
  const [selectedDeliveryFiles, setSelectedDeliveryFiles] = useState([]);
  const initialDate = parseDate(formatDateUniversal(new Date()));
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [isCustomRouting, setIsCustomRouting] = useState(false);
  const [routingDate, setRoutingDate] = useState(() => {
    const d = new Date(initialDate);
    d.setDate(d.getDate() - 1);
    if (d.getDay() === 0) d.setDate(d.getDate() - 1);
    return d;
  });
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

  useEffect(() => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    if (d.getDay() === 0) d.setDate(d.getDate() - 1);
    setRoutingDate(d);
  }, [selectedDate]);

  const [currentRunning, setCurrentRunning] = useState(null);

  const selectedDateString = formatDateUniversal(selectedDate);
  const isDateInvalid = isDateSunday(selectedDateString);

  const disabledCommon = isAnyLoading || isMapping;
  const driversCheck = async () => {
    const drivers = await getOrFetchDriverData(selectedLocation);
    if (isEmpty(drivers)) {
      throw new Error(t('common.toast.error', { err: t('common.no_driver') }));
    }
  };

  const handleTime = async () => {
    try {
      await driversCheck();
      if (setIsAnyLoading) setIsAnyLoading(true);
      setCurrentRunning('time');

      if (!selectedDateString) throw new Error(t('common.invalid_date'));

      const { timeFrom, timeTo } = calculateStartFinishDates(selectedDateString);
      const { storedLocationAcronym } = getLocalStorage();

      const [response] = await Promise.all([
        getLocationHistories({
          timeFrom,
          timeTo,
          limit: 5000,
          startFinish: 'true',
          fields: 'finish,startTime,email,trackedTime,totalDistance',
          timeBy: 'createdTime',
        }),
      ]);

      const allApiData = response?.tasks?.data || [];

      if (!Array.isArray(allApiData) || isEmpty(allApiData)) {
        throw new Error(t('report.toast.no_time'));
      }

      const hubLabel = storedLocationAcronym || selectedLocationName;

      const { wb, excelFileName, error } = generateTimeSummaryWorkbook(
        driverData,
        allApiData,
        selectedDateString,
        hubLabel,
        t
      );

      if (error) {
        throw new Error(error);
      }

      XLSX.writeFile(wb, excelFileName);
      toastSuccess(t('common.toast.success'));
    } catch (err) {
      toastError(err.message || String(err));
    } finally {
      setCurrentRunning(null);
      if (setIsAnyLoading) setIsAnyLoading(false);
    }
  };

  const handleCombined = async () => {
    try {
      await driversCheck();
      if (setIsAnyLoading) setIsAnyLoading(true);
      setCurrentRunning('combined');
      if (setIsMapping) setIsMapping(false);

      if (!selectedDateString) throw new Error(t('common.invalid_date'));

      const timeFromTasks = new Date(`${selectedDateString}T00:00:00`).toISOString();
      const timeToTasks = new Date(`${selectedDateString}T23:59:59`).toISOString();

      const { timeFrom: timeFromHistories, timeTo: timeToHistories } =
        calculateStartFinishDates(selectedDateString);

      let targetRoutingDateObj;
      if (isCustomRouting) {
        if (!routingDate) throw new Error(t('common.invalid_date'));
        targetRoutingDateObj = new Date(routingDate);
      } else {
        targetRoutingDateObj = new Date(selectedDate);
        targetRoutingDateObj.setDate(targetRoutingDateObj.getDate() - 1);
        if (targetRoutingDateObj.getDay() === 0)
          targetRoutingDateObj.setDate(targetRoutingDateObj.getDate() - 1);
      }

      const targetRoutingStr = formatDateUniversal(targetRoutingDateObj);
      const { storedLocationAcronym } = getLocalStorage();

      const summaryPayload = isCustomRouting
        ? {
            dateFrom: `${targetRoutingStr} 00:00:00`,
            dateTo: `${targetRoutingStr} 23:59:59`,
            limit: 1000,
            hubId: selectedLocation,
          }
        : {
            routingDateObj: targetRoutingDateObj,
            deliveryDateObj: selectedDate,
            limit: 1000,
            hubId: selectedLocation,
          };

      const [
        allTasks,
        filteredResults,
        hubsData,
        locationHistoriesRes,
        vehicleTypesObj,
        mappingsDB,
      ] = await Promise.all([
        getTasks({
          hubId: selectedLocation,
          status: 'DONE,ONGOING',
          timeFrom: timeFromTasks,
          timeTo: timeToTasks,
          timeBy: 'startTime',
          limit: 5000,
        }),
        getResultsSummary(summaryPayload),
        getHubs(),
        getLocationHistories({
          timeFrom: timeFromHistories,
          timeTo: timeToHistories,
          limit: 5000,
          startFinish: 'true',
          fields: 'finish,startTime,email,trackedTime,totalDistance',
          timeBy: 'createdTime',
        }),
        getVehicleTypes(),
        getVehicleMappings(),
      ]);

      const allApiData = locationHistoriesRes?.tasks?.data || [];

      if (isEmpty(filteredResults) && isEmpty(allTasks) && isEmpty(allApiData)) {
        throw new Error(t('common.toast.error', { err: t('common.no_data') }));
      }

      const vehicleTypes = vehicleTypesObj.map((v) => v.name);
      const mappingsObj = mappingsDB.reduce((acc, curr) => {
        acc[curr.plat] = curr.mappedType;
        return acc;
      }, {});

      const activeHub = (hubsData || []).find(
        (h) => String(h._id || h.id) === String(selectedLocation)
      );
      const hasPendingGR = activeHub ? activeHub.hasPendingGR : false;
      const hubLabel = storedLocationAcronym || selectedLocationName;

      const { wb, excelFileName } = await generateAutoReportWorkbook({
        driverData,
        filteredResults,
        allTasks,
        allApiData,
        mappingsObj,
        vehicleTypes,
        targetRoutingStr,
        selectedDateString,
        hubLabel,
        hasPendingGR,
        t,
      });

      XLSX.writeFile(wb, excelFileName);
      toastSuccess(t('common.toast.success'));
    } catch (err) {
      toastError(err.message || String(err));
    } finally {
      setCurrentRunning(null);
      if (setIsAnyLoading) setIsAnyLoading(false);
      if (setIsMapping) setIsMapping(false);
    }
  };

  const handleManualDownload = async () => {
    if (isEmptyUploadedFile && reportType === 'combined') {
      toastError(t('common.toast.error', { err: 'Pilih file excel terlebih dahulu' }));
      return;
    }

    try {
      await driversCheck();
      setIsManualProcessing(true);

      const { storedLocationAcronym } = getLocalStorage();
      const hubLabel = storedLocationAcronym || selectedLocationName;

      let targetRoutingDateObj;
      if (isCustomRouting) {
        if (!routingDate) throw new Error(t('common.invalid_date'));
        targetRoutingDateObj = new Date(routingDate);
      } else {
        if (!selectedDate) throw new Error(t('common.invalid_date'));
        targetRoutingDateObj = new Date(selectedDate);
        targetRoutingDateObj.setDate(targetRoutingDateObj.getDate() - 1);
        if (targetRoutingDateObj.getDay() === 0)
          targetRoutingDateObj.setDate(targetRoutingDateObj.getDate() - 1);
      }
      const targetRoutingStr = formatDateUniversal(targetRoutingDateObj);

      if (reportType === 'combined') {
        const routingBuffers = await Promise.all(
          selectedRoutingFiles.map((file) => file.arrayBuffer())
        );
        const deliveryBuffers = await Promise.all(
          selectedDeliveryFiles.map((file) => file.arrayBuffer())
        );

        const extractedDateStr = getDeliveryDate(deliveryBuffers, selectedDateString);
        const { timeFrom, timeTo } = calculateStartFinishDates(extractedDateStr);

        const vehicleTypesObj = await getVehicleTypes();
        const vehicleTypes = vehicleTypesObj.map((v) => v.name);
        const mappingsDB = await getVehicleMappings();
        const mappingsObj = mappingsDB.reduce((acc, curr) => {
          acc[curr.plat] = curr.mappedType;
          return acc;
        }, {});

        const [hubsData, locationHistoriesRes] = await Promise.all([
          getHubs(),
          getLocationHistories({
            timeFrom,
            timeTo,
            limit: 5000,
            startFinish: 'true',
            fields: 'finish,startTime,email,trackedTime,totalDistance',
            timeBy: 'createdTime',
          }),
        ]);

        const allApiData = locationHistoriesRes?.tasks?.data || [];
        const activeHub = (hubsData || []).find(
          (h) => String(h._id || h.id) === String(selectedLocation)
        );
        const hasPendingGR = activeHub ? activeHub.hasPendingGR : false;

        // 3. Gabungkan melalui ManualReport
        const { wb, excelFileName } = await generateManualReportWorkbook({
          routingBuffers,
          deliveryBuffers,
          driverData,
          allApiData,
          mappingsObj,
          vehicleTypes,
          targetRoutingStr,
          selectedDateString: extractedDateStr,
          hubLabel,
          hasPendingGR,
          t,
        });

        XLSX.writeFile(wb, excelFileName);
        toastSuccess(t('common.toast.success'));
        setIsModalOpen(false);
        setSelectedRoutingFiles([]);
        setSelectedDeliveryFiles([]);
        return;
      }

      const fileBuffers = await Promise.all(selectedFiles.map((file) => file.arrayBuffer()));

      if (reportType === 'routing') {
        const vehicleTypesObj = await getVehicleTypes();
        const mappingsDB = await getVehicleMappings();
        const mappingsObj = mappingsDB.reduce((acc, curr) => {
          acc[curr.plat] = curr.mappedType;
          return acc;
        }, {});

        const { wb, excelFileName } = await generateManualRoutingWorkbook(
          fileBuffers,
          driverData,
          mappingsObj,
          targetRoutingStr,
          hubLabel,
          t,
          vehicleTypesObj
        );

        XLSX.writeFile(wb, excelFileName);
        toastSuccess(t('common.toast.success'));
        setIsModalOpen(false);
        setSelectedFiles([]);
      } else if (reportType === 'delivery') {
        const [hubsData] = await Promise.all([getHubs()]);

        const activeHub = (hubsData || []).find(
          (h) => String(h._id || h.id) === String(selectedLocation)
        );
        const hasPendingGR = activeHub ? activeHub.hasPendingGR : false;

        const { wb, excelFileName } = await generateManualDeliveryWorkbook(
          fileBuffers,
          driverData,
          selectedDateString,
          targetRoutingStr,
          hubLabel,
          hasPendingGR,
          t
        );

        XLSX.writeFile(wb, excelFileName);
        toastSuccess(t('common.toast.success'));
        setIsModalOpen(false);
        setSelectedFiles([]);
      }
    } catch (err) {
      toastError(err.message || String(err));
    } finally {
      setIsManualProcessing(false);
    }
  };

  const handleDateChange = (date) => {
    if (!date) {
      toastError(t('report.toast.select_date'));
      return;
    }
    setSelectedDate(date);
  };

  const handleModal = (type) => {
    setReportType(type);
    setIsModalOpen(true);
  };

  const informationComp = (tooltipContent) => (
    <Tooltip tooltipContent={tooltipContent}>
      <span className="flex items-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          className="w-4 h-4"
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

  let actionButtons = [];
  if (isManualMode) {
    actionButtons = [
      {
        id: 'combined',
        label: 'Manual Daily Report',
        onClick: () => handleModal('combined'),
        hasOption: false,
      },
      { id: 'time', label: t('report.time_summary'), onClick: handleTime, hasOption: false },
    ];
  } else {
    actionButtons = [
      { id: 'combined', label: 'Daily Report', onClick: handleCombined, hasOption: false },
    ];
  }
  const MainDatePicker = (
    <div className="flex flex-col items-center w-full max-w-xs">
      <label
        htmlFor="shippingDate"
        className="text-lg mb-2 text-gray-500 dark:text-slate-400 font-medium text-center select-none flex items-center gap-1"
      >
        {t('common.delivery_date')} {informationComp(t('report.tooltip.info_delivery'))}
      </label>
      <CustomDatePicker
        className="max-w-xs cursor-pointer"
        disabled={disabledCommon}
        id="shippingDate"
        maxDate={tomorrowDate()}
        onChange={handleDateChange}
        selected={selectedDate}
      />
    </div>
  );

  const SecondaryDatePicker = (
    <div className="flex flex-col items-center w-full max-w-xs transition-opacity duration-300">
      <label
        htmlFor="routingDate"
        className="block text-lg mb-2 text-gray-500 dark:text-slate-400 font-medium text-center"
      >
        {t('report.routing_date')}
      </label>
      <CustomDatePicker
        className="max-w-xs cursor-pointer"
        disabled={disabledCommon}
        id="routingDate"
        maxDate={selectedDate}
        onChange={(date) => {
          if (date) setRoutingDate(date);
        }}
        selected={routingDate}
      />
    </div>
  );

  const SettingButton = (
    <div className="relative mt-2 mb-4" ref={settingsRef}>
      <button
        onClick={() => setIsSettingsOpen(!isSettingsOpen)}
        className="text-sm text-sky-600 dark:text-sky-400 font-medium hover:underline focus:outline-none cursor-pointer"
      >
        Pengaturan
      </button>
      {isSettingsOpen && (
        <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-64 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-md shadow-lg z-50 p-4 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="customRouting"
                disabled={disabledCommon || isManualMode}
                checked={isCustomRouting}
                onChange={(e) => setIsCustomRouting(e.target.checked)}
                className="w-4 h-4 text-sky-600 rounded border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 focus:ring-sky-500 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              />
              <label
                htmlFor="customRouting"
                className={`text-sm select-none ${disabledCommon || isManualMode ? 'text-slate-400 dark:text-slate-500 cursor-not-allowed' : 'text-gray-600 dark:text-slate-300 cursor-pointer'}`}
              >
                {t('report.change_date')}
              </label>
            </div>
            {informationComp(t('report.tooltip.info_change_time'))}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="manualMode"
              disabled={disabledCommon}
              checked={isManualMode}
              onChange={(e) => {
                setIsManualMode(e.target.checked);
                if (e.target.checked) setIsCustomRouting(false);
              }}
              className="w-4 h-4 text-sky-600 rounded border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 focus:ring-sky-500 cursor-pointer"
            />
            <label
              htmlFor="manualMode"
              className="text-sm text-gray-600 dark:text-slate-300 cursor-pointer select-none"
            >
              Manual
            </label>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex flex-col items-center w-full max-w-6xl p-4">
      <h1 className="text-3xl sm:text-4xl font-bold mb-8 text-center text-slate-900 dark:text-slate-100">
        {t('report.daily_title')}
      </h1>

      <div className="flex flex-col sm:flex-row justify-center items-center sm:items-start gap-6 sm:gap-12 w-full">
        {!isManualMode && MainDatePicker}
        {isCustomRouting && !isManualMode && SecondaryDatePicker}
      </div>
      {SettingButton}

      <div className="flex flex-row flex-wrap gap-4 w-full justify-center">
        {actionButtons.map(({ id, label, onClick, hasOption }) => (
          <Button
            key={id}
            onClick={onClick}
            disabled={disabledCommon || isDateInvalid}
            isLoading={currentRunning === id}
            text={label}
            hasOptions={hasOption}
            width="w-full sm:w-auto min-w-[200px]"
            options={[
              {
                label: 'Manual',
                onClick: () => handleModal(id),
              },
            ]}
          />
        ))}
      </div>
      <BaseModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedFiles([]);
          setSelectedRoutingFiles([]);
          setSelectedDeliveryFiles([]);
        }}
        title={'Upload Manual Data'}
        maxWidth="max-w-7xl w-[95%]"
        footer={
          <Button
            text={t('common.download')}
            onClick={handleManualDownload}
            isLoading={isManualProcessing}
            disabled={
              selectedRoutingFiles.length === 0 ||
              selectedDeliveryFiles.length === 0 ||
              isManualProcessing
            }
          />
        }
      >
        <div className="p-4">
          {
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative p-2">
              <div className="flex flex-col gap-4">
                <span className="font-bold text-sm text-slate-800 dark:text-slate-200 block border-b pb-1">
                  Upload File Routing Summary
                </span>
                <FileUploader
                  files={selectedRoutingFiles}
                  onUpdateFiles={setSelectedRoutingFiles}
                  validator={validateRoutingFile}
                  id="routing-file-input"
                />
                {getTutorialData(t)['routing'] && (
                  <Accordion title="Tutorial Routing" className="mt-2">
                    <Carousel items={getTutorialData(t)['routing']} />
                  </Accordion>
                )}
              </div>

              <div className="hidden md:block absolute top-0 bottom-0 left-1/2 border-l border-dashed border-slate-300 dark:border-slate-700 -translate-x-1/2"></div>

              <div className="flex flex-col gap-4">
                <span className="font-bold text-sm text-slate-800 dark:text-slate-200 block border-b pb-1">
                  Upload File Delivery Summary
                </span>
                <FileUploader
                  files={selectedDeliveryFiles}
                  onUpdateFiles={setSelectedDeliveryFiles}
                  validator={validateTaskFile}
                  id="delivery-file-input"
                />
                {getTutorialData(t)['delivery'] && (
                  <Accordion title="Tutorial Delivery" className="mt-2">
                    <Carousel items={getTutorialData(t)['delivery']} />
                  </Accordion>
                )}
              </div>
            </div>
          }
        </div>
      </BaseModal>
    </div>
  );
}
