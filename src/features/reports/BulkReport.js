'use client';

import Button from '@/components/Button';
import CustomDatePicker from '@/components/CustomDatePicker';
import ConfirmModal from '@/components/modal/ConfirmModal';
import { useLanguage } from '@/context/LanguageContext';
import {
  getLocationHistories,
  getResultsSummary,
  getTasks,
  getVehicleMappings,
  getVehicleTypes,
} from '@/lib/api';
import { getCachedHubs } from '@/lib/localStorageHandler';
import { generateAutoReportWorkbook } from '@/lib/reportGenerators';
import { convertLocationHistories } from '@/lib/reportGenerators/helper';
import { toastError } from '@/lib/toast';
import {
  calculateStartFinishDates,
  formatDateUniversal,
  formatToApiUtc,
  isEmpty,
  tomorrowDate,
} from '@/lib/utils';
import { useState } from 'react';
import { periodDownloader } from './helper/help';

const parseDate = (dateStr) => {
  return new Date(dateStr.replace(/-/g, '/'));
};

export default function PeriodReport({ driverData }) {
  const today = parseDate(formatDateUniversal(new Date()));
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [isLoading, setIsLoading] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const { t } = useLanguage();

  const handleDateChange = (dates) => {
    const [start, end] = dates;
    if (isEmpty(start) && isEmpty(start)) {
      toastError(t('report.toast.select_date'));
      return;
    }
    setStartDate(start);
    setEndDate(end);
  };

  const executeWithCheck = (actionFn) => {
    const validEndDate = endDate || startDate;
    const diffTime = Math.abs(validEndDate - startDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > 14) {
      setPendingAction(() => actionFn);
      setShowWarningModal(true);
    } else {
      actionFn();
    }
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

  const handlePeriodSummary = async (t) => {
    let mappingsObj = {};
    let vehicleTypes = [];
    let hubsMap = {};
    try {
      setIsLoading(true);
      const [vehicleTypesObj, mappingsDB, hubsDB] = await Promise.all([
        getVehicleTypes(),
        getVehicleMappings(),
        getCachedHubs(),
      ]);
      vehicleTypes = vehicleTypesObj.map((v) => v.name);
      mappingsObj = mappingsDB.reduce((acc, curr) => {
        acc[curr.plat] = curr.mappedType;
        return acc;
      }, {});
      hubsMap = hubsDB.reduce((acc, curr) => {
        acc[String(curr._id || curr.id)] = curr.hasPendingGR || false;
        return acc;
      }, {});
    } catch (e) {
      toastError(t('common.toast.error', { err: e.message }));
      setIsLoading(false);
      return;
    } finally {
      setIsLoading(false);
    }

    periodDownloader({
      startDate,
      endDate,
      driverData,
      zipPrefix: `${t('report.period')}`,
      setIsLoading,
      processDateCallback: async ({ dateForFile, hubId, hubName }) => {
        const deliveryDateObj = parseDate(dateForFile);

        const startD = new Date(deliveryDateObj);
        startD.setHours(0, 0, 0, 0);
        const endD = new Date(deliveryDateObj);
        endD.setHours(23, 59, 59, 999);

        const timeFromTasks = formatToApiUtc(startD);
        const timeToTasks = formatToApiUtc(endD);

        const allTasks = await getTasks({
          hubId,
          status: 'DONE,ONGOING',
          timeFrom: timeFromTasks,
          timeTo: timeToTasks,
          timeBy: 'startTime',
          limit: 1000,
        });

        if (isEmpty(allTasks)) {
          return null;
        }
        const dates = [];
        allTasks.forEach((task) => {
          if (task.createdFrom === 'API' && task.createdTime) {
            const d = new Date(task.createdTime);
            d.setHours(d.getHours() + 7);
            dates.push(d.toISOString().split('T')[0]);
          }
        });

        let targetRoutingStr;
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
          const targetRoutingDateObj = new Date(deliveryDateObj);
          targetRoutingDateObj.setDate(targetRoutingDateObj.getDate() - 1);
          if (targetRoutingDateObj.getDay() === 0) {
            targetRoutingDateObj.setDate(targetRoutingDateObj.getDate() - 1);
          }
          targetRoutingStr = formatDateUniversal(targetRoutingDateObj);
        }

        const summaryPayload = {
          dateFrom: `${targetRoutingStr} 00:00:00`,
          dateTo: `${targetRoutingStr} 23:59:59`,
          limit: 1000,
          hubId,
        };

        const { timeFrom: timeFromHistories, timeTo: timeToHistories } =
          calculateStartFinishDates(dateForFile);

        const [filteredResults, locationHistoriesRes] = await Promise.all([
          getResultsSummary(summaryPayload),
          getLocationHistories({
            timeFrom: timeFromHistories,
            timeTo: timeToHistories,
            limit: 1000,
            startFinish: 'true',
            fields: 'finish,startTime,email,trackedTime,totalDistance',
            timeBy: 'createdTime',
          }),
        ]);

        const allApiData = locationHistoriesRes?.tasks?.data || [];
        const { timeDataObjects } = convertLocationHistories(
          allApiData || [],
          driverData,
          dateForFile
        );
        const filteredTimeData = timeDataObjects.filter(
          (item) => !isEmpty(item.startTimeFmt) && !isEmpty(item.finishTimeFmt)
        );
        const hasPendingGR = hubsMap[String(hubId)] || false;
        if (!isEmpty(filteredResults) && !isEmpty(allTasks) && !isEmpty(filteredTimeData)) {
          return await generateAutoReportWorkbook({
            driverData,
            filteredResults,
            allTasks,
            timeData: timeDataObjects,
            mappingsObj,
            vehicleTypes,
            targetRoutingStr,
            selectedDateString: dateForFile,
            hubLabel: hubName,
            hasPendingGR,
            t,
          });
        }
        return null;
      },
      t,
    });
  };

  const isRangeInvalid =
    !startDate || !endDate || startDate > endDate || startDate.getTime() === endDate.getTime();

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
      <div className="flex flex-row flex-wrap gap-4 w-full justify-center">
        <Button
          key="download"
          onClick={() => executeWithCheck(() => handlePeriodSummary(t))}
          disabled={isLoading || isRangeInvalid}
          isLoading={isLoading}
          text={t('common.download')}
          width="w-full sm:w-auto min-w-[200px]"
        />
      </div>

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
