'use client';

import Button from '@/components/button/Button';
import BodyCard from '@/components/card/BodyCard';
import HeaderCard from '@/components/card/HeaderCard';
import CustomDatePicker from '@/components/CustomDatePicker';
import { useLanguage } from '@/context/LanguageContext';
import { getTasks } from '@/lib/api';
import { getDriverData } from '@/lib/driverData';
import { getLocalStorage } from '@/lib/localStorageHandler';
import { toastError } from '@/lib/toast';
import {
  formatCoordinates,
  formatDateUniversal,
  getDistance,
  isEmpty,
  normalizeEmail,
  parseCustomerString,
  toApiDateString,
  tomorrowDate,
} from '@/lib/utils';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import CustomTable from './components/CustomTable';
import { handleDownloadExcel } from './help';

export default function UpdateCoordinatePage() {
  const { t, localeCode } = useLanguage();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [tasksData, setTasksData] = useState([]);
  const [historyMap, setHistoryMap] = useState(new Map());
  const [isDownloading, setIsDownloading] = useState(false);
  const [emptyMessage, setEmptyMessage] = useState(t('common.no_data'));

  const driverMapRef = useRef(new Map());
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

      const rawAssignee = Array.isArray(task.assignee) ? task.assignee[0] : '';
      const normAssignee = normalizeEmail(rawAssignee);
      const driverName = driverMapRef.current.get(normAssignee) || rawAssignee || '-';

      const distanceDiff = getDistance(task.longlat, task.klikLokasiClient);

      tempMap.get(name).push({
        date: formatDateUniversal(task.doneTime, 'HH:mm'),
        newLonglat: task.klikLokasiClient,
        oldLonglat: task.longlat,
        distanceDiff: distanceDiff,
        driverName: driverName,
      });
    });

    return tempMap;
  };

  const fetchData = useCallback(
    async (mountedContext) => {
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

        const localStart = new Date(selectedDate);
        localStart.setHours(0, 0, 0, 0);

        const localEnd = new Date(selectedDate);
        localEnd.setHours(23, 59, 59, 999);

        const timeFrom = toApiDateString(localStart);
        const timeTo = toApiDateString(localEnd);

        const [drivers, todayTasks] = await Promise.all([
          getDriverData(hubId),
          getTasks({
            status: 'DONE',
            hubId,
            timeFrom,
            timeTo,
            timeBy: 'startTime',
          }),
        ]);

        if (mountedContext && !mountedContext.isMounted) return;

        if (isEmpty(drivers)) {
          setEmptyMessage(t('common.no_driver'));
          throw new Error(t('common.no_driver'));
        } else {
          drivers.forEach((d) => {
            const normEmail = normalizeEmail(d.email);
            if (normEmail) driverMapRef.current.set(normEmail, d.name);
          });
        }

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
        if (mountedContext && !mountedContext.isMounted) return;
        toastError(t('common.toast.error', { err: err.message }));
        setLoading(false);
      }
    },
    [selectedDate, t]
  );

  useEffect(() => {
    const mountedContext = { isMounted: true };
    fetchData(mountedContext);
    return () => {
      mountedContext.isMounted = false;
    };
  }, [fetchData]);

  const processedData = useMemo(() => {
    if (loading && isEmpty(tasksData)) return [];

    const updateList = [];

    for (const task of tasksData) {
      if (task.klikLokasiClient) {
        const customerName = task.customerName || '';
        const { id: custId, location: locId, name: custName } = parseCustomerString(customerName);
        const distanceDiff = getDistance(task.longlat, task.klikLokasiClient);
        const isDataIncomplete = !custId || !locId;

        const rawAssignee = Array.isArray(task.assignee) ? task.assignee[0] : '';
        const normAssignee = normalizeEmail(rawAssignee);
        const driverName = driverMapRef.current.get(normAssignee) || rawAssignee || '-';
        const { invoiceNumber } = parseCustomerString(task.customerOrder);
        updateList.push({
          customerData: customerName,
          customerName: custName,
          customerId: custId,
          locationId: locId,
          driverName: driverName,
          updateTime: formatDateUniversal(task.doneTime, 'HH:mm'),
          newLonglat: formatCoordinates(task.klikLokasiClient),
          distanceDiff: distanceDiff !== null ? distanceDiff : 0,
          soNumber: invoiceNumber || task.content || '-',
          originalTask: task,
          isIncomplete: isDataIncomplete,
        });
      }
    }

    updateList.sort((a, b) => a.distanceDiff - b.distanceDiff);
    return updateList;
  }, [tasksData, loading]);

  const datePicker = (
    <CustomDatePicker
      isLoading={loading || isDownloading}
      onChange={setSelectedDate}
      selected={selectedDate}
      maxDate={tomorrowDate()}
    />
  );

  const downloadBtn = (
    <Button
      disabled={loading || isDownloading || isEmpty(processedData)}
      isLoading={isDownloading}
      onClick={() => handleDownloadExcel(processedData, setIsDownloading, selectedDate, t)}
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
        emptyMessage={emptyMessage}
        isLoading={loading}
      >
        <div className="p-0 h-full overflow-y-auto">
          <CustomTable
            data={processedData}
            historyMap={historyMap}
            selectedDate={selectedDate}
            t={t}
            localeCode={localeCode}
          />
        </div>
      </BodyCard>
      <span className="mt-2 block text-xs text-amber-600 text-right italic">
        {t('longlat.table_detail')}
      </span>
    </div>
  );
}
