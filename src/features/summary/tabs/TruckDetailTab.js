import Tooltip from '@/components/Tooltip';
import { formatLongDate, formatMinutesToHHMM, getBasePlate } from '@/lib/utils';
import { Fragment, useState } from 'react';
import TruckDetailModal from './modals/TruckDetailModal';
import { toastError, toastSuccess } from '@/lib/toast';

export default function TruckDetailTab({ data, translate, localeCode }) {
  const { driverEmails, driverMap, dateKeys, dataMatrix } = data || {};
  const [modalData, setModalData] = useState(null);
  const [openDropdown, setOpenDropdown] = useState(null);

  const handleCellClick = (metrics, driverName, dateStr) => {
    if (metrics && metrics.taskList && metrics.taskList.length > 0) {
      setModalData({ driverName, dateStr, tasks: metrics.taskList });
    }
  };
  const closeModal = () => setModalData(null);
  const percentage = (data, maxData) => ((data / maxData) * 100).toFixed(1) + '%';

  const isPastDate = (dateStr) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const currentMidnight = new Date(y, m - 1, d);
    currentMidnight.setHours(0, 0, 0, 0);
    return currentMidnight < new Date().setHours(0, 0, 0, 0);
  };

  const isDayEmpty = (dateStr) => {
    if (!dataMatrix || !dataMatrix[dateStr]) return true;
    return driverEmails.every((email) => {
      const metrics = dataMatrix[dateStr][email];
      return !metrics || (metrics.outlets || 0) === 0;
    });
  };

  const checkHolidayStatus = (dateStr) => {
    if (!dateStr) return { isHoliday: false, isDynamic: false, isSunday: false };
    const [y, m, day] = dateStr.split('-').map(Number);
    const safeDate = new Date(y, m - 1, day);
    const isSunday = safeDate.getDay() === 0;

    const isDynamic = !isSunday && isPastDate(dateStr) && isDayEmpty(dateStr);
    return {
      isHoliday: isSunday || isDynamic,
      isDynamic,
      isSunday,
    };
  };

  const handleCopyRoutingName = async (routingName) => {
    if (!routingName) return;
    try {
      await navigator.clipboard.writeText(routingName);
      toastSuccess(`${translate('common.copied')}: ${routingName}`);
    } catch (err) {
      toastError(`${translate('common.toast.error')}: ${err.message}`);
    }
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
    'border border-gray-300 dark:border-slate-700 px-2 py-1 text-center text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap';
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
      <div className="overflow-auto flex-1">
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
                const { isHoliday, isDynamic } = checkHolidayStatus(d.str);
                const headerColor = isHoliday ? holidayColor : dateColor;
                const dateText = formatLongDate(d.str, localeCode);

                let headerContent;
                if (isDynamic) {
                  headerContent = (
                    <Tooltip tooltipContent={translate('summary.tabs.task_summary.caution')}>
                      <span className="cursor-help border-b-2 border-dotted border-red-900 dark:border-red-300 pb-0.5">
                        {dateText}
                      </span>
                    </Tooltip>
                  );
                } else if (d.routingNames && d.routingNames.length > 0 && !isHoliday) {
                  headerContent = (
                    <div className="relative inline-flex items-center justify-center">
                      <span
                        onClick={() => setOpenDropdown(openDropdown === d.str ? null : d.str)}
                        className="cursor-pointer border-b-2 border-dotted border-blue-600 dark:border-blue-400 pb-0.5 hover:text-blue-600 dark:hover:text-blue-400 transition-colors inline-flex items-center gap-1"
                      >
                        {dateText}
                        <svg
                          className={`w-3 h-3 transition-transform ${openDropdown === d.str ? 'rotate-180' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </span>

                      {openDropdown === d.str && (
                        <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 shadow-lg rounded-md py-1 z-50 w-[180px] flex flex-col font-normal">
                          <div className="p-2 font-bold">{translate('common.routing_name')}</div>
                          {d.routingNames.map((rName, rIdx) => {
                            return (
                              <div
                                key={rIdx}
                                onClick={() => {
                                  handleCopyRoutingName(rName);
                                  setOpenDropdown(null);
                                }}
                                className="w-full p-2.5 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs text-slate-700 dark:text-slate-200 cursor-pointer border-b last:border-0 border-gray-100 dark:border-slate-700/50"
                                title={rName}
                              >
                                <span className="block w-full truncate text-center">{rName}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                } else {
                  headerContent = <span>{dateText}</span>;
                }

                return (
                  <th
                    key={i}
                    colSpan="7"
                    className={`${thClass} border-l-2 border-l-gray-400 dark:border-l-slate-600 ${headerColor}`}
                  >
                    {headerContent}
                  </th>
                );
              })}
            </tr>
            <tr>
              {dateKeys.map((d, i) => {
                const { isHoliday } = checkHolidayStatus(d.str);
                const metricColor = isHoliday ? holidayColor : titleColor;
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
            {driverEmails.map((email, rowIndex) => {
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

                    const { isHoliday, isSunday } = checkHolidayStatus(d.str);
                    const dayIsEmpty = isDayEmpty(d.str);
                    const shouldMergeHoliday = isHoliday && dayIsEmpty;

                    let cellBg = isHoliday ? holidayColor : '';
                    const emptyBg = isHoliday ? holidayColor : 'bg-gray-50 dark:bg-slate-800';

                    if (metrics && outletData > 0) {
                      if (metrics.hasManualError && metrics.hasBedaHariError)
                        cellBg = errorColor.find((item) => item.name === 'indigo')?.colors;
                      else if (metrics.hasManualError)
                        cellBg = errorColor.find((item) => item.name === 'blue')?.colors;
                      else if (metrics.hasBedaHariError)
                        cellBg = errorColor.find((item) => item.name === 'magenta')?.colors;
                    }

                    if (shouldMergeHoliday) {
                      if (rowIndex === 0) {
                        return (
                          <td
                            key={`${d.str}-merged`}
                            rowSpan={driverEmails.length}
                            colSpan={displayData.length}
                            className={`border border-gray-300 dark:border-slate-700 px-2 py-1 text-center font-bold align-middle ${holidayColor} text-red-900 dark:text-red-300 border-l-2 border-l-gray-400 dark:border-l-slate-600`}
                          >
                            {isSunday
                              ? translate('common.holiday_sunday')
                              : translate('common.holiday')}
                          </td>
                        );
                      }
                      return null; // Skip sel untuk driver selanjutnya di kolom libur ini
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

      <div className="px-4 py-3 bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700 shadow-sm shrink-0">
        <div>
          <div className="flex flex-col justify-between gap-2 pb-1">
            <div className="text-xs text-slate-500 dark:text-slate-400 italic">
              *
              {translate('common.click_for_detail_param', {
                parameter: translate('summary.tabs.truck_detail.row'),
              })}
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
