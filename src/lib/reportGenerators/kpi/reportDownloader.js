import { getLocationHistories, getResultsSummary, getTask, getTasks } from '@/lib/api';
import { toastError, toastSuccess, toastWarning } from '@/lib/toast';
import { calculateStartFinishDates, formatDateUniversal, formatToApiUtc } from '@/lib/utils';
import JSZip from 'jszip';
import * as XLSX from 'xlsx-js-style';
import { parseRoutingFiles, parseTaskFiles } from '../../../features/kpi/excelParser';
import { convertLocationHistories } from '../helper/convertLocationHistories';
import { generateKpiWorkbook } from './kpiReport';

const getDatesInRange = (start, end) => {
  const dates = [];
  let current = new Date(start);
  const stop = new Date(end);
  current.setHours(0, 0, 0, 0);
  stop.setHours(0, 0, 0, 0);
  while (current <= stop) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
};

const shuffleArray = (array) => {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
};

const processSingleDate = async (targetDateObj, drivers, selectedHub) => {
  const dateString = formatDateUniversal(targetDateObj);
  const startObj = new Date(targetDateObj);
  startObj.setHours(0, 0, 0, 0);
  const timeFrom = formatToApiUtc(startObj);
  const timeTo = formatToApiUtc(new Date(startObj.setHours(23, 59, 59)));
  const { timeFrom: histFrom, timeTo: histTo } = calculateStartFinishDates(dateString);
  const targetRoutingDateObj = new Date(targetDateObj);
  targetRoutingDateObj.setDate(targetRoutingDateObj.getDate() - 1);
  if (targetRoutingDateObj.getDay() === 0) {
    targetRoutingDateObj.setDate(targetRoutingDateObj.getDate() - 1);
  }

  const [tasks, rawResults, histories] = await Promise.all([
    getTasks({
      hubId: selectedHub.id,
      status: 'DONE',
      timeFrom,
      timeTo,
      timeBy: 'startTime',
      limit: 5000,
    }),
    getResultsSummary({
      routingDateObj: targetRoutingDateObj,
      deliveryDateObj: targetDateObj,
      hubId: selectedHub.id,
    }),
    getLocationHistories({
      timeFrom: histFrom,
      timeTo: histTo,
      limit: 5000,
      startFinish: 'true',
      fields: 'finish,startTime,email,trackedTime,totalDistance',
      timeBy: 'createdTime',
    }),
  ]);

  const uniqueNames = [
    ...new Set((rawResults || []).filter((r) => r.name && r.name !== '-').map((r) => r.name)),
  ];

  const validRoutingIds = new Set();

  for (const name of uniqueNames) {
    try {
      const nameResults = await getResultsSummary({
        routingDateObj: targetRoutingDateObj,
        deliveryDateObj: targetDateObj,
        hubId: selectedHub.id,
        s: name,
      });

      if (!nameResults || nameResults.length === 0) continue;

      for (const item of nameResults) {
        const routingId = item._id;
        let totalCheckedTasks = 0;
        let totalValidTasks = 0;
        let hasTestedAnyTrip = false;

        if (item.result && Array.isArray(item.result.routing)) {
          for (const route of item.result.routing) {
            const validCustomerTrips = (route.trips || []).filter(
              (t) => !t.isHub && t.visitId && t.visitId.includes('taskId-')
            );

            if (validCustomerTrips.length > 0) {
              hasTestedAnyTrip = true;

              const maxSample =
                validCustomerTrips.length > 5 ? 5 : Math.min(2, validCustomerTrips.length);
              const shuffledTrips = shuffleArray(validCustomerTrips);
              const sampledTrips = shuffledTrips.slice(0, maxSample);

              const extractedIds = sampledTrips
                .map((trip) => {
                  const match = trip.visitId.match(/taskId-([a-zA-Z0-9]+)/);
                  return match ? match[1] : null;
                })
                .filter(Boolean);

              totalCheckedTasks += extractedIds.length;

              if (extractedIds.length > 0) {
                const taskPromises = extractedIds.map((id) => getTask(id).catch(() => null));
                const taskResults = await Promise.all(taskPromises);

                taskResults.forEach((taskRes) => {
                  if (taskRes) {
                    const taskData = taskRes.data || taskRes;
                    if (String(taskData?.task?.routingResultId) === String(routingId)) {
                      totalValidTasks++;
                    }
                  }
                });
              }
            }
          }
        }

        if (hasTestedAnyTrip && totalCheckedTasks > 0) {
          const successRatio = (totalValidTasks / totalCheckedTasks) * 100;
          if (successRatio >= 70) {
            validRoutingIds.add(routingId);
          }
        }
      }
    } catch (err) {}
  }

  const filteredResults = (rawResults || []).filter((r) => validRoutingIds.has(r._id));

  const historiesData = histories?.tasks?.data || [];
  const filteredHistories = convertLocationHistories(historiesData, drivers, dateString);
  const { wb, fileName, hasError } = generateKpiWorkbook(
    dateString,
    selectedHub.name,
    drivers,
    filteredResults,
    tasks || [],
    filteredHistories
  );

  return { wb, fileName, hasError };
};

