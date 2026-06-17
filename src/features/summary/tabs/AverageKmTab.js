'use client';

import { formatLongDate } from '@/lib/utils';
import { useState } from 'react';
import AverageKmDetailModal from './modals/AverageKmDetailModal';

export default function AverageKmTab({ data, monthTotals, translate, localeCode }) {
  const defaultClass =
    'border border-gray-400 dark:border-slate-600 px-4 py-3 text-center text-slate-700 dark:text-slate-200 whitespace-nowrap';
  const defaultVioletClass = `${defaultClass} bg-[#d9d2e9] dark:bg-[#34205c]`;

  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState([]);
  const [modalTitle, setModalTitle] = useState('');

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
      <AverageKmDetailModal
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
                    className={` ${row.isSunday ? 'bg-red-200 dark:bg-[#4a1c1c] text-red-900 dark:text-red-300 border-b border-gray-300 dark:border-slate-700' : 'hover:bg-gray-50 dark:hover:bg-slate-700/50'}`}
                  >
                    <td className="border border-gray-300 dark:border-slate-700 px-4 py-2 text-center whitespace-nowrap font-medium">
                      {formatLongDate(row.date, localeCode)}
                    </td>
                    {row.isSunday ? (
                      <>
                        <td
                          colSpan="6"
                          className="px-2 py-2 border border-gray-300 dark:border-slate-700 font-bold text-center align-middle whitespace-nowrap"
                        >
                          {translate('summary.tabs.average_km.holiday')}
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
  