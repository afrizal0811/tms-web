// File: src/features/rangkuman/tabs/AverageKmTab.js
'use client';

import Tooltip from '@/components/Tooltip';
import { formatLongDate } from '@/lib/utils';
import { useState } from 'react';
import AverageKmDetailModal from './modals/AverageKmDetailModal';

export default function AverageKmTab({ data, monthTotals, translate, language }) {
  const indoCode = language === 'id' ? 'id-ID' : 'en-GB';
  const defaultClass = 'border border-gray-400 px-4 py-3 text-center text-slate-700';
  const defaultVioletClass = `${defaultClass} bg-[#d9d2e9]`;

  // State untuk Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState([]);
  const [modalTitle, setModalTitle] = useState('');
  // Handler Klik
  const handleCellClick = (details, dateStr, type) => {
    if (details && details.length > 0) {
      setModalData(details);
      setModalTitle(
        <div>
          <h3 className="text-lg font-bold">
            {translate('summary.tabs.average_km.modal.title')} - {type}
          </h3>
          <p className="text-slate-300 text-sm font-normal">{formatLongDate(dateStr, indoCode)}</p>
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
    const distance = data.toLocaleString(indoCode, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return distance;
  };

  const distanceTable = (typeDetails, typeDate, typeDist, title) => {
    const tdData = (
      <td
        onClick={() => handleCellClick(typeDetails, typeDate, title)}
        className={`border border-gray-300 px-4 py-2 text-center ${title === 'Dry' ? `bg-red-100 hover:bg-red-200` : 'bg-blue-100 hover:bg-blue-200'} ${typeDist > 0 && 'cursor-pointer'}`}
      >
        {typeDist > 0 ? (
          <span className="border-b-2 border-dotted border-slate-700 pb-0.5">
            {distanceConverter(typeDist)}
          </span>
        ) : (
          distanceConverter(typeDist)
        )}
      </td>
    );

    return typeDist > 0 ? (
      <Tooltip tooltipContent={typeDist > 0 ? translate('common.click_for_detail') : ''}>
        {tdData}
      </Tooltip>
    ) : (
      tdData
    );
  };

  return (
    <div className="h-full w-full overflow-y-auto p-0 relative">
      {/* Render Modal */}
      <AverageKmDetailModal
        isOpen={modalOpen}
        onClose={closeModal}
        data={modalData}
        title={modalTitle}
        translate={translate}
        language={language}
      />

      <div className="w-full overflow-x-auto">
        <div className="overflow-hidden border border-gray-300 h-auto mb-4">
          <table className="min-w-full border-collapse text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th rowSpan="2" className={defaultVioletClass}>
                  {translate('summary.tabs.average_km.date')} (
                  {translate('summary.tabs.average_km.month')})
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
            <tbody className="bg-white">
              <tr>
                <td className={defaultClass}>{monthTotals?.range}</td>
                <td className={`${defaultClass} bg-red-100`}>
                  {distanceConverter(monthTotals?.dryKm)}
                </td>
                <td className={`${defaultClass} bg-blue-100`}>
                  {distanceConverter(monthTotals?.frozenKm)}
                </td>
                <td className={defaultClass}>{distanceConverter(monthTotals?.totalKm)}</td>
                <td className={defaultClass}>{distanceConverter(monthTotals?.avgKm)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="rounded-b-xl overflow-hidden border border-gray-300">
          <table className="min-w-full border-collapse text-sm">
            <thead className="sticky top-0 z-10">
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
            <tbody className="bg-white">
              {data.map((row, idx) => (
                <tr
                  key={idx}
                  className={` ${row.isSunday ? 'bg-red-200 text-red-900 border-b' : 'hover:bg-gray-50'}`}
                >
                  <td className="border border-gray-300 px-4 py-2 text-center whitespace-nowrap font-medium">
                    {formatLongDate(row.date, indoCode)}
                  </td>
                  {row.isSunday ? (
                    <>
                      <td
                        colSpan="6"
                        className="px-2 py-2 border border-gray-300 font-bold text-center align-middle"
                      >
                        {translate('summary.tabs.average_km.holiday')}
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="border border-gray-300 px-4 py-2 text-center">
                        {row.dryCount}
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-center">
                        {row.frozenCount}
                      </td>
                      {distanceTable(row.dryDetails, row.date, row.dryKm, 'Dry')}
                      {distanceTable(row.frozenDetails, row.date, row.frozenKm, 'Frozen')}

                      <td className="border border-gray-300 px-4 py-2 text-center">
                        {distanceConverter(row.totalKm)}
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-center">
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
  );
}