export const executeDownload = async ({
  downloadMode,
  singleDate,
  startDate,
  endDate,
  selectedHub,
  drivers,
  dataSource = 'auto',
  routingFiles = [],
  taskFiles = [],
}) => {
  if (dataSource === 'manual') {
    let parsedResultsData = [];
    if (routingFiles.length > 0) {
      try {
        parsedResultsData = await parseRoutingFiles(routingFiles);
      } catch (err) {
        throw new Error('Gagal membaca format file Routing: ' + err.message);
      }
    }
    let parsedTasksData = [];
    let extractedDateStr = null;
    if (taskFiles.length > 0) {
      try {
        const taskResult = await parseTaskFiles(taskFiles);
        parsedTasksData = taskResult.tasks;
        extractedDateStr = taskResult.majorityDate;
      } catch (err) {
        throw new Error('Gagal membaca format file Task: ' + err.message);
      }
    }

    if (!extractedDateStr) {
      throw new Error(
        'Tidak dapat mendeteksi tanggal pengiriman dari kolom startTime di file Task.'
      );
    }

    const targetDateObj = new Date(extractedDateStr);
    const targetDateStr = formatDateUniversal(targetDateObj);
    const { timeFrom: histFrom, timeTo: histTo } = calculateStartFinishDates(targetDateStr);

    let histories = [];

    try {
      histories =
        (await getLocationHistories({
          timeFrom: histFrom,
          timeTo: histTo,
          limit: 5000,
          startFinish: 'true',
          fields: 'finish,startTime,email,trackedTime,totalDistance',
          timeBy: 'createdTime',
        })) || [];
    } catch (err) {
      toastWarning('Gagal menarik data lokasi API, menggunakan data kosong.');
    }

    const filteredHistories = convertLocationHistories(histories, drivers, targetDateStr);
    const combinedTasks = parsedTasksData;
    const { wb } = generateKpiWorkbook(
      targetDateStr,
      selectedHub.name,
      drivers,
      parsedResultsData,
      combinedTasks,
      filteredHistories
    );

    const formattedDateForName = formatDateUniversal(targetDateObj, 'DD.MM.YYYY');
    const manualFileName = `Manual Data KPI - ${formattedDateForName} - ${selectedHub.name}.xlsx`;

    XLSX.writeFile(wb, manualFileName);

    toastSuccess(`File berhasil diunduh (Mode Manual)`);
    return;
  }

  if (downloadMode === 'single') {
    if (!singleDate) throw new Error('Silahkan pilih tanggal!');
    const { wb, fileName, hasError } = await processSingleDate(singleDate, drivers, selectedHub);

    XLSX.writeFile(wb, fileName);
    if (hasError) toastError('Terdapat data yang hilang. Periksa sheet Error Data!');
    toastSuccess(`Data berhasil diunduh!`);
  } else {
    if (!startDate || !endDate) throw new Error('Silahkan pilih rentang tanggal!');
    if (endDate < startDate) throw new Error('Tanggal akhir tidak boleh kurang dari tanggal awal.');

    const dateList = getDatesInRange(startDate, endDate);
    if (dateList.length > 16) throw new Error('Rentang tanggal terlalu besar.');

    const zip = new JSZip();
    let errorCount = 0;

    for (let i = 0; i < dateList.length; i++) {
      const currentDate = dateList[i];

      if (currentDate.getDay() === 0) continue;

      try {
        const { wb, fileName, hasError } = await processSingleDate(
          currentDate,
          drivers,
          selectedHub
        );
        if (hasError) errorCount++;
        const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        zip.file(fileName, excelBuffer);
      } catch (err) {
        toastError(`Gagal memproses ${formatDateUniversal(currentDate)}: ${err.message}`);
        zip.file(
          `ERROR_LOG_${formatDateUniversal(currentDate)}.txt`,
          `Gagal menarik data: ${err.message}`
        );
      }
    }

    const zipContent = await zip.generateAsync({ type: 'blob' });
    const zipFileName = `Bulk Data KPI - ${formatDateUniversal(
      startDate,
      'DD.MM.YYYY'
    )} sd ${formatDateUniversal(endDate, 'DD.MM.YYYY')} - ${selectedHub.name}.zip`;

    const link = document.createElement('a');
    link.href = URL.createObjectURL(zipContent);
    link.download = zipFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (errorCount > 0)
      toastWarning(`Selesai dengan catatan: ${errorCount} hari memiliki data error.`);
    else toastSuccess('Semua data berhasil diunduh dalam ZIP!');
  }
};
