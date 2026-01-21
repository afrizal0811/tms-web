'use client';

import DownloadButton from '@/components/DownloadButton';
import HighlightText from '@/components/HighlightText';
import SearchBar from '@/components/SearchBar';
import Tooltip from '@/components/Tooltip';
import { useLanguage } from '@/context/LanguageContext';
import { toastError, toastWarning } from '@/lib/toastHelper';
import {
  formatSimpleTime,
  formatTimestampToHHMM,
  isEmpty,
  normalizeEmail,
  parseCustomerString,
} from '@/lib/utils';
import { useMemo, useState } from 'react';
import { downloadRoutingVsActual } from '../help';
import RoutingMapModal from '../modals/RoutingMapModal';

export default function RoutingVsActualTab({ loading, tasks, results, drivers }) {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);

  const processedData = useMemo(() => {
    if (loading || !tasks || !drivers) return [];

    const emailToDriverMap = drivers.reduce((acc, driver) => {
      const normalized = normalizeEmail(driver.email);
      if (normalized) {
        acc[normalized] = { plat: driver.plat || null, name: driver.name };
      }
      return acc;
    }, {});

    const hubTimesMap = new Map();
    if (results) {
      const filteredResults = results.filter((item) => item.dispatchStatus === 'done');
      for (const result of filteredResults) {
        if (result.result && Array.isArray(result.result.routing)) {
          for (const route of result.result.routing) {
            const driverEmail = normalizeEmail(route.assignee);
            const driverInfo = driverEmail ? emailToDriverMap[driverEmail] : null;
            const driverName = driverInfo ? driverInfo.name : driverEmail || 'N/A';
            if (!driverName || !Array.isArray(route.trips) || isEmpty(route.trips)) continue;

            const hubTrips = route.trips.filter((trip) => trip.isHub === true);
            if (hubTrips.length > 0) {
              const firstHub = hubTrips[0];
              const lastHub = hubTrips[hubTrips.length - 1];
              const hubLocation = firstHub.coordinate || null;

              hubTimesMap.set(driverName, {
                hubETD: formatSimpleTime(firstHub.etd) || '-',
                hubETA: formatSimpleTime(lastHub.eta) || '-',
                hubLongLat: hubLocation,
              });
            }
          }
        }
      }
    }

    const driverStats = new Map();
    const allTaskData = [];

    for (const task of tasks) {
      const flow = task.flow;
      const emailString =
        Array.isArray(task.assignee) && task.assignee.length > 0 ? task.assignee[0] : null;
      const driverEmail = normalizeEmail(emailString);
      const driverInfo = driverEmail ? emailToDriverMap[driverEmail] : null;
      const driverName = driverInfo ? driverInfo.name : driverEmail || 'N/A';
      let statusLabel =
        flow !== 'Pickup'
          ? task.statusDelivery && task.statusDelivery.length > 0
            ? task.statusDelivery[0].toUpperCase()
            : '-'
          : task.status && task.status.toUpperCase();
      statusLabel = statusLabel !== 'ONGOING' ? statusLabel : '-';
      let { fullCustomerName: customerName } = parseCustomerString(task.customerOrder);
      if (isEmpty(customerName)) customerName = task.customerName;

      if (driverName !== 'N/A') {
        const stats = driverStats.get(driverName) || {
          plat: null,
          driverEmail: driverEmail,
        };
        if (!stats.plat && driverInfo && driverInfo.plat) {
          stats.plat = driverInfo.plat;
        }
        driverStats.set(driverName, stats);
      }

      let actualArrival, actualDeparture;
      if (flow && flow.toUpperCase().includes('GR')) {
        actualArrival = task.page1DoneTime;
        actualDeparture = task.page1DoneTime;
      } else if (flow && flow.toUpperCase().includes('PICKUP')) {
        actualArrival = task.klikJikaAndaSudahSampaiDiGudang;
        actualDeparture = task.page1DoneTime;
      } else {
        actualArrival = task.klikJikaSudahSampai;
        actualDeparture = task.page3DoneTime;
      }

      const roSequence = task.routePlannedOrder || 0;
      const etaVal = formatSimpleTime(task.eta);
      const etdVal = formatSimpleTime(task.etd);

      let actualVisitTimeVal = '-';
      if (actualArrival && actualDeparture) {
        const start = new Date(actualArrival).getTime();
        const end = new Date(actualDeparture).getTime();
        if (!isNaN(start) && !isNaN(end) && end >= start) {
          const diffMs = end - start;
          const diffMins = Math.ceil(diffMs / 60000);
          actualVisitTimeVal = diffMins;
        }
      }

      allTaskData.push({
        driver: driverName,
        plat: driverInfo ? driverInfo.plat : null,
        actualArrivalTimestamp: actualArrival ? new Date(actualArrival).getTime() : null,
        roSequence: roSequence,
        statusLabel: statusLabel,
        flow: flow,
        customerName: customerName,
        openTime: formatSimpleTime(task.openTime) || '-',
        closeTime: formatSimpleTime(task.closeTime) || '-',
        eta: etaVal || '-',
        etd: etdVal || '-',
        actualArrival: formatTimestampToHHMM(actualArrival) || '-',
        actualDeparture: formatTimestampToHHMM(actualDeparture) || '-',
        visitTime: task.visitTime || '-',
        actualVisitTime: actualVisitTimeVal,
        realSequence: 0,
        isManualAssign: roSequence === 0,
        longlat: task.longlat,
      });
    }

    allTaskData.sort((a, b) => {
      const driverCompare = a.driver.localeCompare(b.driver);
      if (driverCompare !== 0) return driverCompare;
      const timeA = a.actualArrivalTimestamp || Infinity;
      const timeB = b.actualArrivalTimestamp || Infinity;
      return timeA - timeB;
    });

    let currentDriver = null;
    let rankCounter = 1;
    for (const row of allTaskData) {
      if (row.driver !== currentDriver) {
        currentDriver = row.driver;
        rankCounter = 1;
      }
      if (row.actualArrivalTimestamp !== null) {
        row.realSequence = rankCounter;
        rankCounter++;
      } else {
        row.realSequence = null;
      }
    }

    const tasksByNameMap = new Map();
    for (const task of allTaskData) {
      if (!tasksByNameMap.has(task.driver)) {
        tasksByNameMap.set(task.driver, []);
      }
      tasksByNameMap.get(task.driver).push(task);
    }

    const getSortGroup = (platStr) => {
      if (!platStr) return 1;
      const platUpper = platStr.toUpperCase();
      if (platUpper.includes('DM')) return 3;
      if (platUpper.includes('SEWA')) return 2;
      return 1;
    };

    let driverList = Array.from(driverStats.entries()).map(([driverName, stats]) => {
      return {
        plat: stats.plat,
        driver: driverName,
      };
    });

    driverList.sort((a, b) => {
      const groupA = getSortGroup(a.plat);
      const groupB = getSortGroup(b.plat);
      if (groupA !== groupB) {
        return groupA - groupB;
      }
      return (a.driver || '').localeCompare(b.driver || '');
    });

    const finalRows = [];
    const query = searchQuery.toLowerCase();

    for (const driverRow of driverList) {
      const driverName = driverRow.driver;
      const driverPlat = driverRow.plat;
      const driverTasks = tasksByNameMap.get(driverName) || [];
      const hubTimes = hubTimesMap.get(driverName) || {
        hubETD: '-',
        hubETA: '-',
        hubLongLat: null,
      };

      const isDriverMatch =
        driverName.toLowerCase().includes(query) ||
        (driverPlat && driverPlat.toLowerCase().includes(query));

      const matchingTasks = driverTasks.filter((t) => {
        if (isDriverMatch) return true;
        return t.customerName && t.customerName.toLowerCase().includes(query);
      });

      if (isEmpty(matchingTasks) && !isDriverMatch) continue;

      finalRows.push({
        type: 'HUB_START',
        driver: driverName,
        plat: driverPlat,
        time: hubTimes.hubETD,
        longlat: hubTimes.hubLongLat,
        customerName: 'HUB',
      });

      // FIX: Mengubah sorting agar murni berdasarkan Planned Sequence (roSequence)
      // Ini memperbaiki masalah urutan sequence yang melompat karena sebelumnya dipengaruhi status actual
      matchingTasks.sort((a, b) => {
        return (a.roSequence || 0) - (b.roSequence || 0);
      });

      matchingTasks.forEach((t) => {
        finalRows.push({
          type: 'TASK',
          ...t,
        });
      });

      finalRows.push({
        type: 'HUB_END',
        driver: driverName,
        plat: driverPlat,
        time: hubTimes.hubETA,
        longlat: hubTimes.hubLongLat,
        customerName: 'HUB',
      });

      finalRows.push({ type: 'SPACER' });
    }

    return finalRows;
  }, [loading, tasks, results, drivers, searchQuery]);

  const handleDownload = async () => {
    if (isEmpty(processedData)) return;

    setIsDownloading(true);
    try {
      await new Promise((r) => setTimeout(r, 100));
      downloadRoutingVsActual(processedData, t);
    } catch (e) {
      toastError('Gagal download:', e);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleOpenMap = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      toastWarning(t('dashboard.toast.view_map_warning'));
    }
    setIsMapModalOpen(true);
  };

  return (
    <div className="flex-1 flex flex-col h-full space-y-4">
      <div className="flex flex-col md:flex-row w-full justify-end items-center gap-3 mb-2">
        <div className="w-full md:w-64 order-1">
          <SearchBar
            disabled={loading || isDownloading}
            onChange={(val) => setSearchQuery(val)}
            placeholder={t('dashboard.tab.routingreal.search_placeholder')}
            value={searchQuery}
          />
        </div>
        <div className="w-full md:w-auto order-2">
          <button
            onClick={handleOpenMap}
            disabled={loading || isEmpty(processedData)}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-sky-50 text-sky-600 hover:bg-sky-100 border border-sky-200 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-400 disabled:text-white shadow-sm w-full md:w-42 cursor-pointer"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
              />
            </svg>
            {t('dashboard.tab.routingreal.show_map')}
          </button>
        </div>
        <div className="w-full md:w-auto order-3">
          <DownloadButton
            disabled={loading || isDownloading || isEmpty(processedData)}
            onClick={handleDownload}
            text={t('common.download_excel')}
          />
        </div>
      </div>
      <div className="overflow-auto h-full border rounded-lg shadow-sm bg-white">
        <table className="min-w-full text-xs text-left">
          <thead className="bg-gray-100 font-bold text-gray-700 sticky top-0 z-10 shadow-sm">
            <tr>
              <th className="px-4 py-3 border-b">{t('dashboard.tab.routingreal.flow')}</th>
              <th className="px-4 py-3 border-b">{t('dashboard.tab.routingreal.license')}</th>
              <th className="px-4 py-3 border-b">{t('dashboard.tab.routingreal.driver')}</th>
              <th className="px-4 py-3 border-b">{t('dashboard.tab.routingreal.customer')}</th>
              <th className="px-4 py-3 border-b">{t('dashboard.tab.routingreal.status')}</th>
              <th className="px-4 py-3 border-b text-center">
                {t('dashboard.tab.routingreal.open_time')}
              </th>
              <th className="px-4 py-3 border-b text-center">
                {t('dashboard.tab.routingreal.close_time')}
              </th>
              <th className="px-4 py-3 border-b text-center">
                {t('dashboard.tab.routingreal.eta')}
              </th>
              <th className="px-4 py-3 border-b text-center">
                {t('dashboard.tab.routingreal.actual_arrival')}
              </th>
              <th className="px-4 py-3 border-b text-center">
                {t('dashboard.tab.routingreal.etd')}
              </th>
              <th className="px-4 py-3 border-b text-center">
                {t('dashboard.tab.routingreal.actual_departure')}
              </th>
              <th className="px-4 py-3 border-b text-center">
                {t('dashboard.tab.routingreal.visit_plan')}
              </th>
              <th className="px-4 py-3 border-b text-center">
                {t('dashboard.tab.routingreal.visit_actual')}
              </th>
              <th className="px-4 py-3 border-b text-center">
                {t('dashboard.tab.routingreal.ro_seq')}
              </th>
              <th className="px-4 py-3 border-b text-center">
                {t('dashboard.tab.routingreal.actual_seq')}
              </th>
              <th className="px-4 py-3 border-b text-center">
                {t('dashboard.tab.routingreal.is_same')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {processedData.map((row, index) => {
              if (row.type === 'SPACER') {
                return <tr key={index} className="bg-gray-50 h-4 border-b border-gray-200"></tr>;
              }

              if (row.type === 'HUB_START' || row.type === 'HUB_END') {
                return (
                  <tr
                    key={index}
                    className="text-red-600 font-bold border-b border-gray-100 bg-white"
                  >
                    <td className="px-4 py-2"></td>
                    <td className="px-4 py-2"></td>
                    <td className="px-4 py-2"></td>
                    <td className="px-4 py-2">{!searchQuery ? 'HUB' : ''}</td>
                    <td className="px-4 py-2"></td>
                    <td className="px-4 py-2"></td>
                    <td className="px-4 py-2"></td>
                    <td className="px-4 py-2 text-center">{!searchQuery ? row.time : ''}</td>
                    <td className="px-4 py-2"></td>
                    <td className="px-4 py-2"></td>
                    <td className="px-4 py-2"></td>
                    <td className="px-4 py-2"></td>
                    <td className="px-4 py-2"></td>
                    <td className="px-4 py-2"></td>
                    <td className="px-4 py-2"></td>
                    <td className="px-4 py-2"></td>
                  </tr>
                );
              }

              const isMatch = row.roSequence == row.realSequence;
              const rowClass = row.isManualAssign ? 'bg-red-100' : 'hover:bg-gray-50';
              const realSeq = row.realSequence ?? '-';
              const realSeqEmpty = isEmpty(realSeq);
              const match = realSeqEmpty
                ? '-'
                : isMatch
                  ? t('dashboard.tab.routingreal.match')
                  : t('dashboard.tab.routingreal.mismatch');

              const cellContent = (
                <>
                  <td className="px-4 py-2">{row.flow}</td>
                  <td className="px-4 py-2">
                    <HighlightText text={row.plat} highlight={searchQuery} />
                  </td>
                  <td className="px-4 py-2 font-medium">
                    <HighlightText text={row.driver} highlight={searchQuery} />
                  </td>
                  <td className="px-4 py-2">
                    <HighlightText text={row.customerName} highlight={searchQuery} />
                  </td>
                  <td className="px-4 py-2">{row.statusLabel}</td>
                  <td className="px-4 py-2 text-center">{row.openTime}</td>
                  <td className="px-4 py-2 text-center">{row.closeTime}</td>
                  <td className="px-4 py-2 text-center">{row.eta}</td>
                  <td className="px-4 py-2 text-center">{row.actualArrival}</td>
                  <td className="px-4 py-2 text-center">{row.etd}</td>
                  <td className="px-4 py-2 text-center">{row.actualDeparture}</td>
                  <td className="px-4 py-2 text-center">{row.visitTime}</td>
                  <td className="px-4 py-2 text-center">{row.actualVisitTime}</td>
                  <td className="px-4 py-2 text-center font-semibold">
                    {isEmpty(row.roSequence) ? '-' : row.roSequence}
                  </td>
                  <td className="px-4 py-2 text-center font-semibold">{realSeq}</td>
                  <td
                    className={`px-4 py-2 text-center font-bold ${
                      isMatch ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {match}
                  </td>
                </>
              );

              if (row.isManualAssign) {
                return (
                  <Tooltip
                    key={index}
                    tooltipContent={t('dashboard.tab.routingreal.tooltip.manual')}
                  >
                    <tr className={`${rowClass} border-b border-gray-100 cursor-help`}>
                      {cellContent}
                    </tr>
                  </Tooltip>
                );
              }

              return (
                <tr key={index} className={`${rowClass} border-b border-gray-100`}>
                  {cellContent}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <RoutingMapModal
        data={processedData}
        isOpen={isMapModalOpen}
        onClose={() => setIsMapModalOpen(false)}
      />
    </div>
  );
}
