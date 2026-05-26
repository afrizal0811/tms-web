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
  generateDeliveryWorkbook,
  generateManualRoutingWorkbook,
  generateRoutingWorkbook,
  generateTimeSummaryWorkbook,
} from '@/lib/reportGenerators';
import { toastError, toastSuccess } from '@/lib/toastHelper';
import {
  calculateStartFinishDates,
  formatDateUniversal,
  isDateSunday,
  isEmpty,
  tomorrowDate,
} from '@/lib/utils';
import { useEffect, useState } from 'react';
import * as XLSX from 'xlsx-js-style';
import { tutorialData } from './constants';
import { validateRoutingFile, validateTaskFile } from './help';

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
  const [selectedFiles, setSelectedFiles] = useState([]);
  const initialDate = parseDate(formatDateUniversal(new Date()));
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [isCustomRouting, setIsCustomRouting] = useState(false);
  const [routingDate, setRoutingDate] = useState(() => {
    const d = new Date(initialDate);
    d.setDate(d.getDate() - 1);
    if (d.getDay() === 0) d.setDate(d.getDate() - 1);
    return d;
  });

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

  const handleRouting = async () => {
    try {
      await driversCheck();
      if (setIsAnyLoading) setIsAnyLoading(true);
      setCurrentRunning('routing');
      if (setIsMapping) setIsMapping(false);

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
      const { storedLocationAcronym } = getLocalStorage();

      const summaryPayload = isCustomRouting
        ? {
            dateFrom: `${targetRoutingStr} 00:00:00`,
            dateTo: `${targetRoutingStr} 23:59:59`,
            hubId: selectedLocation,
          }
        : {
            routingDateObj: targetRoutingDateObj,
            deliveryDateObj: selectedDate,
            hubId: selectedLocation,
          };

      const [filteredResults] = await Promise.all([getResultsSummary(summaryPayload)]);

      if (isEmpty(filteredResults)) {
        throw new Error(t('common.toast.error', { err: t('common.no_data') }));
      }

      const vehicleTypesObj = await getVehicleTypes();
      const vehicleTypes = vehicleTypesObj.map((v) => v.name);
      const mappingsDB = await getVehicleMappings();
      const mappingsObj = mappingsDB.reduce((acc, curr) => {
        acc[curr.plat] = curr.mappedType;
        return acc;
      }, {});

      const hubLabel = storedLocationAcronym || selectedLocationName;

      const { wb, excelFileName } = await generateRoutingWorkbook(
        driverData,
        filteredResults,
        mappingsObj,
        targetRoutingStr,
        hubLabel,
        t,
        vehicleTypes
      );

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

  const handleDelivery = async () => {
    try {
      await driversCheck();
      if (setIsAnyLoading) setIsAnyLoading(true);
      setCurrentRunning('delivery');

      if (!selectedDateString) throw new Error(t('common.invalid_date'));

      const timeFrom = new Date(`${selectedDateString}T00:00:00`).toISOString();
      const timeTo = new Date(`${selectedDateString}T23:59:59`).toISOString();

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

      const [allTasks, resultsData, hubsData] = await Promise.all([
        getTasks({
          hubId: selectedLocation,
          status: 'DONE,ONGOING',
          timeFrom,
          timeTo,
          timeBy: 'startTime',
          limit: 5000,
        }),
        getResultsSummary(summaryPayload),
        getHubs(),
      ]);

      if (!Array.isArray(allTasks) || isEmpty(allTasks)) {
        throw new Error(t('common.toast.error', { err: t('common.no_data') }));
      }

      const activeHub = (hubsData || []).find(
        (h) => String(h._id || h.id) === String(selectedLocation)
      );
      const hasPendingGR = activeHub ? activeHub.hasPendingGR : false;

      const hubLabel = storedLocationAcronym || selectedLocationName;

      const { wb, excelFileName } = generateDeliveryWorkbook(
        driverData,
        allTasks,
        resultsData || [],
        selectedDateString,
        targetRoutingStr,
        hubLabel,
        hasPendingGR,
        t
      );

      XLSX.writeFile(wb, excelFileName);
      toastSuccess(t('common.toast.success'));
    } catch (err) {
      toastError(err.message || String(err));
    } finally {
      setCurrentRunning(null);
      if (setIsAnyLoading) setIsAnyLoading(false);
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

  const handleManualDownload = async () => {
    if (!selectedFiles || selectedFiles.length === 0) {
      toastError(t('common.toast.error', { err: 'Pilih file excel terlebih dahulu' }));
      return;
    }

    try {
      await driversCheck();
      setIsManualProcessing(true);

      const fileBuffers = await Promise.all(selectedFiles.map((file) => file.arrayBuffer()));

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
        toastError('Report manual untuk Delivery belum tersedia.');
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

  const actionButtons = [
    { id: 'routing', label: t('report.routing_summary'), onClick: handleRouting, hasOption: true },
    {
      id: 'delivery',
      label: t('report.delivery_summary'),
      onClick: handleDelivery,
      hasOption: true,
    },
    { id: 'time', label: t('report.time_summary'), onClick: handleTime, hasOption: false },
  ];

  return (
    <div className="flex flex-col items-center w-full max-w-6xl p-4">
      <h1 className="text-3xl sm:text-4xl font-bold mb-8 text-center text-slate-900 dark:text-slate-100">
        {t('report.daily_title')}
      </h1>

      <div className="flex flex-col sm:flex-row justify-center items-center sm:items-start gap-6 sm:gap-12 mb-10 w-full">
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

          <div className="mt-4 flex items-center gap-2">
            <input
              type="checkbox"
              id="customRouting"
              disabled={disabledCommon}
              checked={isCustomRouting}
              onChange={(e) => setIsCustomRouting(e.target.checked)}
              className="w-4 h-4 text-sky-600 rounded border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 focus:ring-sky-500 dark:focus:ring-sky-400 cursor-pointer"
            />
            <label
              htmlFor="customRouting"
              className="text-sm text-gray-600 dark:text-slate-400 cursor-pointer select-none flex items-center gap-1"
            >
              {t('report.change_date')} {informationComp(t('report.tooltip.info_change_time'))}
            </label>
          </div>
        </div>

        {isCustomRouting && (
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
        )}
      </div>

      <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 w-full justify-center">
        {actionButtons.map(({ id, label, onClick, hasOption }) => (
          <Button
            key={id}
            onClick={onClick}
            disabled={disabledCommon || isDateInvalid}
            isLoading={currentRunning === id}
            text={label}
            hasOptions={hasOption}
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
        }}
        title={`Upload Manual Data - ${reportType === 'routing' ? t('report.routing_summary') : t('report.delivery_summary')}`}
        maxWidth="max-w-2xl w-[95%] sm:w-full"
        footer={
          <Button
            text={t('common.download')}
            onClick={handleManualDownload}
            isLoading={isManualProcessing}
            disabled={selectedFiles.length === 0 || isManualProcessing}
          />
        }
      >
        <div className="p-4 flex flex-col gap-5">
          <FileUploader
            files={selectedFiles}
            onUpdateFiles={setSelectedFiles}
            validator={reportType === 'routing' ? validateRoutingFile : validateTaskFile}
          />
          <Accordion title="Tutorial" className="mt-2">
            <Carousel items={tutorialData[reportType] || []} />
          </Accordion>
        </div>
      </BaseModal>
    </div>
  );
}
