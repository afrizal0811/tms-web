// File: features/rangkuman/tabs/TaskSummaryTab.js
'use client';

import Spinner from '@/components/Spinner';
import { useEffect, useMemo, useState } from 'react';
export default function TaskSummaryTab({ metrics, isLoading, progress, startDateStr, endDateStr }) {
  const [masterTruckData, setMasterTruckData] = useState({
    Dry: { Total: 0 },
    Frozen: { Total: 0 },
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('masterTruck');
        if (stored) {
          //eslint-disable-next-line
          setMasterTruckData(JSON.parse(stored));
        }
      } catch (e) {
        console.error('Failed to load masterTruck from storage', e);
      }
    }
  }, []);

  const allDates = useMemo(() => {
    if (!startDateStr || !endDateStr) return [];
    const dates = [];
    const current = new Date(startDateStr);
    const end = new Date(endDateStr);

    while (current <= end) {
      const dateObj = new Date(current);
      const day = dateObj.getDate().toString().padStart(2, '0');
      const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
      const year = dateObj.getFullYear();

      dates.push({
        key: `${year}-${month}-${day}`,
        display: `${day}-${month}-${year}`,
        dateObj: new Date(current),
        isSunday: dateObj.getDay() === 0,
      });
      current.setDate(current.getDate() + 1);
    }
    return dates;
  }, [startDateStr, endDateStr]);

  const getRoutingDateKey = (deliveryDateObj) => {
    const d = new Date(deliveryDateObj);
    const day = d.getDay();
    let offset = 1;
    if (day === 1) offset = 2;
    d.setDate(d.getDate() - offset);

    const y = d.getFullYear();
    const m = (d.getMonth() + 1).toString().padStart(2, '0');
    const da = d.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${da}`;
  };

  const renderValue = (val) => {
    if (isLoading && val === undefined) {
      return (
        <Spinner
          addClass="inline-block"
          border="border-2 border-slate-400 border-t-transparent"
          size="w-3 h-3"
        />
      );
    }
    return val || 0;
  };

  const calculatePct = (num, den) => {
    if (isLoading && (num === undefined || den === undefined)) {
      return (
        <Spinner
          addClass="inline-block"
          border="border-2 border-slate-400 border-t-transparent"
          size="w-3 h-3"
        />
      );
    }
    const n = num || 0;
    const d = den || 0;
    if (d === 0) return '0%';
    return ((n / d) * 100).toFixed(2) + '%';
  };

  const renderSundayRows = (key, display) => [
    <tr key={`${key}-sun-1`} className="bg-red-200 text-red-900 border-b border-gray-300">
      <td
        rowSpan={2}
        className="px-2 py-2 border border-gray-300 font-medium align-middle bg-red-200"
      >
        {display}
      </td>
      <td
        rowSpan={2}
        colSpan={17}
        className="px-2 py-2 border border-gray-300 font-bold text-center align-middle"
      >
        Libur (Minggu)
      </td>
    </tr>,
    <tr key={`${key}-sun-2`} className="bg-red-200 text-red-900"></tr>,
  ];

  // --- COLORS DEFINITION ---
  const cYellow = 'bg-[#fff2cc]';
  const cPink = 'bg-[#ead1dc]';
  const cGreen = 'bg-[#d9ead3]';
  const cRed = 'bg-[#f4cccc]';
  const cCyan = 'bg-[#d0e0e3]';
  const cBlue = 'bg-[#cfe2f3]';
  const cGray = 'bg-[#cccccc]';
  const cViolet = 'bg-[#d9d2e9]';

  return (
    <div className="w-full h-full flex flex-col bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {isLoading && (
        <div className="w-full h-1 bg-gray-100">
          <div
            className="h-full bg-emerald-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      <div className="flex-1 overflow-auto">
        <table className="min-w-full text-xs text-center border-collapse text-gray-700">
          <thead className="text-xs text-gray-700 uppercase sticky top-0 z-10 font-bold">
            <tr>
              <th className={`px-2 py-3 border border-gray-300 min-w-[100px] ${cYellow}`}>Date</th>
              <th className={`px-2 py-3 border border-gray-300 min-w-20 ${cYellow}`}>Type</th>
              <th className={`px-2 py-3 border border-gray-300 min-w-[60px] ${cPink}`}>DP</th>
              <th className={`px-2 py-3 border border-gray-300 min-w-[60px] ${cGreen}`}>DT</th>
              <th className={`px-2 py-3 border border-gray-300 min-w-[60px] ${cGreen}`}>% DT</th>
              <th className={`px-2 py-3 border border-gray-300 min-w-[60px] ${cRed}`}>MA</th>
              <th className={`px-2 py-3 border border-gray-300 min-w-[60px] ${cRed}`}>% MA</th>
              <th className={`px-2 py-3 border border-gray-300 min-w-[60px] ${cCyan}`}>RT</th>
              <th className={`px-2 py-3 border border-gray-300 min-w-[60px] ${cCyan}`}>% RT</th>
              <th className={`px-2 py-3 border border-gray-300 min-w-[60px] ${cBlue}`}>CO</th>
              <th className={`px-2 py-3 border border-gray-300 min-w-[60px] ${cBlue}`}>% CO</th>
              <th className={`px-2 py-3 border border-gray-300 min-w-[60px] ${cGray}`}>PR</th>
              <th className={`px-2 py-3 border border-gray-300 min-w-[60px] ${cGray}`}>% PR</th>
              <th className={`px-2 py-3 border border-gray-300 min-w-[60px] ${cYellow}`}>MT</th>
              <th className={`px-2 py-3 border border-gray-300 min-w-[60px] ${cYellow}`}>TV</th>
              <th className={`px-2 py-3 border border-gray-300 min-w-[60px] ${cYellow}`}>VA</th>
              <th className={`px-2 py-3 border border-gray-300 min-w-[60px] ${cViolet}`}>TVU</th>
              <th className={`px-2 py-3 border border-gray-300 min-w-[60px] ${cViolet}`}>% TVU</th>
            </tr>
          </thead>
          <tbody>
            {allDates.map((item) => {
              const { key, display, isSunday, dateObj } = item;
              if (isSunday) return renderSundayRows(key, display);

              const routingKey = getRoutingDateKey(dateObj);
              const data = metrics ? metrics[routingKey] : null;

              const d = data?.dry || {};
              const f = data?.frozen || {};

              const mtDry = masterTruckData.Dry?.Total || 0;
              const mtFrozen = masterTruckData.Frozen?.Total || 0;

              return [
                // ROW 1: DRY
                <tr key={`${key}-dry`} className="hover:bg-gray-50 bg-white">
                  <td
                    rowSpan={2}
                    className="px-2 py-2 border border-gray-300 font-medium align-middle bg-white"
                  >
                    {display}
                  </td>
                  <td className="px-2 py-2 border border-gray-300 font-semibold text-slate-600 bg-white">
                    Dry
                  </td>

                  <td className="px-2 py-2 border border-gray-300">{renderValue(d.dp)}</td>
                  <td className="px-2 py-2 border border-gray-300">{renderValue(d.dt_total)}</td>
                  <td className={`px-2 py-2 border border-gray-300 ${cGreen}`}>
                    {calculatePct(d.dt_total, d.dp)}
                  </td>

                  <td className="px-2 py-2 border border-gray-300">{renderValue(d.ma_total)}</td>
                  <td className={`px-2 py-2 border border-gray-300 ${cRed}`}>
                    {calculatePct(d.ma_total, d.dp)}
                  </td>

                  <td className="px-2 py-2 border border-gray-300">{renderValue(d.rt)}</td>
                  <td className={`px-2 py-2 border border-gray-300 ${cCyan}`}>
                    {calculatePct(d.rt, d.dp)}
                  </td>

                  <td className="px-2 py-2 border border-gray-300">{renderValue(d.co)}</td>
                  <td className={`px-2 py-2 border border-gray-300 ${cBlue}`}>
                    {calculatePct(d.co, d.dp)}
                  </td>

                  <td className="px-2 py-2 border border-gray-300">{renderValue(d.pr)}</td>
                  <td className={`px-2 py-2 border border-gray-300 ${cGray}`}>
                    {calculatePct(d.pr, d.dp)}
                  </td>

                  <td className="px-2 py-2 border border-gray-300 font-semibold">{mtDry}</td>
                  <td className="px-2 py-2 border border-gray-300">{renderValue(d.tv)}</td>
                  <td className="px-2 py-2 border border-gray-300">{renderValue(d.va)}</td>

                  <td className="px-2 py-2 border border-gray-300">{renderValue(d.tvu)}</td>
                  <td className={`px-2 py-2 border border-gray-300 ${cViolet}`}>
                    {calculatePct(d.tvu, mtDry)}
                  </td>
                </tr>,

                // ROW 2: FROZEN
                <tr key={`${key}-frozen`} className="hover:bg-gray-50 bg-white">
                  <td className="px-2 py-2 border border-gray-300 font-semibold text-slate-600 bg-white">
                    Frozen
                  </td>

                  <td className="px-2 py-2 border border-gray-300">{renderValue(f.dp)}</td>
                  <td className="px-2 py-2 border border-gray-300">{renderValue(f.dt_total)}</td>
                  <td className={`px-2 py-2 border border-gray-300 ${cGreen}`}>
                    {calculatePct(f.dt_total, f.dp)}
                  </td>

                  <td className="px-2 py-2 border border-gray-300">{renderValue(f.ma_total)}</td>
                  <td className={`px-2 py-2 border border-gray-300 ${cRed}`}>
                    {calculatePct(f.ma_total, f.dp)}
                  </td>

                  <td className="px-2 py-2 border border-gray-300">{renderValue(f.rt)}</td>
                  <td className={`px-2 py-2 border border-gray-300 ${cCyan}`}>
                    {calculatePct(f.rt, f.dp)}
                  </td>

                  <td className="px-2 py-2 border border-gray-300">{renderValue(f.co)}</td>
                  <td className={`px-2 py-2 border border-gray-300 ${cBlue}`}>
                    {calculatePct(f.co, f.dp)}
                  </td>

                  <td className="px-2 py-2 border border-gray-300">{renderValue(f.pr)}</td>
                  <td className={`px-2 py-2 border border-gray-300 ${cGray}`}>
                    {calculatePct(f.pr, f.dp)}
                  </td>

                  <td className="px-2 py-2 border border-gray-300 font-semibold">{mtFrozen}</td>
                  <td className="px-2 py-2 border border-gray-300">{renderValue(f.tv)}</td>
                  <td className="px-2 py-2 border border-gray-300">{renderValue(f.va)}</td>

                  <td className="px-2 py-2 border border-gray-300">{renderValue(f.tvu)}</td>
                  <td className={`px-2 py-2 border border-gray-300 ${cViolet}`}>
                    {calculatePct(f.tvu, mtFrozen)}
                  </td>
                </tr>,
              ];
            })}

            {allDates.length === 0 && (
              <tr>
                <td colSpan={18} className="px-6 py-8 text-center text-gray-400 italic">
                  Pilih bulan terlebih dahulu untuk melihat data.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
