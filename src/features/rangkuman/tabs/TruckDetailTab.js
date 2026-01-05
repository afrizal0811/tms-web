// File: features/rangkuman/tabs/TruckDetailTab.js
import { formatLongDate, formatMinutesToHHMM } from '@/lib/utils';
import { Fragment, useState } from 'react';
import TruckDetailModal from './modals/TruckDetailModal';

export default function TruckDetailTab({ data, translate, language }) {
  const { driverEmails, driverMap, dateKeys, dataMatrix } = data || {};
  const [modalData, setModalData] = useState(null);
  const indoLang = language === 'id' ? 'id-ID' : 'en-GB';

  const handleCellClick = (metrics, driverName, dateStr) => {
    if (metrics && metrics.taskList && metrics.taskList.length > 0) {
      setModalData({ driverName, dateStr, tasks: metrics.taskList });
    }
  };
  const closeModal = () => setModalData(null);

  const isSunday = (dateStr) => {
    if (!dateStr) return false;
    const date = new Date(dateStr);
    return date.getUTCDay() === 0;
  };

  // --- COLORS ---
  const COLOR_A = 'bg-[#fae2d5]';
  const COLOR_B = 'bg-[#dbe9f7]';
  const COLOR_C = 'bg-[#f4cccc]';
  // UPDATE WARNA ERROR (Hex + Text White)
  const COLOR_ERR_MANUAL = 'bg-[#4F76C7] text-white ';
  const COLOR_ERR_DATE = 'bg-[#C85D86] text-white';
  const COLOR_ERR_BOTH = 'bg-[#5C5FB2] text-white';

  const thClass = 'border border-gray-300 px-2 py-2 text-center text-xs font-bold text-slate-700';
  const thMetricClass =
    'border border-gray-300 px-2 py-2 text-center text-xs font-bold text-slate-700';
  const tdClass =
    'border border-gray-200 px-2 py-1 text-center text-xs text-slate-700 whitespace-nowrap';
  const tdClickable = `${tdClass} cursor-pointer hover:opacity-80 transition-opacity`;

  const stickyType = 'sticky left-0 z-20 border-r';
  const stickyPlate = 'sticky left-[80px] z-20 border-r';
  const stickyDriver = 'sticky left-[180px] z-20 border-r shadow-md';

  return (
    <div className="w-full h-full flex flex-col gap-4 relative p-0">
      <TruckDetailModal
        data={modalData}
        isOpen={!!modalData}
        language={indoLang}
        onClose={closeModal}
        translate={translate}
      />
      <a href="a"></a>
      <div className="overflow-auto flex-1 rounded-b-xl border border-gray-200">
        <table className="border-collapse border-0 text-sm whitespace-nowrap">
          <thead className="sticky top-0 z-30 bg-gray-100">
            <tr>
              <th rowSpan="2" className={`${thClass} min-w-20 sticky left-0 z-40 ${COLOR_A}`}>
                {translate('summary.tabs.truck_detail.temp')}
              </th>
              <th rowSpan="2" className={`${thClass} min-w-[100px] sticky left-20 z-40 ${COLOR_A}`}>
                {translate('summary.tabs.truck_detail.license')}
              </th>
              <th
                rowSpan="2"
                className={`${thClass} min-w-[200px] sticky left-[180px] z-40 ${COLOR_A} border-r-2 border-slate-400`}
              >
                {translate('summary.tabs.truck_detail.driver')}
              </th>
              {dateKeys.map((d, i) => {
                const headerColor = isSunday(d.str) ? COLOR_C : COLOR_B;
                const date = formatLongDate(d.str, indoLang);
                return (
                  <th
                    key={i}
                    colSpan="7"
                    className={`${thClass} border-l-2 border-l-gray-400 ${headerColor}`}
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
                    <th className={`${thMetricClass} ${metricColor} border-l-2 border-l-gray-400`}>
                      {translate('summary.tabs.truck_detail.weight')}
                    </th>
                    <th className={`${thMetricClass} ${metricColor}`}>
                      {translate('summary.tabs.truck_detail.volume')}
                    </th>
                    <th className={`${thMetricClass} ${metricColor}`}>
                      {translate('summary.tabs.truck_detail.distance')}
                    </th>
                    <th className={`${thMetricClass} ${metricColor}`}>
                      {translate('summary.tabs.truck_detail.total_outlet')}
                    </th>
                    <th className={`${thMetricClass} ${metricColor}`}>
                      {translate('summary.tabs.truck_detail.total_delivery')}
                    </th>
                    <th className={`${thMetricClass} ${metricColor}`}>
                      {translate('summary.tabs.truck_detail.ship_duration')}
                    </th>
                    <th className={`${thMetricClass} ${metricColor}`}>
                      {translate('summary.tabs.truck_detail.delivered')}
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
                  <td className={`${tdClass} ${stickyType} bg-white`}>{driver.type}</td>
                  <td className={`${tdClass} ${stickyPlate} bg-white`}>{driver.plat}</td>
                  <td
                    className={`${tdClass} ${stickyDriver} bg-white text-left border-r-2 border-slate-400`}
                  >
                    {driver.name}
                  </td>

                  {dateKeys.map((d, i) => {
                    const metrics = dataMatrix[d.str][email];
                    const isSun = isSunday(d.str);
                    let cellBg = isSun ? COLOR_C : '';
                    const emptyBg = isSun ? COLOR_C : 'bg-gray-50';

                    if (metrics && metrics.outlets > 0) {
                      if (metrics.hasManualError && metrics.hasBedaHariError)
                        cellBg = COLOR_ERR_BOTH;
                      else if (metrics.hasManualError) cellBg = COLOR_ERR_MANUAL;
                      else if (metrics.hasBedaHariError) cellBg = COLOR_ERR_DATE;
                    }

                    if (!metrics || metrics.outlets === 0) {
                      return (
                        <Fragment key={i}>
                          <td className={`${tdClass} border-l-2 border-l-gray-400 ${emptyBg}`}></td>
                          <td className={`${tdClass} ${emptyBg}`}></td>
                          <td className={`${tdClass} ${emptyBg}`}></td>
                          <td className={`${tdClass} ${emptyBg}`}></td>
                          <td className={`${tdClass} ${emptyBg}`}></td>
                          <td className={`${tdClass} ${emptyBg}`}></td>
                          <td className={`${tdClass} ${emptyBg}`}></td>
                        </Fragment>
                      );
                    }

                    const weightPct =
                      metrics.maxWeight > 0
                        ? ((metrics.weight / metrics.maxWeight) * 100).toFixed(1) + '%'
                        : '-';
                    const volPct =
                      metrics.maxVolume > 0
                        ? ((metrics.volume / metrics.maxVolume) * 100).toFixed(1) + '%'
                        : '-';
                    const delPct =
                      metrics.outlets > 0
                        ? ((metrics.delivered / metrics.outlets) * 100).toFixed(1) + '%'
                        : '-';
                    const onClick = () => handleCellClick(metrics, driver.name, d.display);

                    return (
                      <Fragment key={i}>
                        <td
                          onClick={onClick}
                          className={`${tdClickable} border-l-2 border-l-gray-400 ${cellBg}`}
                        >
                          {weightPct}
                        </td>
                        <td onClick={onClick} className={`${tdClickable} ${cellBg}`}>
                          {volPct}
                        </td>
                        <td onClick={onClick} className={`${tdClickable} ${cellBg}`}>
                          {metrics.dist?.toLocaleString()}
                        </td>
                        <td onClick={onClick} className={`${tdClickable} ${cellBg}`}>
                          {metrics.outlets}
                        </td>
                        <td onClick={onClick} className={`${tdClickable} ${cellBg}`}>
                          {metrics.delivered}
                        </td>
                        <td onClick={onClick} className={`${tdClickable} ${cellBg}`}>
                          {formatMinutesToHHMM(metrics.duration)}
                        </td>
                        <td
                          onClick={onClick}
                          className={`${tdClickable} font-semibold ${cellBg} ${metrics.delivered < metrics.outlets ? 'text-red-600' : 'text-green-600'}`}
                        >
                          {delPct}
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

      {/* LEGENDA WARNA BARU */}
      <div className="px-4 py-3 bg-white border-t border-gray-200 rounded-b-lg shadow-sm shrink-0">
        <div>
          <h4 className="text-xs font-bold mb-2 underline text-slate-700">
            {translate('summary.tabs.truck_detail.color_exp')}
          </h4>
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col sm:flex-row gap-x-6 gap-y-2 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <span className={`w-4 h-4 border border-gray-400 rounded-sm ${COLOR_ERR_MANUAL}`} />
                <span>{translate('summary.tabs.truck_detail.blue')}</span>
              </div>

              <div className="flex items-center gap-2">
                <span className={`w-4 h-4 border border-gray-400 rounded-sm ${COLOR_ERR_DATE}`} />
                <span>{translate('summary.tabs.truck_detail.magenta')}</span>
              </div>

              <div className="flex items-center gap-2">
                <span className={`w-4 h-4 border border-gray-400 rounded-sm ${COLOR_ERR_BOTH}`} />
                <span>{translate('summary.tabs.truck_detail.indigo')}</span>
              </div>
            </div>
            <div className="text-xs text-slate-500 italic">
              *{translate('summary.tabs.truck_detail.click_row_hint')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
