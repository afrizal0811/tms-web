'use client';

import Button from '@/components/Button';
import BodyCard from '@/components/card/BodyCard';
import HeaderCard from '@/components/card/HeaderCard';
import CustomDatePicker from '@/components/CustomDatePicker';
import { useLanguage } from '@/context/LanguageContext';
import { getTasks } from '@/lib/api';
import { getOrFetchDriverData } from '@/lib/driverDataHelper';
import { getLocalStorage } from '@/lib/localStorageHandler';
import { toastError } from '@/lib/toastHelper';
import {
  calculateHaversineDistance,
  formatCoordinates,
  formatDateWIB,
  formatToApiUtc,
  isEmpty,
  normalizeEmail,
  parseCustomerString,
  tomorrowDate,
} from '@/lib/utils';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import UpdateLonglatTable from './components/UpdateLonglatTable';
import { handleDownloadExcel } from './help';

export default function UpdateLonglatPage() {
  const { t, lang } = useLanguage();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [tasksData, setTasksData] = useState([]);
  const [historyMap, setHistoryMap] = useState(new Map());
  const [isDownloading, setIsDownloading] = useState(false);

  const driverMapRef = useRef(new Map());
  const { storedLocationName: hubName } = getLocalStorage();

  const handleDateChange = (date) => {
    if (!date) return;
    if (date.getDay() === 0) {
      toastError(t('longlat.toast.no_sunday'));
      return;
    }
    setSelectedDate(date);
  };

  const processHistoryRawData = (rawTasks, targetCustomerSet) => {
    const tempMap = new Map();

    rawTasks.sort((a, b) => new Date(a.doneTime) - new Date(b.doneTime));

    rawTasks.forEach((task) => {
      if (!task.klikLokasiClient) return;
      const name = task.customerName || '';
      if (!name) return;
      if (!targetCustomerSet.has(name)) return;

      if (!tempMap.has(name)) {
        tempMap.set(name, []);
      }

      let dateStr = '-';
      if (task.doneTime) {
        dateStr = formatDateWIB(task.doneTime, 'HH:mm');
      }

      const rawAssignee = Array.isArray(task.assignee) ? task.assignee[0] : '';
      const normAssignee = normalizeEmail(rawAssignee);
      const driverName = driverMapRef.current.get(normAssignee) || rawAssignee || '-';

      const bedaJarak = calculateHaversineDistance(task.longlat, task.klikLokasiClient);

      tempMap.get(name).push({
        date: dateStr,
        newLonglat: task.klikLokasiClient,
        oldLonglat: task.longlat,
        distanceDiff: bedaJarak,
        driverName: driverName,
      });
    });

    return tempMap;
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    setTasksData([]);
    setHistoryMap(new Map());
    driverMapRef.current = new Map();

    if (selectedDate.getDay() === 0) {
      setLoading(false);
      return;
    }

    try {
      if (typeof window === 'undefined') return;
      const { storedLocation: hubId } = getLocalStorage();
      if (!hubId) throw new Error(t('common.no_data'));

      const drivers = await getOrFetchDriverData(hubId);
      if (drivers) {
        drivers.forEach((d) => {
          const normEmail = normalizeEmail(d.email);
          if (normEmail) driverMapRef.current.set(normEmail, d.name);
        });
      }

      const localStart = new Date(selectedDate);
      localStart.setHours(0, 0, 0, 0);

      const localEnd = new Date(selectedDate);
      localEnd.setHours(23, 59, 59, 999);

      const timeFrom = formatToApiUtc(localStart);
      const timeTo = formatToApiUtc(localEnd);

      const todayTasks = await getTasks({
        status: 'DONE',
        hubId,
        timeFrom,
        timeTo,
        timeBy: 'startTime',
        limit: 1000,
      });

      const currentData = todayTasks || [];
      setTasksData(currentData);

      const uniqueCustomersWithUpdates = new Set();
      currentData.forEach((task) => {
        if (task.klikLokasiClient && task.customerName) {
          uniqueCustomersWithUpdates.add(task.customerName);
        }
      });

      if (uniqueCustomersWithUpdates.size === 0) {
        setLoading(false);
        return;
      }

      const initialMap = processHistoryRawData(currentData, uniqueCustomersWithUpdates);
      setHistoryMap(initialMap);
      setLoading(false);
    } catch (err) {
      toastError(t('longlat.toast.failed_get_data'));
      setLoading(false);
    }
  }, [selectedDate, t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const processedData = useMemo(() => {
    if (loading && isEmpty(tasksData)) return [];

    const updateList = [];

    for (const task of tasksData) {
      if (task.klikLokasiClient) {
        const customerName = task.customerName || '';
        const { id: custId, location: locId, name: custName } = parseCustomerString(customerName);
        const bedaJarak = calculateHaversineDistance(task.longlat, task.klikLokasiClient);
        const isDataIncomplete = !custId || !locId;

        const rawAssignee = Array.isArray(task.assignee) ? task.assignee[0] : '';
        const normAssignee = normalizeEmail(rawAssignee);
        const driverName = driverMapRef.current.get(normAssignee) || rawAssignee || '-';

        let dateStr = '-';
        if (task.doneTime) {
          dateStr = formatDateWIB(task.doneTime, 'HH:mm');
        }

        updateList.push({
          customerData: customerName,
          customerName: custName,
          customerId: custId,
          locationId: locId,
          driverName: driverName,
          updateTime: dateStr,
          newLonglat: formatCoordinates(task.klikLokasiClient),
          bedaJarak: bedaJarak !== null ? bedaJarak : 0,
          originalTask: task,
          isIncomplete: isDataIncomplete,
        });
      }
    }

    updateList.sort((a, b) => a.bedaJarak - b.bedaJarak);
    return updateList;
  }, [tasksData, loading]);

  const datePicker = (
    <CustomDatePicker
      isLoading={loading || isDownloading}
      onChange={handleDateChange}
      selected={selectedDate}
      maxDate={tomorrowDate()}
    />
  );

  const downloadBtn = (
    <Button
      disabled={loading || isDownloading || isEmpty(processedData)}
      isLoading={isDownloading}
      onClick={() => handleDownloadExcel(processedData, setIsDownloading, selectedDate, hubName, t)}
      text={t('common.download')}
    />
  );

  const headerItems = [
    { label: t('common.delivery_date'), component: datePicker, hideLabel: false },
    { label: 'Export', component: downloadBtn, hideLabel: true },
  ];

  const subtitle = (
    <>
      {t('longlat.subtitle')}{' '}
      <span className="font-semibold text-sky-600">{t('longlat.highlight_subtitle')}</span>.
    </>
  );

  return (
    <div className="w-full max-w-none px-4 sm:px-6 pb-2">
      <HeaderCard title={t('longlat.title')} subtitle={subtitle} items={headerItems} />
      <BodyCard
        isEmpty={!loading && isEmpty(processedData)}
        isLoading={loading}
        loadingText={t('common.loading')}
      >
        <div className="p-0 h-full overflow-y-auto">
          <UpdateLonglatTable
            data={processedData}
            historyMap={historyMap}
            selectedDate={selectedDate}
            t={t}
            lang={lang}
          />
        </div>
      </BodyCard>
      <span className="mt-2 block text-xs text-amber-600 text-right italic">
        {t('longlat.table_detail')}
      </span>
    </div>
  );
}
