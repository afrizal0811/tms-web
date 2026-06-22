'use client';

import Tooltip from '@/components/Tooltip';
import { toastError, toastSuccess } from '@/lib/toast';
import { formatLongDate } from '@/lib/utils';
import { useState } from 'react';
import AverageDistanceModal from './modals/AverageDistanceModal';

export default function AverageDistanceTab({ data, monthTotals, translate, localeCode }) {
  const defaultClass =
    'border border-gray-400 dark:border-slate-600 px-4 py-3 text-center text-slate-700 dark:text-slate-200 whitespace-nowrap';
  const defaultVioletClass = `${defaultClass} bg-[#d9d2e9] dark:bg-[#34205c]`;

  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState([]);
  const [modalTitle, setModalTitle] = useState('');
  const [openDropdown, setOpenDropdown] = useState(null);
  const [copiedKey, setCopiedKey] = useState(null);

  const handleCellClick = (details, dateStr, type) => {
    if (details && details.length > 0) {
      setModalData(details);
      setModalTitle(
        <div>
          <h3 className="text-lg font-bold">
            {translate('summary.tabs.average_km.modal.title')} - {type}
          </h3>
          <p className="text-slate-300 text-sm font-normal">
            {formatLongDate(dateStr, localeCode)}
          </p>
        </div>
      );
      setModalOpen(true);
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setModalData([]);
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

  const distanceConverter = (data) => {
    const distance = data.toLocaleString(localeCode, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return distance;
  };

  const distanceTable = (typeDetails, typeDate, typeDist, title) => {
    const hasTypeDist = typeDist > 0;
    const isDry = title === 'Dry';
    const normalColorClass = isDry
      ? 'bg-red-100 dark:bg-red-900/30'
      : 'bg-blue-100 dark:bg-blue-900/30';
    const hoverColorClass = isDry
      ? `hover:bg-red-200 dark:hover:bg-red-900/50`
      : `hover:bg-blue-200 dark:hover:bg-blue-900/50`;

    return (
      <td
        onClick={() => handleCellClick(typeDetails, typeDate, title)}
        className={`border border-gray-300 dark:border-slate-700 px-4 py-2 text-center whitespace-nowrap ${normalColorClass} ${
          hasTypeDist ? `${hoverColorClass} cursor-pointer` : ''
        }`}
      >
        {hasTypeDist ? (
          <span className="border-b-2 border-dotted border-red-700 dark:border-red-400 pb-0.5">
            {distanceConverter(typeDist)}
          </span>
        ) : (
          distanceConverter(typeDist)
        )}
      </td>
    );
  };

  return (
    <div className="w-full h-full flex flex-col overflow-hidden relative">
      <AverageDistanceModal
        isOpen={modalOpen}
        onClose={closeModal}
        data={modalData}
        title={modalTitle}
        translate={translate}
        localeCode={localeCode}
      />

      <div className="w-full flex-1 overflow-auto bg-white dark:bg-slate-800">
        <div className="min-w-max flex flex-col p-0">
          <div className="border border-gray-300 dark:border-slate-700 mb-4">
            <table className="w-full border-collapse text-sm text-slate-700 dark:text-slate-200">
              <thead className="bg-gray-50 dark:bg-slate-900">
                <tr>
                  <th rowSpan="2" className={defaultVioletClass}>
                    {translate('common.date')} ({translate('summary.tabs.average_km.month')})
                  </th>
                  <th colSpan="2" className={defaultVioletClass}>
                    {translate('summary.tabs.average_km.km_routing')} (KM)
                  </th>
                  <th rowSpan="2" className={defaultVioletClass}>
                    {translate('summary.tabs.average_km.total_km_routing')} (KM)
                  </th>
                  <th rowSpan="2" className={defaultVioletClass}>
                    {translate('summary.tabs.average_km.avg_km_routing')} (KM)
                  </th>
                </tr>
                <tr>
                  <th className={defaultVioletClass}>Dry</th>
                  <th className={defaultVioletClass}>Frozen</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-800">
                <tr>
                  <td className={defaultClass}>{monthTotals?.range}</td>
                  <td className={`${defaultClass} bg-red-100 dark:bg-red-900/30`}>
                    {distanceConverter(monthTotals?.dryKm)}
                  </td>
                  <td className={`${defaultClass} bg-blue-100 dark:bg-blue-900/30`}>
                    {distanceConverter(monthTotals?.frozenKm)}
                  </td>
                  <td className={defaultClass}>{distanceConverter(monthTotals?.totalKm)}</td>
                  <td className={defaultClass}>{distanceConverter(monthTotals?.avgKm)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="border border-gray-300 dark:border-slate-700">
            <table className="w-full border-collapse text-sm text-slate-700 dark:text-slate-200">
              <thead className="sticky top-0 z-10 shadow-sm bg-gray-50 dark:bg-slate-900">
                <tr>
                  <th rowSpan="2" className={defaultVioletClass}>
                    {translate('common.delivery_date')}
                  </th>
                  <th colSpan="2" className={defaultVioletClass}>
                    {translate('summary.tabs.average_km.total_vehicle')}
                  </th>
                  <th colSpan="2" className={defaultVioletClass}>
                    {translate('summary.tabs.average_km.km_routing')} (KM)
                  </th>
                  <th rowSpan="2" className={defaultVioletClass}>
                    {translate('summary.tabs.average_km.total_km_routing')} (KM)
                  </th>
                  <th rowSpan="2" className={defaultVioletClass}>
                    {translate('summary.tabs.average_km.avg_km_routing')} (KM)
                  </th>
                </tr>
                <tr>
                  <th className={defaultVioletClass}>Dry</th>
                  <th className={defaultVioletClass}>Frozen</th>
                  <th className={defaultVioletClass}>Dry</th>
                  <th className={defaultVioletClass}>Frozen</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-800">
                {data.map((row, idx) => (
                  <tr
                    key={idx}
                    className={` ${row.isSunday || row.isDynamicHoliday ? 'bg-red-200 dark:bg-[#4a1c1c] text-red-900 dark:text-red-300 border-b border-gray-300 dark:border-slate-700' : 'hover:bg-gray-50 dark:hover:bg-slate-700/50'}`}
                  >
                    <td className="border border-gray-300 dark:border-slate-700 px-4 py-2 text-center whitespace-nowrap font-medium relative">
                      {(() => {
                        if (row.isDynamicHoliday) {
                          return (
                            <Tooltip
                              tooltipContent={translate('summary.tabs.task_summary.caution')}
                            >
                              <span className="cursor-help border-b-2 border-dotted border-red-900 dark:border-red-300 pb-0.5">
                                {formatLongDate(row.dateStr || row.date, localeCode)}
                              </span>
                            </Tooltip>
                          );
                        } else if (
                          row.routingNames &&
                          row.routingNames.length > 0 &&
                          !row.isSunday
                        ) {
                          const dateVal = row.dateStr || row.date;
                          return (
                            <div className="relative inline-flex items-center justify-center">
                              <span
                                onClick={() =>
                                  setOpenDropdown(openDropdown === dateVal ? null : dateVal)
                                }
                                className="cursor-pointer border-b-2 border-dotted border-blue-600 dark:border-blue-400 pb-0.5 hover:text-blue-600 dark:hover:text-blue-400 transition-colors inline-flex items-center gap-1"
                              >
                                {formatLongDate(dateVal, localeCode)}
                                <svg
                                  className={`w-3 h-3 transition-transform ${openDropdown === dateVal ? 'rotate-180' : ''}`}
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

                              {openDropdown === dateVal && (
                                <div className="absolute top-1/2 -translate-y-1/2 left-full ml-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 shadow-xl rounded-md py-1 z-50 min-w-[200px] flex flex-col font-normal">
                                  <div className="p-2 font-bold text-slate-700 dark:text-slate-200 border-b border-gray-100 dark:border-slate-700/50 ">
                                    {translate('common.routing_name')}
                                  </div>
                                  {row.routingNames.map((rName, rIdx) => {
                                    const uniqueKey = `${dateVal}-${rIdx}`;
                                    return (
                                      <div
                                        key={rIdx}
                                        onClick={() => {
                                          handleCopyRoutingName(rName, uniqueKey);
                                          setOpenDropdown(null);
                                        }}
                                        className="w-full p-2.5 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs text-slate-700 dark:text-slate-200 cursor-pointer border-b last:border-0 border-gray-100 dark:border-slate-700/50"
                                        title={rName}
                                      >
                                        <span className="block w-full truncate text-center">
                                          {rName}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        } else {
                          return <span>{formatLongDate(row.dateStr || row.date, localeCode)}</span>;
                        }
                      })()}
                    </td>

                    {row.isSunday || row.isDynamicHoliday ? (
                      <>
                        <td
                          colSpan="6"
                          className="px-2 py-2 border border-gray-300 dark:border-slate-700 font-bold text-center align-middle whitespace-nowrap"
                        >
                          {row.isSunday
                            ? translate('common.holiday_sunday')
                            : translate('common.holiday')}
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="border border-gray-300 dark:border-slate-700 px-4 py-2 text-center whitespace-nowrap">
                          {row.dryCount}
                        </td>
                        <td className="border border-gray-300 dark:border-slate-700 px-4 py-2 text-center whitespace-nowrap">
                          {row.frozenCount}
                        </td>
                        {distanceTable(row.dryDetails, row.date, row.dryKm, 'Dry')}
                        {distanceTable(row.frozenDetails, row.date, row.frozenKm, 'Frozen')}

                        <td className="border border-gray-300 dark:border-slate-700 px-4 py-2 text-center whitespace-nowrap">
                          {distanceConverter(row.totalKm)}
                        </td>
                        <td className="border border-gray-300 dark:border-slate-700 px-4 py-2 text-center whitespace-nowrap">
                          {distanceConverter(row.avgKm)}
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="mt-0.5 px-4 py-3 bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700 rounded-b-lg shadow-sm shrink-0 z-10 relative">
        <div className="text-xs text-slate-500 dark:text-slate-400 italic">
          *
          {translate('common.click_for_detail_param', {
            parameter: translate('summary.red_underline'),
          })}
        </div>
      </div>
    </div>
  );
}
