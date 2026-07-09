'use client';

import BaseModal from '@/components/BaseModal';
import Button from '@/components/Button';
import CustomDatePicker from '@/components/CustomDatePicker';
import Tooltip from '@/components/Tooltip';
import FileUploader from '@/components/fileUploader/FileUploader';
import { useLanguage } from '@/context/LanguageContext';
import {
  getLocationHistories,
  getResultsSummary,
  getTasks,
  getVehicleMappings,
  getVehicleTypes,
} from '@/lib/api';
import { getDriverData } from '@/lib/driverData';
import { getCachedHubs, getLocalStorage } from '@/lib/localStorageHandler';
import { generateAutoReportWorkbook, generateManualReportWorkbook } from '@/lib/reportGenerators/';
import { convertLocationHistories } from '@/lib/reportGenerators/helper';
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
import { getManualDate } from './helper/help';

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

  const selectedDateString = formatDateUniversal(selectedDate);
  const isDateInvalid = isDateSunday(selectedDateString);

  const disabledCommon = isAnyLoading || isMapping;
  const driversCheck = async () => {
    const drivers = await getDriverData(selectedLocation);
    if (isEmpty(drivers)) {
      throw new Error(t('common.toast.error', { err: t('common.no_driver') }));
    }
  };

  const handleAutoDownload = async () => {
    try {
      setIsLoading(true);
      await driversCheck();
      if (setIsAnyLoading) setIsAnyLoading(true);
      if (setIsMapping) setIsMapping(false);

      if (!selectedDateString) throw new Error(t('common.invalid_date'));

      const timeFromTasks = new Date(`${selectedDateString}T00:00:00`).toISOString();
      const timeToTasks = new Date(`${selectedDateString}T23:59:59`).toISOString();

      const { timeFrom: timeFromHistories, timeTo: timeToHistories } =
        calculateStartFinishDates(selectedDateString);

      const allTasks = await getTasks({
        hubId: selectedLocation,
        status: 'DONE,ONGOING',
        timeFrom: timeFromTasks,
        timeTo: timeToTasks,
        timeBy: 'startTime',
        limit: 5000,
      });

      if (isEmpty(allTasks)) {
        throw new Error(t('common.toast.error', { err: t('common.no_data') }));
      }

      let targetRoutingStr;
      if (isCustomRouting) {
        if (!routingDate) throw new Error(t('common.invalid_date'));
        targetRoutingStr = formatDateUniversal(new Date(routingDate));
      } else {
        const dates = [];
        allTasks.forEach((task) => {
          if (task.createdFrom === 'API' && task.createdTime) {
            const d = new Date(task.createdTime);
            d.setHours(d.getHours() + 7);
            dates.push(d.toISOString().split('T')[0]);
          }
        });

        if (dates.length > 0) {
          const modeMap = {};
          let maxEl = dates[0],
            maxCount = 1;
          for (const d of dates) {
            modeMap[d] = (modeMap[d] || 0) + 1;
            if (modeMap[d] > maxCount) {
              maxEl = d;
              maxCount = modeMap[d];
            }
          }
          targetRoutingStr = maxEl;
        } else {
          const targetRoutingDateObj = new Date(selectedDate);
          targetRoutingDateObj.setDate(targetRoutingDateObj.getDate() - 1);
          if (targetRoutingDateObj.getDay() === 0)
            targetRoutingDateObj.setDate(targetRoutingDateObj.getDate() - 1);
          targetRoutingStr = formatDateUniversal(targetRoutingDateObj);
        }
      }

      const summaryPayload = {
        dateFrom: `${targetRoutingStr} 00:00:00`,
        dateTo: `${targetRoutingStr} 23:59:59`,
        limit: 1000,
        hubId: selectedLocation,
      };

      const { storedLocationAcronym } = getLocalStorage();
      const [filteredResults, hubsData, locationHistoriesRes, vehicleTypesObj, mappingsDB] =
        await Promise.all([
          getResultsSummary(summaryPayload),
          getCachedHubs(),
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
      const { timeDataObjects } = convertLocationHistories(
        allApiData || [],
        driverData,
        selectedDateString
      );
      const filteredTimeData = timeDataObjects.filter(
        (item) => !isEmpty(item.startTimeFmt) && !isEmpty(item.finishTimeFmt)
      );

      if (isEmpty(filteredResults) && isEmpty(allTasks) && isEmpty(filteredTimeData)) {
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
        timeData: timeDataObjects,
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
      setIsLoading(false);
      if (setIsAnyLoading) setIsAnyLoading(false);
      if (setIsMapping) setIsMapping(false);
    }
  };

  const handleManualDownload = async () => {
    try {
      await driversCheck();
      setIsLoading(true);

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

      const routingBuffers = await Promise.all(
        selectedRoutingFiles.map((file) => file.arrayBuffer())
      );
      const deliveryBuffers = await Promise.all(
        selectedDeliveryFiles.map((file) => file.arrayBuffer())
      );

      const extractedStartDate = getManualDate('starttime', deliveryBuffers, selectedDateString);
      const { timeFrom, timeTo } = calculateStartFinishDates(extractedStartDate);
      const extractedRoutingDate = getManualDate('assignedtime', deliveryBuffers, targetRoutingStr);
      const vehicleTypesObj = await getVehicleTypes();
      const vehicleTypes = vehicleTypesObj.map((v) => v.name);
      const mappingsDB = await getVehicleMappings();
      const mappingsObj = mappingsDB.reduce((acc, curr) => {
        acc[curr.plat] = curr.mappedType;
        return acc;
      }, {});

      const [hubsData, locationHistoriesRes] = await Promise.all([
        getDriverData(selectedLocation),
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
      const { timeDataObjects } = convertLocationHistories(
        allApiData || [],
        driverData,
        extractedStartDate
      );
      const activeHub = (hubsData || []).find(
        (h) => String(h._id || h.id) === String(selectedLocation)
      );
      const hasPendingGR = activeHub ? activeHub.hasPendingGR : false;
      const { wb, excelFileName } = await generateManualReportWorkbook({
        routingBuffers,
        deliveryBuffers,
        driverData,
        timeData: timeDataObjects,
        mappingsObj,
        vehicleTypes,
        targetRoutingStr: extractedRoutingDate,
        selectedDateString: extractedStartDate,
        hubLabel,
        hasPendingGR,
        t,
        isIndonesian,
      });

      XLSX.writeFile(wb, excelFileName);
      toastSuccess(t('common.toast.success'));
      setIsModalOpen(false);
      setSelectedRoutingFiles([]);
      setSelectedDeliveryFiles([]);
      return;
    } catch (err) {
      toastError(err.message || String(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDateChange = (date) => {
    if (!date) {
      toastError(t('report.toast.select_date'));
      return;
    }
    setSelectedDate(date);
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
        {t('common.routing_date')}
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
        {t('setting.title')}
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
  const manualText = isManualMode ? 'Manual' : '';
  const titleMenu = isIndonesian
    ? ` ${t('report.daily_title')} ${manualText}`
    : `${manualText} ${t('report.daily_title')}`;

  return (
    <div className="flex flex-col items-center w-full max-w-6xl p-4">
      <h1 className="text-3xl sm:text-4xl font-bold mb-8 text-center text-slate-900 dark:text-slate-100">
        {titleMenu}
      </h1>

      <div className="flex flex-col sm:flex-row justify-center items-center sm:items-start gap-6 sm:gap-12 w-full">
        {!isManualMode && MainDatePicker}
        {isCustomRouting && !isManualMode && SecondaryDatePicker}
      </div>
      {SettingButton}

      <div className="flex flex-row flex-wrap gap-4 w-full justify-center">
        <Button
          key="download"
          onClick={isManualMode ? () => setIsModalOpen(true) : handleAutoDownload}
          disabled={disabledCommon || isDateInvalid}
          isLoading={isLoading}
          text={isManualMode ? t('common.upload') : t('common.download')}
          width="w-full sm:w-auto min-w-[200px]"
        />
      </div>
      <BaseModal
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
            onClick={handleManualDownload}
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
      </BaseModal>
    </div>
  );
}
