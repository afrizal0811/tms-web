// File: src/features/updateLonglat/UpdateLonglatPage.js
'use client';

import BodyCard from '@/components/card/BodyCard';
import HeaderCard from '@/components/card/HeaderCard';
import CustomDatePicker from '@/components/CustomDatePicker';
import DownloadButton from '@/components/DownloadButton';
import { useLanguage } from '@/context/LanguageContext';
import { getTasks } from '@/lib/api';
import { getOrFetchDriverData } from '@/lib/driverDataHelper';
import { getLocalStorage } from '@/lib/localStorageHandler';
import { toastError, toastSuccess, toastWarning } from '@/lib/toastHelper';
import {
  calculateHaversineDistance,
  formatCoordinates,
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
  const [historyRange, setHistoryRange] = useState({ start: '', end: '' });
  const [isDownloading, setIsDownloading] = useState(false);

  const driverMapRef = useRef(new Map());
  const { storedLocationName: hubName } = getLocalStorage();
  const isIndo = lang === 'id';

  const handleDateChange = (date) => {
    if (!date) return;
    if (date.getDay() === 0) {
      toastError(t('longlat.toast.no_sunday'));
      return;
    }
    setSelectedDate(date);
  };

  // --- HELPER: Process Raw Tasks to Map ---
  // Fungsi ini dipisahkan agar bisa dipakai saat Initial Load maupun saat Retry
  const processHistoryRawData = (rawTasks, targetCustomerSet) => {
    const tempMap = new Map();

    // Sort tanggal lama -> baru
    rawTasks.sort((a, b) => new Date(a.doneTime) - new Date(b.doneTime));

    rawTasks.forEach((task) => {
      if (!task.klikLokasiClient) return;
      const name = task.customerName || '';
      if (!name) return;
      // Filter hanya customer yg relevan
      if (!targetCustomerSet.has(name)) return;

      if (!tempMap.has(name)) {
        tempMap.set(name, []);
      }

      let dateStr = '-';
      if (task.doneTime) {
        try {
          dateStr = new Date(task.doneTime).toLocaleDateString('id-ID', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          });
        } catch (e) {
          dateStr = String(task.doneTime);
        }
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
      if (!hubId) throw new Error('Lokasi Hub tidak ditemukan. Harap login ulang.');

      // 1. Ambil Data Driver
      const drivers = await getOrFetchDriverData(hubId);
      if (drivers) {
        drivers.forEach((d) => {
          const normEmail = normalizeEmail(d.email);
          if (normEmail) driverMapRef.current.set(normEmail, d.name);
        });
      }

      // 2. Fetch Data Hari Ini
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

      // Identifikasi Customer
      const uniqueCustomersWithUpdates = new Set();
      currentData.forEach((task) => {
        if (task.klikLokasiClient && task.customerName) {
          uniqueCustomersWithUpdates.add(task.customerName);
        }
      });

      // Early Return jika tidak ada update
      if (uniqueCustomersWithUpdates.size === 0) {
        setLoading(false);
        return;
      }

      const historyEndDate = new Date(selectedDate);
      const historyStartDate = new Date(selectedDate);
      historyStartDate.setMonth(historyStartDate.getMonth() - 2);

      const displayOptions = { day: 'numeric', month: 'long', year: 'numeric' };
      setHistoryRange({
        start: historyStartDate.toLocaleDateString(isIndo ? 'id-ID' : 'en-GB', displayOptions),
        end: historyEndDate.toLocaleDateString(isIndo ? 'id-ID' : 'en-GB', displayOptions),
      });

      const createDateChunks = (start, end, daysPerChunk = 15) => {
        const chunks = [];
        let current = new Date(start);
        const finalEnd = new Date(end);
        while (current < finalEnd) {
          const chunkStart = new Date(current);
          const chunkEnd = new Date(current);
          chunkEnd.setDate(chunkEnd.getDate() + daysPerChunk);
          if (chunkEnd > finalEnd) chunkEnd.setTime(finalEnd.getTime());
          chunkStart.setHours(0, 0, 0, 0);
          chunkEnd.setHours(23, 59, 59, 999);

          chunks.push({
            startStr: formatToApiUtc(chunkStart),
            endStr: formatToApiUtc(chunkEnd),
          });
          current.setDate(current.getDate() + daysPerChunk + 1);
        }
        return chunks;
      };

      const dateChunks = createDateChunks(historyStartDate, historyEndDate, 15);

      const chunkPromises = dateChunks.map((chunk) =>
        getTasks({
          status: 'DONE',
          hubId,
          timeFrom: chunk.startStr,
          timeTo: chunk.endStr,
          timeBy: 'startTime',
          limit: 2000,
          fields: 'customerName,klikLokasiClient,longlat,doneTime,assignee',
        })
          .then((res) => ({ status: 'ok', data: res || [] }))
          .catch((err) => ({ status: 'failed', chunk: chunk, error: err }))
      );

      const results = await Promise.all(chunkPromises);

      const successfulChunks = results.filter((r) => r.status === 'ok').flatMap((r) => r.data);
      const failedChunks = results.filter((r) => r.status === 'failed').map((r) => r.chunk);
      const initialMap = processHistoryRawData(successfulChunks, uniqueCustomersWithUpdates);
      setHistoryMap(initialMap);
      setLoading(false);
      if (failedChunks.length > 0) {
        toastWarning(t('longlat.toast.retry_chunk', { count: failedChunks.length }));

        const retryPromises = failedChunks.map((chunk) =>
          getTasks({
            status: 'DONE',
            hubId,
            timeFrom: chunk.startStr,
            timeTo: chunk.endStr,
            timeBy: 'startTime',
            limit: 2000,
            fields: 'customerName,klikLokasiClient,longlat,doneTime,assignee',
          })
            .then((res) => res || [])
            .catch((err) => {
              toastError(t('longlat.toast.all_failed', { time: chunk.startStr }));
              return [];
            })
        );

        const retryResults = await Promise.all(retryPromises);
        const recoveredTasks = retryResults.flat();

        if (recoveredTasks.length > 0) {
          setLoading(true);
          await new Promise((r) => setTimeout(r, 500));
          const newRecoveredMap = processHistoryRawData(recoveredTasks, uniqueCustomersWithUpdates);
          setHistoryMap((prevMap) => {
            const mergedMap = new Map(prevMap); // Clone map lama
            for (const [customerName, newItems] of newRecoveredMap.entries()) {
              if (mergedMap.has(customerName)) {
                const existingItems = mergedMap.get(customerName);
                const combined = [...existingItems, ...newItems];
                combined.sort((a, b) => {
                  return 0;
                });
                mergedMap.set(customerName, combined);
              } else {
                mergedMap.set(customerName, newItems);
              }
            }
            return mergedMap;
          });

          setLoading(false);
          toastSuccess(t('longlat.toast.recovered', { count: recoveredTasks.length }));
        }
      }
    } catch (err) {
      toastError(t('longlat.toast.failed_get_data'));
      setLoading(false);
    }
  }, [selectedDate, isIndo, t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- PROCESSING DATA ---
  const processedData = useMemo(() => {
    if (loading && isEmpty(tasksData)) return []; // Only block if no data at all

    const updateList = [];

    for (const task of tasksData) {
      if (task.klikLokasiClient) {
        const customerName = task.customerName || '';
        const { id: custId, location: locId } = parseCustomerString(customerName);
        const bedaJarak = calculateHaversineDistance(task.longlat, task.klikLokasiClient);
        const isDataIncomplete = !custId || !locId;

        updateList.push({
          customerName: customerName,
          customerId: custId,
          locationId: locId,
          newLonglat: formatCoordinates(task.klikLokasiClient),
          bedaJarak: bedaJarak !== null ? bedaJarak : 0,
          originalTask: task,
          isIncomplete: isDataIncomplete,
        });
      }
    }

    updateList.sort((a, b) => a.bedaJarak - b.bedaJarak);
    return updateList;
  }, [tasksData, loading]); // Added deps

  const datePicker = (
    <CustomDatePicker
      isLoading={loading || isDownloading}
      onChange={handleDateChange}
      selected={selectedDate}
      maxDate={tomorrowDate()}
    />
  );

  const downloadBtn = (
    <DownloadButton
      disabled={loading || isDownloading || isEmpty(processedData)}
      isLoading={isDownloading}
      onClick={() => handleDownloadExcel(processedData, setIsDownloading, selectedDate, hubName, t)}
      text={t('common.download') + ' Excel'}
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
            historyRange={historyRange}
          />
        </div>
      </BodyCard>
    </div>
  );
}
