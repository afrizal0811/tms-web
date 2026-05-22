'use client';

import { formatLongDate, getBasePlate } from '@/lib/utils';
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

  const COLOR_A = 'bg-[#fae2d5] dark:bg-[#3f2113]';
  const COLOR_B = 'bg-[#dbe9f7] dark:bg-[#15233b]';
  const COLOR_C = 'bg-[#f4cccc] dark:bg-[#451a1a]';

  const thClass =
    'border border-gray-300 dark:border-slate-700 px-2 py-2 text-center text-xs font-bold text-slate-700 dark:text-slate-200';
  const tdClass =
    'border border-gray-200 dark:border-slate-700 px-2 py-1 text-center text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap';

  const stickyHeaderType = 'md:sticky md:left-0 md:z-40';
  const stickyHeaderPlate = 'md:sticky md:left-[80px] md:z-40';
  const stickyHeaderDriver = 'md:sticky md:left-[180px] md:z-40';
  const stickyBodyType = 'md:sticky md:left-0 md:z-20 md:border-r dark:md:border-r-slate-700';
  const stickyBodyPlate = 'md:sticky md:left-[80px] md:z-20 md:border-r dark:md:border-r-slate-700';
  const stickyBodyDriver =
    'md:sticky md:left-[180px] md:z-20 md:border-r dark:md:border-r-slate-700 md:shadow-md';

  return (
    <div className="rounded-b-xl overflow-auto border border-gray-300 dark:border-slate-700 m-0 h-full relative">
      <TimeDriverModal
        isOpen={!!modalData}
        onClose={closeModal}
        data={modalData}
        translate={translate}
      />

      <table className="border-collapse w-full text-sm">
        <thead className="sticky top-0 z-30 bg-gray-100 dark:bg-slate-800">
          <tr>
            <th rowSpan="2" className={`${thClass} min-w-20 ${stickyHeaderType} ${COLOR_A}`}>
              {translate('common.storage_type')}
            </th>
            <th rowSpan="2" className={`${thClass} min-w-[100px] ${stickyHeaderPlate} ${COLOR_A}`}>
              {translate('common.license_number')}
            </th>
            <th
              rowSpan="2"
              className={`${thClass} min-w-[200px] ${stickyHeaderDriver} ${COLOR_A} border-r-2 border-slate-400 dark:border-slate-600`}
            >
              {translate('common.driver')}
            </th>

            {dateKeys.map((d, i) => {
              const headerColor = isSunday(d.str) ? COLOR_C : COLOR_B;
              const date = formatLongDate(d.str, indoLang);
              return (
                <th
                  key={i}
                  colSpan="3"
                  className={`${thClass} border-l-2 border-l-gray-400 dark:border-l-slate-600 ${headerColor}`}
                >
                  {date}
                </th>
              );
            })}
          </tr>
          <tr>
            {dateKeys.map((d, i) => {
              const metricColor = isSunday(d.str) ? COLOR_C : COLOR_A;
              return (
                <Fragment key={i}>
                  <th
                    className={`${thClass} ${metricColor} border-l-2 border-l-gray-400 dark:border-l-slate-600`}
                  >
                    {translate('common.start_time')}
                  </th>
                  <th className={`${thClass} ${metricColor}`}>{translate('common.finish_time')}</th>
                  <th className={`${thClass} ${metricColor}`}>
                    {translate('summary.tabs.time_driver.duration')}
                  </th>
                </Fragment>
              );
            })}
          </tr>
        </thead>

        <tbody className="bg-white dark:bg-slate-800">
          {driverEmails.map((email) => {
            const driver = driverMap[email];
            return (
              <tr key={email} className="hover:bg-gray-50 dark:hover:bg-slate-700/10">
                <td className={`${tdClass} ${stickyBodyType} bg-white dark:bg-slate-800`}>
                  {driver.type}
                </td>
                <td className={`${tdClass} ${stickyBodyPlate} bg-white dark:bg-slate-800`}>
                  {getBasePlate(driver.plat)}
                </td>
                <td
                  className={`${tdClass} ${stickyBodyDriver} text-left md:border-r-2 md:border-slate-400 dark:md:border-slate-600 bg-white dark:bg-slate-800`}
                >
                  {driver.name}
                </td>

                {dateKeys.map((d, i) => {
                  const metrics = dataMatrix[d.str][email];
                  const isSun = isSunday(d.str);

                  let cellBg = isSun ? COLOR_C : '';
                  const emptyBg = isSun ? COLOR_C : 'bg-gray-50 dark:bg-slate-800/50';

                  const hasMultiple = metrics && metrics.entries && metrics.entries.length > 1;

                  if (!metrics || !metrics.hasData) {
                    return (
                      <Fragment key={i}>
                        <td
                          className={`${tdClass} border-l-2 border-l-gray-400 dark:border-l-slate-600 ${emptyBg}`}
                        ></td>
                        <td className={`${tdClass} ${emptyBg}`}></td>
                        <td className={`${tdClass} ${emptyBg}`}></td>
                      </Fragment>
                    );
                  }

                  if (hasMultiple) {
                    return (
                      <td
                        key={i}
                        colSpan={3}
                        onClick={() => handleCellClick(metrics, driver.name, d.str)}
                        className={`${tdClass} border-l-2 border-l-gray-400 dark:border-l-slate-600 bg-red-500 dark:bg-red-700 text-white font-bold cursor-pointer hover:opacity-80 transition-opacity`}
                      >
                        {translate('common.click_for_detail')}
                      </td>
                    );
                  }

                  return (
                    <Fragment key={i}>
                      <td
                        className={`${tdClass} border-l-2 border-l-gray-400 dark:border-l-slate-600 ${cellBg}`}
                      >
                        {metrics.startDisplay}
                      </td>
                      <td className={`${tdClass} ${cellBg}`}>
                        {metrics.finishDisplay}
                        {metrics.dayDiff > 0 && (
                          <span className="text-red-600 dark:text-red-400 text-[10px] ml-1 font-bold">
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
