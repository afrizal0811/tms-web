'use client';

import Button from '@/components/Button';
import CustomDatePicker from '@/components/CustomDatePicker';
import { useLanguage } from '@/context/LanguageContext';
import {
  getHubs,
  getLocationHistories,
  getResultsSummary,
  getTasks,
  getVehicleMappings,
  getVehicleTypes,
} from '@/lib/api';
import { generateDeliveryWorkbook } from '@/lib/reportGenerators/deliveryReport';
import { generateRoutingWorkbook } from '@/lib/reportGenerators/routingReport';
import { generateTimeSummaryWorkbook } from '@/lib/reportGenerators/timeReport';
import { toastError } from '@/lib/toastHelper';
import {
  calculateStartFinishDates,
  calculateTargetDates,
  formatDateUniversal,
  formatTimer,
  formatToApiUtc,
  isEmpty,
  tomorrowDate,
} from '@/lib/utils';
import { useEffect, useRef, useState } from 'react';
import { bulkDownloader } from './help';

const parseDate = (dateStr) => {
  return new Date(dateStr.replace(/-/g, '/'));
};

export default function BulkReport({ driverData }) {
  const today = parseDate(formatDateUniversal(new Date()));
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [isLoading, setIsLoading] = useState(false);
  const [currentReport, setCurrentReport] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const startTimeRef = useRef(null);
  const { t } = useLanguage();

  useEffect(() => {
    let interval = null;
    if (isLoading) {
      startTimeRef.current = Date.now();
      interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
    } else {
      startTimeRef.current = null;
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isLoading]);

  const handleDateChange = (dates) => {
    const [start, end] = dates;
    if (isEmpty(start) && isEmpty(start)) {
      toastError(t('report.toast.select_date'));
      return;
    }
    setStartDate(start);
    setEndDate(end);
  };

  const handleBulkRoutingSummary = async (t) => {
    setElapsedTime(0);

    let mappingsObj = {};
    let vehicleTypes = [];
    try {
      setIsLoading(true);
      const vehicleTypesObj = await getVehicleTypes();
      vehicleTypes = vehicleTypesObj.map((v) => v.name);
      const mappingsDB = await getVehicleMappings();
      mappingsObj = mappingsDB.reduce((acc, curr) => {
        acc[curr.plat] = curr.mappedType;
        return acc;
      }, {});
    } catch (e) {
      toastError(t('common.toast.error', { err: e.message }));
    } finally {
      setIsLoading(false);
    }

    bulkDownloader({
      startDate,
      endDate,
      driverData,
      reportType: 'routing',
      zipPrefix: `${t('report.bulk')} ${t('excel.routing.filename')}`,
      setIsLoading,
      setCurrentReport,
      processDateCallback: async ({ dateForFile, hubId, hubName }) => {
        const { dateFrom: apiDate, dateTo: apiDateTo } = calculateTargetDates(dateForFile);

        const resultsData = await getResultsSummary({
          dateFrom: `${apiDate} 00:00:00`,
          dateTo: `${apiDateTo} 23:59:59`,
          limit: 500,
          hubId,
        });

        const filteredResults = resultsData.filter((item) => item.dispatchStatus === 'done');

        if (filteredResults.length > 0) {
          return await generateRoutingWorkbook(
            driverData,
            filteredResults,
            mappingsObj,
            apiDate,
            hubName,
            t,
            vehicleTypes
          );
        }
        return null;
      },
      t,
    });
  };

  const handleBulkDeliverySummary = async (t) => {
    setElapsedTime(0);

    let hubsMap = {};
    try {
      setIsLoading(true);
      const hubsDB = await getHubs();
      hubsMap = hubsDB.reduce((acc, curr) => {
        acc[String(curr._id || curr.id)] = curr.hasPendingGR || false;
        return acc;
      }, {});
    } catch (e) {
      toastError(t('common.toast.error', { err: e.message }));
    } finally {
      setIsLoading(false);
    }

    bulkDownloader({
      startDate,
      endDate,
      driverData,
      reportType: 'delivery',
      zipPrefix: `${t('report.bulk')} ${t('excel.delivery.filename')}`,
      setIsLoading,
      setCurrentReport,
      processDateCallback: async ({ dateForFile, hubId, hubName }) => {
        const { dateFrom: apiDate, dateTo: apiDateTo } = calculateTargetDates(dateForFile);

        const startD = new Date(dateForFile);
        startD.setHours(0, 0, 0, 0);
        const endD = new Date(dateForFile);
        endD.setHours(23, 59, 59, 999);

        const timeFrom = formatToApiUtc(startD);
        const timeTo = formatToApiUtc(endD);

        const [allTasks, resultsData] = await Promise.all([
          getTasks({
            hubId: hubId,
            status: 'DONE,ONGOING',
            timeFrom: timeFrom,
            timeTo: timeTo,
            timeBy: 'startTime',
            limit: 1000,
          }),
          getResultsSummary({
            dateFrom: `${apiDate} 00:00:00`,
            dateTo: `${apiDateTo} 23:59:59`,
            limit: 500,
            hubId: hubId,
          }),
        ]);

        if (allTasks.length > 0) {
          const hasPendingGR = hubsMap[String(hubId)] || false;

          return generateDeliveryWorkbook(
            driverData,
            allTasks,
            resultsData || [],
            dateForFile,
            apiDate,
            hubName,
            hasPendingGR,
            t
          );
        }
        return null;
      },
      t,
    });
  };

  const handleBulkTimeSummary = (t) => {
    setElapsedTime(0);
    bulkDownloader({
      startDate,
      endDate,
      driverData,
      reportType: 'time',
      zipPrefix: `${t('report.bulk')} ${t('excel.time.filename')}`,
      setIsLoading,
      setCurrentReport,
      processDateCallback: async ({ dateForFile, hubName }) => {
        const { timeFrom, timeTo } = calculateStartFinishDates(dateForFile);

        const response = await getLocationHistories({
          timeFrom: timeFrom,
          timeTo: timeTo,
          limit: 1000,
          startFinish: 'true',
          fields: 'finish,startTime,email,trackedTime,totalDistance',
          timeBy: 'createdTime',
        });

        const allApiData = response?.tasks?.data || [];

        if (allApiData.length > 0) {
          return generateTimeSummaryWorkbook(driverData, allApiData, dateForFile, hubName, t);
        }
        return null;
      },
      t,
    });
  };

  const isRangeInvalid =
    !startDate || !endDate || startDate > endDate || startDate.getTime() === endDate.getTime();

  const actionButtons = [
    {
      id: 'routing',
      label: t('report.routing_summary'),
      onClick: () => handleBulkRoutingSummary(t),
    },
    {
      id: 'delivery',
      label: t('report.delivery_summary'),
      onClick: () => handleBulkDeliverySummary(t),
    },
    { id: 'time', label: t('report.time_summary'), onClick: () => handleBulkTimeSummary(t) },
  ];

  return (
    <div className="w-full max-w-6xl p-4">
      <h1 className="text-3xl sm:text-4xl font-bold mb-2 text-center text-slate-900 dark:text-slate-100">
        {t('report.period_title')}
      </h1>
      <div className="flex flex-col sm:flex-row justify-center items-center mb-8 gap-4">
        <div className="text-center w-full max-w-xs">
          <label
            htmlFor="shippingDate"
            className="block text-lg mb-2 text-gray-500 dark:text-slate-400"
          >
            {t('common.range_delivery')}
          </label>
          <CustomDatePicker
            selectsRange
            startDate={startDate}
            endDate={endDate}
            onChange={handleDateChange}
            isLoading={isLoading}
            dateFormat="dd/MM/yyyy"
            className="sm:w-64"
            maxDate={tomorrowDate()}
          />
        </div>
      </div>
      <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 w-full justify-center">
        {actionButtons.map(({ id, label, onClick }) => (
          <Button
            key={id}
            onClick={onClick}
            disabled={isLoading || isRangeInvalid}
            isLoading={isLoading && currentReport === id}
            text={label}
            loadingText={formatTimer(elapsedTime)}
            width="w-full sm:w-64"
          />
        ))}
      </div>
    </div>
  );
}
