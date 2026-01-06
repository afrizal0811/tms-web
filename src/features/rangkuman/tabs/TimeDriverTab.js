// File: src/features/rangkuman/tabs/TimeDriverTab.js
'use client';

import { formatLongDate } from '@/lib/utils';
import { Fragment, useState } from 'react';
import TimeDriverModal from './modals/TimeDriverModal';

export default function TimeDriverTab({ data, translate, language }) {
  const { driverEmails, driverMap, dateKeys, dataMatrix } = data || {};
  const indoLang = language === 'id' ? 'id-ID' : 'en-GB';

  const [modalData, setModalData] = useState(null);

  const handleCellClick = (metrics, driverName, dateStr) => {
    if (metrics && metrics.entries && metrics.entries.length > 1) {
      setModalData({
        driverName,
        dateStr: formatLongDate(dateStr, indoLang),
        entries: metrics.entries,
      });
    }
  };

  const closeModal = () => setModalData(null);

  const isSunday = (dateStr) => {
    const d = new Date(dateStr);
    return d.getUTCDay() === 0;
  };

  const COLOR_A = 'bg-[#fae2d5]'; // Peach
  const COLOR_B = 'bg-[#dbe9f7]'; // Blue
  const COLOR_C = 'bg-[#f4cccc]'; // Red/Pink

  const thClass = 'border border-gray-300 px-2 py-2 text-center text-xs font-bold text-slate-700';
  const tdClass =
    'border border-gray-200 px-2 py-1 text-center text-xs text-slate-700 whitespace-nowrap';

  const stickyHeaderType = 'sticky top-0 left-0 z-40';
  const stickyHeaderPlate = 'sticky top-0 left-[80px] z-40';
  const stickyHeaderDriver = 'sticky top-0 left-[180px] z-40';
  const stickyBodyType = 'sticky left-0 z-20 border-r';
  const stickyBodyPlate = 'sticky left-[80px] z-20 border-r';
  const stickyBodyDriver = 'sticky left-[180px] z-20 border-r shadow-md';

  return (
    <div className="rounded-b-xl overflow-auto border border-gray-300 m-0 h-full relative">
      <TimeDriverModal isOpen={!!modalData} onClose={closeModal} data={modalData} translate={translate} />

      <table className="border-collapse w-full text-sm">
        <thead className="sticky top-0 z-30 bg-gray-100">
          {/* Row 1: Headers */}
          <tr>
            <th rowSpan="2" className={`${thClass} min-w-20 ${stickyHeaderType} ${COLOR_A}`}>
              {translate('summary.tabs.time_driver.temp')}
            </th>
            <th rowSpan="2" className={`${thClass} min-w-[100px] ${stickyHeaderPlate} ${COLOR_A}`}>
              {translate('summary.tabs.time_driver.lisence')}
            </th>
            <th
              rowSpan="2"
              className={`${thClass} min-w-[200px] ${stickyHeaderDriver} ${COLOR_A} border-r-2 border-slate-400`}
            >
              {translate('summary.tabs.time_driver.driver')}
            </th>

            {dateKeys.map((d, i) => {
              const headerColor = isSunday(d.str) ? COLOR_C : COLOR_B;
              const date = formatLongDate(d.str, indoLang);
              return (
                <th
                  key={i}
                  colSpan="3"
                  className={`${thClass} border-l-2 border-l-gray-400 ${headerColor}`}
                >
                  {date}
                </th>
              );
            })}
          </tr>
          {/* Row 2: Sub-headers */}
          <tr>
            {dateKeys.map((d, i) => {
              const metricColor = isSunday(d.str) ? COLOR_C : COLOR_A;
              return (
                <Fragment key={i}>
                  <th className={`${thClass} ${metricColor} border-l-2 border-l-gray-400`}>
                    {translate('summary.tabs.time_driver.start_time')}
                  </th>
                  <th className={`${thClass} ${metricColor}`}>
                    {translate('summary.tabs.time_driver.finish_time')}
                  </th>
                  <th className={`${thClass} ${metricColor}`}>
                    {translate('summary.tabs.time_driver.duration')}
                  </th>
                </Fragment>
              );
            })}
          </tr>
        </thead>

        <tbody className="bg-white">
          {driverEmails.map((email) => {
            const driver = driverMap[email];
            return (
              <tr key={email} className="hover:bg-gray-50">
                <td className={`${tdClass} ${stickyBodyType} bg-white`}>{driver.type}</td>
                <td className={`${tdClass} ${stickyBodyPlate} bg-white`}>{driver.plat}</td>
                <td
                  className={`${tdClass} ${stickyBodyDriver} text-left border-r-2 border-slate-400 bg-white`}
                >
                  {driver.name}
                </td>

                {/* Data Loop */}
                {dateKeys.map((d, i) => {
                  const metrics = dataMatrix[d.str][email];
                  const isSun = isSunday(d.str);

                  // Default Colors
                  let cellBg = isSun ? COLOR_C : '';
                  const emptyBg = isSun ? COLOR_C : 'bg-gray-50';

                  // Cek Multiple Entries
                  const hasMultiple = metrics && metrics.entries && metrics.entries.length > 1;

                  // 1. KONDISI: DATA KOSONG
                  if (!metrics || !metrics.hasData) {
                    return (
                      <Fragment key={i}>
                        <td className={`${tdClass} border-l-2 border-l-gray-400 ${emptyBg}`}></td>
                        <td className={`${tdClass} ${emptyBg}`}></td>
                        <td className={`${tdClass} ${emptyBg}`}></td>
                      </Fragment>
                    );
                  }

                  // 2. KONDISI: MULTIPLE DATA (MERGE CELLS)
                  if (hasMultiple) {
                    return (
                      <td
                        key={i}
                        colSpan={3} // Merge 3 Kolom
                        onClick={() => handleCellClick(metrics, driver.name, d.str)}
                        className={`${tdClass} border-l-2 border-l-gray-400 bg-red-500 text-white font-bold cursor-pointer hover:opacity-80 transition-opacity`}
                      >
                        {translate('common.click_for_detail')} 
                      </td>
                    );
                  }

                  // 3. KONDISI: SINGLE DATA (NORMAL)
                  return (
                    <Fragment key={i}>
                      <td className={`${tdClass} border-l-2 border-l-gray-400 ${cellBg}`}>
                        {metrics.startDisplay}
                      </td>
                      <td className={`${tdClass} ${cellBg}`}>
                        {metrics.finishDisplay}
                        {metrics.dayDiff > 0 && (
                          <span className="text-red-600 text-[10px] ml-1 font-bold">
                            (+{metrics.dayDiff})
                          </span>
                        )}
                      </td>
                      <td className={`${tdClass} ${cellBg} font-medium`}>
                        {metrics.durationDisplay}
                      </td>
                    </Fragment>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
