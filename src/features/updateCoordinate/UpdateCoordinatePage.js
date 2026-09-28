'use client';

import Button from '@/components/button/Button';
import CustomDatePicker from '@/components/CustomDatePicker';
import PageTemplate from '@/components/page/PageTemplate';
import { useLanguage } from '@/context/LanguageContext';
import { getTasks } from '@/lib/api/mileapp';
import { toastError } from '@/lib/toast';
import {
  formatCoordinates,
  formatDateUniversal,
  getDistance,
  isEmpty,
  parseCustomerString,
  toApiDateString,
  tomorrowDate,
} from '@/lib/utils';
import { useCallback, useEffect, useMemo, useState } from 'react';
import CustomTable from './components/CustomTable';
import { handleDownloadExcel } from './help';

export default function UpdateCoordinatePage() {
  const { t, localeCode } = useLanguage();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [tasksData, setTasksData] = useState([]);
  const [historyMap, setHistoryMap] = useState(new Map());
  const [isDownloading, setIsDownloading] = useState(false);

  const processHistoryRawData = (rawTasks, targetCustomerSet) => {
    const tempMap = new Map();

    rawTasks.sort((a, b) => {
      const timeA = new Date(a.doneTime || 0).getTime();
      const timeB = new Date(b.doneTime || 0).getTime();
      return timeA - timeB;
    });

    rawTasks.forEach((task) => {
      if (!task.klikLokasiClient) return;
      const name = task.customerName || '';
      if (!name) return;
      if (!targetCustomerSet.has(name)) return;

      if (!tempMap.has(name)) {
        tempMap.set(name, []);
      }

      const distanceDiff = getDistance(task.longlat, task.klikLokasiClient);

      tempMap.get(name).push({
        date: formatDateUniversal(task.doneTime, 'HH:mm'),
        newLonglat: task.klikLokasiClient,
        oldLonglat: task.longlat,
        distanceDiff: distanceDiff,
        driverName: task.driverName || task.assignee || '-',
      });
    });

    return tempMap;
  };

  const fetchData = useCallback(
    async (mountedContext) => {
      setLoading(true);
      setTasksData([]);
      setHistoryMap(new Map());

      if (selectedDate.getDay() === 0) {
        setLoading(false);
        return;
      }

      try {
        if (typeof window === 'undefined') return;

        const localStart = new Date(selectedDate);
        localStart.setHours(0, 0, 0, 0);

        const localEnd = new Date(selectedDate);
        localEnd.setHours(23, 59, 59, 999);

        const timeFrom = toApiDateString(localStart);
        const timeTo = toApiDateString(localEnd);

        const [todayTasks] = await Promise.all([
          getTasks({
            status: 'DONE',
            timeFrom,
            timeTo,
          }),
        ]);

        if (mountedContext && !mountedContext.isMounted) return;

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
        toastError(t('common.toast.error', { err: err.message }), err);
        setLoading(false);
      }
    },
    [selectedDate, t]
  );

  useEffect(() => {
    const mountedContext = { isMounted: true };
    const initFetch = async () => {
      await Promise.resolve();
      if (mountedContext.isMounted) fetchData(mountedContext);
    };
    initFetch();
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

        const { invoiceNumber } = parseCustomerString(task.customerOrder);
        updateList.push({
          customerData: customerName,
          customerName: custName,
          customerId: custId,
          locationId: locId,
          driverName: task.driverName || task.assignee || '-',
          updateTime: task.doneTime ? formatDateUniversal(task.doneTime, 'HH:mm') : '-',
          newLonglat: formatCoordinates(task.klikLokasiClient),
          distanceDiff: distanceDiff !== null ? distanceDiff : 0,
          soNumber: invoiceNumber || '-',
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
    <PageTemplate
      title={t('longlat.title')}
      subtitle={subtitle}
      headerItems={headerItems}
      isEmpty={!loading && isEmpty(processedData)}
      isLoading={loading}
      footer={{
        text: t('common.click_for_detail'),
      }}
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
    </PageTemplate>
  );
}
