'use client';

import HighlightText from '@/components/HighlightText';
import SearchBar from '@/components/SearchBar';
import Spinner from '@/components/Spinner';
import Tooltip from '@/components/Tooltip';
import { formatSimpleTime, formatTimestampToHHMM, normalizeEmail } from '@/lib/utils';
import { useMemo, useState } from 'react';

export default function RoutingVsActualTab({ loading, tasks, results, drivers }) {
  const [searchQuery, setSearchQuery] = useState('');

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
            if (!driverName || !Array.isArray(route.trips) || route.trips.length === 0) continue;

            const hubTrips = route.trips.filter((trip) => trip.isHub === true);
            if (hubTrips.length > 0) {
              const hubETD = hubTrips[0].etd;
              const hubETA = hubTrips[hubTrips.length - 1].eta;
              hubTimesMap.set(driverName, {
                hubETD: formatSimpleTime(hubETD) || '-',
                hubETA: formatSimpleTime(hubETA) || '-',
              });
            }
          }
        }
      }
    }

    const driverStats = new Map();
    const allTaskData = [];

    for (const task of tasks) {
      const emailString =
        Array.isArray(task.assignee) && task.assignee.length > 0 ? task.assignee[0] : null;
      const driverEmail = normalizeEmail(emailString);
      const driverInfo = driverEmail ? emailToDriverMap[driverEmail] : null;
      const driverName = driverInfo ? driverInfo.name : driverEmail || 'N/A';
      const statusLabel = task.label && task.label.length > 0 ? task.label[0].toUpperCase() : null;
      const customerName = task.customerName || '';
      const flow = task.flow;

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
      const hubTimes = hubTimesMap.get(driverName) || { hubETD: '-', hubETA: '-' };

      const isDriverMatch =
        driverName.toLowerCase().includes(query) ||
        (driverPlat && driverPlat.toLowerCase().includes(query));

      const matchingTasks = driverTasks.filter((t) => {
        if (isDriverMatch) return true;
        return t.customerName && t.customerName.toLowerCase().includes(query);
      });

      if (matchingTasks.length === 0 && !isDriverMatch) continue;

      finalRows.push({
        type: 'HUB_START',
        driver: driverName,
        plat: driverPlat,
        time: hubTimes.hubETD,
      });

      matchingTasks.sort((a, b) => a.roSequence - b.roSequence);

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
      });

      finalRows.push({ type: 'SPACER' });
    }

    return finalRows;
  }, [loading, tasks, results, drivers, searchQuery]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <Spinner />
        <p className="text-gray-500 mt-4">Memproses data Routing vs Aktual...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Gunakan SearchBar yang lebih universal */}
      <div className="flex justify-end">
        <SearchBar
          value={searchQuery}
          onChange={(val) => setSearchQuery(val)}
          placeholder="Cari Plat, Driver, atau Customer"
        />
      </div>

      {processedData.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-gray-400 border rounded-lg bg-gray-50">
          <p>Tidak ada data yang cocok dengan pencarian.</p>
        </div>
      ) : (
        <div className="overflow-auto h-full border rounded-lg shadow-sm bg-white">
          <table className="min-w-full text-xs text-left">
            <thead className="bg-gray-100 font-bold text-gray-700 sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-4 py-3 border-b">Flow</th>
                <th className="px-4 py-3 border-b">Plat</th>
                <th className="px-4 py-3 border-b">Driver</th>
                <th className="px-4 py-3 border-b">Customer</th>
                <th className="px-4 py-3 border-b">Status</th>
                <th className="px-4 py-3 border-b text-center">Open</th>
                <th className="px-4 py-3 border-b text-center">Close</th>
                <th className="px-4 py-3 border-b text-center">ETA</th>
                <th className="px-4 py-3 border-b text-center">Arrival</th>
                <th className="px-4 py-3 border-b text-center">ETD</th>
                <th className="px-4 py-3 border-b text-center">Departure</th>
                <th className="px-4 py-3 border-b text-center">Visit Time</th>
                <th className="px-4 py-3 border-b text-center">Act Visit</th>
                <th className="px-4 py-3 border-b text-center">RO Seq</th>
                <th className="px-4 py-3 border-b text-center">Real Seq</th>
                <th className="px-4 py-3 border-b text-center">Match?</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {processedData.map((row, index) => {
                if (row.type === 'SPACER') {
                  return <tr key={index} className="bg-gray-50 h-4 border-b border-gray-200"></tr>;
                }

                if (row.type === 'HUB_START') {
                  return (
                    <tr
                      key={index}
                      className="text-red-600 font-bold border-b border-gray-100 bg-white"
                    >
                      <td className="px-4 py-2"></td>
                      <td className="px-4 py-2"></td>
                      <td className="px-4 py-2"></td>
                      <td className="px-4 py-2">HUB</td>
                      <td className="px-4 py-2"></td>
                      <td className="px-4 py-2"></td>
                      <td className="px-4 py-2"></td>
                      <td className="px-4 py-2"></td>
                      <td className="px-4 py-2"></td>
                      <td className="px-4 py-2 text-center">{row.time}</td>
                      <td className="px-4 py-2"></td>
                      <td className="px-4 py-2"></td>
                      <td className="px-4 py-2"></td>
                      <td className="px-4 py-2"></td>
                      <td className="px-4 py-2"></td>
                      <td className="px-4 py-2"></td>
                    </tr>
                  );
                }

                if (row.type === 'HUB_END') {
                  return (
                    <tr
                      key={index}
                      className="text-red-600 font-bold border-b border-gray-100 bg-white"
                    >
                      <td className="px-4 py-2"></td>
                      <td className="px-4 py-2"></td>
                      <td className="px-4 py-2"></td>
                      <td className="px-4 py-2">HUB</td>
                      <td className="px-4 py-2"></td>
                      <td className="px-4 py-2"></td>
                      <td className="px-4 py-2"></td>
                      <td className="px-4 py-2 text-center">{row.time}</td>
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
                    <td className="px-4 py-2 text-center font-semibold">{row.roSequence}</td>
                    <td className="px-4 py-2 text-center font-semibold">
                      {row.realSequence ?? '-'}
                    </td>
                    <td
                      className={`px-4 py-2 text-center font-bold ${
                        isMatch ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {isMatch ? 'SAMA' : 'BEDA'}
                    </td>
                  </>
                );

                if (row.isManualAssign) {
                  return (
                    <Tooltip key={index} tooltipContent="Manual Assign">
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
      )}
    </div>
  );
}
