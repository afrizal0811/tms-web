import { formatLongDate, formatMinutesToHHMM, getBasePlate } from '@/lib/utils';
import { Fragment, useState } from 'react';
import TruckDetailModal from './modals/TruckDetailModal';

export default function TruckDetailTab({ data, translate, localeCode }) {
  const { driverEmails, driverMap, dateKeys, dataMatrix } = data || {};
  const [modalData, setModalData] = useState(null);

  const handleCellClick = (metrics, driverName, dateStr) => {
    if (metrics && metrics.taskList && metrics.taskList.length > 0) {
      setModalData({ driverName, dateStr, tasks: metrics.taskList });
    }
  };
  const closeModal = () => setModalData(null);
  const percentage = (data, maxData) => ((data / maxData) * 100).toFixed(1) + '%';
  const isSunday = (dateStr) => {
    if (!dateStr) return false;
    const date = new Date(dateStr);
    return date.getUTCDay() === 0;
  };

  const errorColor = [
    {
      name: 'blue',
      colors: 'bg-[#4F76C7] text-white dark:bg-[#325296]',
    },
    {
      name: 'magenta',
      colors: 'bg-[#C85D86] text-white dark:bg-[#964263]',
    },
    {
      name: 'indigo',
      colors: 'bg-[#5C5FB2] text-white dark:bg-[#45488c]',
    },
  ];
  const displayData = [
    {
      key: 'weight',
      border: true,
      getValue: (m) => (m?.maxWeight > 0 ? percentage(m.weight, m.maxWeight) : '-'),
    },
    {
      key: 'volume',
      getValue: (m) => (m?.maxVolume > 0 ? percentage(m.volume, m.maxVolume) : '-'),
    },
    {
      key: 'distance',
      getValue: (m) => m?.dist?.toLocaleString(),
    },
    {
      key: 'total_outlet',
      getValue: (m) => m?.outlets,
    },
    {
      key: 'total_delivery',
      getValue: (m) => m?.delivered,
    },
    {
      key: 'ship_duration',
      getValue: (m) => formatMinutesToHHMM(m?.duration),
    },
    {
      key: 'delivered',
      getValue: (m) => (m?.outlets > 0 ? percentage(m.delivered, m.outlets) : '-'),
    },
  ];
  const titleColor = 'bg-[#fae2d5] dark:bg-[#3f2113]';
  const dateColor = 'bg-[#dbe9f7] dark:bg-[#15233b]';
  const holidayColor = 'bg-[#f4cccc] dark:bg-[#451a1a]';
  const thClass =
    'border border-gray-300 dark:border-slate-700 px-2 py-2 text-center text-xs font-bold text-slate-700 dark:text-slate-200';
  const thMetricClass =
    'border border-gray-300 dark:border-slate-700 px-2 py-2 text-center text-xs font-bold text-slate-700 dark:text-slate-200';
  const tdClass =
    'border border-gray-200 dark:border-slate-700 px-2 py-1 text-center text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap';
  const tdClickable = `${tdClass} cursor-pointer hover:opacity-80 transition-opacity`;

  const stickyType = 'md:sticky md:left-0 md:z-20 md:border-r dark:md:border-r-slate-700';
  const stickyPlate = 'md:sticky md:left-[80px] md:z-20 md:border-r dark:md:border-r-slate-700';
  const stickyDriver =
    'md:sticky md:left-[260px] md:z-20 md:border-r dark:md:border-r-slate-700 md:shadow-md';

  return (
    <div className="w-full h-full flex flex-col relative p-0">
      <TruckDetailModal
        data={modalData}
        isOpen={!!modalData}
        localeCode={localeCode}
        onClose={closeModal}
        translate={translate}
      />
      <div className="overflow-auto flex-1 rounded-b-xl border border-gray-200 dark:border-slate-700">
        <table className="border-collapse border-0 text-sm whitespace-nowrap">
          <thead className="sticky top-0 z-30 bg-gray-100 dark:bg-slate-800">
            <tr>
              <th
                rowSpan="2"
                className={`${thClass} min-w-20 md:sticky md:left-0 md:z-40 ${titleColor}`}
              >
                {translate('common.storage_type')}
              </th>
              <th
                rowSpan="2"
                className={`${thClass} min-w-[180px] md:sticky md:left-20 md:z-40 ${titleColor}`}
              >
                {translate('common.license_number')}
              </th>
              <th
                rowSpan="2"
                className={`${thClass} min-w-[200px] md:sticky md:left-[260px] md:z-40 ${titleColor} md:border-r-2 md:border-slate-400 dark:md:border-slate-600`}
              >
                {translate('common.driver')}
              </th>
              {dateKeys.map((d, i) => {
                const headerColor = isSunday(d.str) ? holidayColor : dateColor;
                const date = formatLongDate(d.str, localeCode);
                return (
                  <th
                    key={i}
                    colSpan="7"
                    className={`${thClass} border-l-2 border-l-gray-400 dark:border-l-slate-600 ${headerColor}`}
                  >
                    {date}
                  </th>
                );
              })}
            </tr>
            <tr>
              {dateKeys.map((d, i) => {
                const metricColor = isSunday(d.str) ? holidayColor : titleColor;
                return (
                  <Fragment key={`${d.day}-${i}-header`}>
                    {displayData.map(({ key, border }) => (
                      <th
                        key={key}
                        className={`${thMetricClass} ${metricColor} ${
                          border ? 'border-l-2 border-l-gray-400 dark:border-l-slate-600' : ''
                        }`}
                      >
                        {translate(`summary.tabs.truck_detail.${key}`)}
                      </th>
                    ))}
                  </Fragment>
                );
              })}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-slate-800">
            {driverEmails.map((email) => {
              const driver = driverMap[email];
              return (
                <tr key={email} className="hover:bg-gray-50 dark:hover:bg-slate-800">
                  <td className={`${tdClass} ${stickyType} bg-white dark:bg-slate-800`}>
                    {driver.type}
                  </td>
                  <td className={`${tdClass} ${stickyPlate} bg-white dark:bg-slate-800`}>
                    {getBasePlate(driver.plat)}
                  </td>
                  <td
                    className={`${tdClass} ${stickyDriver} bg-white dark:bg-slate-800 text-left md:border-r-2 md:border-slate-400 dark:md:border-slate-600`}
                  >
                    {driver.name}
                  </td>

                  {dateKeys.map((d, i) => {
                    const metrics = dataMatrix[d.str][email];
                    const outletData = metrics?.outlets;
                    const onClick = () => handleCellClick(metrics, driver.name, d.display);

                    const isSun = isSunday(d.str);
                    let cellBg = isSun ? holidayColor : '';
                    const emptyBg = isSun ? holidayColor : 'bg-gray-50 dark:bg-slate-800';

                    if (metrics && outletData > 0) {
                      if (metrics.hasManualError && metrics.hasBedaHariError)
                        cellBg = errorColor.find((item) => item.name === 'indigo')?.colors;
                      else if (metrics.hasManualError)
                        cellBg = errorColor.find((item) => item.name === 'blue')?.colors;
                      else if (metrics.hasBedaHariError)
                        cellBg = errorColor.find((item) => item.name === 'magenta')?.colors;
                    }

                    if (!metrics || outletData === 0) {
                      return (
                        <Fragment key={`${d.day}-${i}-empty`}>
                          {displayData.map(({ key, border }) => (
                            <td
                              key={key}
                              className={`${tdClass} ${emptyBg} ${
                                border ? 'border-l-2 border-l-gray-400 dark:border-l-slate-600' : ''
                              }`}
                            ></td>
                          ))}
                        </Fragment>
                      );
                    }

                    return (
                      <Fragment key={`${d.day}-${i}-data`}>
                        {displayData.map(({ key, border, getValue }) => (
                          <td
                            key={key}
                            onClick={onClick}
                            className={`${tdClickable} ${cellBg} ${border ? 'border-l-2 border-l-gray-400 dark:border-l-slate-600' : ''}`}
                          >
                            {getValue(metrics)}
                          </td>
                        ))}
                      </Fragment>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="px-4 py-3 bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700 rounded-b-lg shadow-sm shrink-0">
        <div>
          <div className="flex flex-col justify-between gap-2 pb-1">
            <div className="text-xs text-slate-500 dark:text-slate-400 italic">
              *{translate('summary.tabs.truck_detail.click_row_hint')}
            </div>
            <h4 className="text-xs font-bold mb-2 text-slate-700 dark:text-slate-200">
              {translate('summary.tabs.truck_detail.color_exp')}
            </h4>
          </div>
          <div className="flex flex-col lg:flex-row lg:justify-start gap-x-6 gap-y-2 text-xs text-slate-600 dark:text-slate-300">
            {errorColor.map((color, i) => (
              <div key={i} className="flex items-center gap-2">
                <span
                  className={`w-4 h-4 border border-gray-400 dark:border-slate-600 rounded-sm ${color.colors}`}
                />
                <span>{translate(`summary.tabs.truck_detail.${color.name}`)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
