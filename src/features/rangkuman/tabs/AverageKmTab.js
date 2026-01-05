// File: src/features/rangkuman/tabs/AverageKmTab.js
export default function AverageKmTab({ data, monthTotals, translate }) {
  const violetColor = 'bg-[#d9d2e9]';
  const defaultClass = 'border border-gray-400 px-4 py-3 text-center text-slate-700';
  return (
    <div className="h-full w-full overflow-y-auto p-0">
      <div className="w-full overflow-x-auto">
        <div className="overflow-hidden border border-gray-300 h-auto mb-4">
          <table className="min-w-full border-collapse text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th rowSpan="2" className={`${defaultClass} ${violetColor}`}>
                  {translate('summary.tabs.average_km.date')} (
                  {translate('summary.tabs.average_km.month')})
                </th>
                <th colSpan="2" className={`${defaultClass} ${violetColor}`}>
                  {translate('summary.tabs.average_km.km_routing')} (KM)
                </th>
                <th rowSpan="2" className={`${defaultClass} ${violetColor}`}>
                  {translate('summary.tabs.average_km.total_km_routing')} (KM)
                </th>
                <th rowSpan="2" className={`${defaultClass} ${violetColor}`}>
                  {translate('summary.tabs.average_km.avg_km_routing')} (KM)
                </th>
              </tr>
              <tr>
                <th className={`${defaultClass} ${violetColor}`}>Dry</th>
                <th className={`${defaultClass} ${violetColor}`}>Frozen</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              <tr>
                <td className={defaultClass}>{monthTotals?.range || '-'}</td>
                <td className={`${defaultClass} bg-red-100`}>
                  {monthTotals?.dryKm?.toLocaleString('en-US', { minimumFractionDigits: 3 })}
                </td>
                <td className={`${defaultClass} bg-blue-100`}>
                  {monthTotals?.frozenKm?.toLocaleString('en-US', { minimumFractionDigits: 3 })}
                </td>
                <td className={defaultClass}>
                  {monthTotals?.totalKm?.toLocaleString('en-US', { minimumFractionDigits: 3 })}
                </td>
                <td className={defaultClass}>
                  {monthTotals?.avgKm?.toLocaleString('en-US', { minimumFractionDigits: 3 })}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* TABEL 2: DAILY DETAILS */}
        <div className="rounded-b-xl overflow-hidden border border-gray-300">
          <table className="min-w-full border-collapse text-sm">
            <thead className="sticky top-0 z-10">
              <tr>
                <th rowSpan="2" className={`${defaultClass} ${violetColor}`}>
                  {translate('common.delivery_date')}
                </th>
                <th colSpan="2" className={`${defaultClass} ${violetColor}`}>
                  {translate('summary.tabs.average_km.total_vehicle')}
                </th>
                <th colSpan="2" className={`${defaultClass} ${violetColor}`}>
                  {translate('summary.tabs.average_km.km_routing')} (KM)
                </th>
                <th rowSpan="2" className={`${defaultClass} ${violetColor}`}>
                  {translate('summary.tabs.average_km.total_km_routing')} (KM)
                </th>
                <th rowSpan="2" className={`${defaultClass} ${violetColor}`}>
                  {translate('summary.tabs.average_km.avg_km_routing')} (KM)
                </th>
              </tr>
              <tr>
                <th className={`${defaultClass} ${violetColor}`}>Dry</th>
                <th className={`${defaultClass} ${violetColor}`}>Frozen</th>
                <th className={`${defaultClass} ${violetColor}`}>Dry</th>
                <th className={`${defaultClass} ${violetColor}`}>Frozen</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {data.map((row, idx) => (
                <tr
                  key={idx}
                  className={` ${row.isSunday ? 'bg-red-200 text-red-900 border-b' : 'hover:bg-gray-50'}`}
                >
                  <td className="border border-gray-300 px-4 py-2 text-center whitespace-nowrap font-medium">
                    {row.date}
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
                      <td className="border border-gray-300 px-4 py-2 text-center bg-red-100">
                        {row.dryKm.toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-center bg-blue-100">
                        {row.frozenKm.toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-center font-medium">
                        {row.totalKm.toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-center">
                        {row.avgKm.toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
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
