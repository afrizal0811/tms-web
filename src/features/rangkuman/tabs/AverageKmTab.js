// File: src/features/rangkuman/tabs/AverageKmTab.js
export default function AverageKmTab({ data, monthTotals }) {
  return (
    <div className="h-full w-full overflow-y-auto p-0">
      <div className="w-full overflow-x-auto">
        {/* TABEL 1: MONTHLY SUMMARY */}
        <div className="overflow-hidden border border-gray-300 h-auto mb-4">
          <table className="min-w-full border-collapse text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th
                  rowSpan="2"
                  className="border border-gray-300 px-4 py-3 text-center font-bold text-slate-700 bg-white"
                >
                  Date (Month)
                </th>
                <th
                  colSpan="2"
                  className="border border-gray-300 px-4 py-2 text-center font-bold text-slate-700 bg-white"
                >
                  KM Routing (Month)
                </th>
                <th
                  rowSpan="2"
                  className="border border-gray-300 px-4 py-3 text-center font-bold text-slate-700 bg-sky-50"
                >
                  Total KM Routing (Month)
                </th>
                <th
                  rowSpan="2"
                  className="border border-gray-300 px-4 py-3 text-center font-bold text-slate-700 bg-white"
                >
                  Average KM (Month)
                </th>
              </tr>
              <tr>
                <th className="border border-gray-300 px-4 py-2 text-center bg-white">Dry</th>
                <th className="border border-gray-300 px-4 py-2 text-center bg-white">Frozen</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              <tr>
                <td className="border border-gray-300 px-4 py-3 text-center font-medium">
                  {monthTotals?.range || '-'}
                </td>
                <td className="border border-gray-300 px-4 py-3 text-center">
                  {monthTotals?.dryKm?.toLocaleString('en-US', { minimumFractionDigits: 3 })}
                </td>
                <td className="border border-gray-300 px-4 py-3 text-center">
                  {monthTotals?.frozenKm?.toLocaleString('en-US', { minimumFractionDigits: 3 })}
                </td>
                <td className="border border-gray-300 px-4 py-3 text-center font-bold bg-sky-50">
                  {monthTotals?.totalKm?.toLocaleString('en-US', { minimumFractionDigits: 3 })}
                </td>
                <td className="border border-gray-300 px-4 py-3 text-center">
                  {monthTotals?.avgKm?.toLocaleString('en-US', { minimumFractionDigits: 3 })}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* TABEL 2: DAILY DETAILS */}
        <div className="rounded-b-xl overflow-hidden border border-gray-300">
          <table className="min-w-full border-collapse text-sm">
            <thead className="sticky top-0 bg-sky-600 text-white z-10">
              <tr>
                <th rowSpan="2" className="border border-sky-700 px-4 py-2">
                  Delivery Date
                </th>
                <th colSpan="2" className="border border-sky-700 px-4 py-2 text-center">
                  Total Vehicle
                </th>
                <th
                  colSpan="2"
                  className="border border-sky-700 px-4 py-2 text-center bg-yellow-200 text-black font-bold"
                >
                  KM Routing
                </th>
                <th rowSpan="2" className="border border-sky-700 px-4 py-2">
                  Total KM Routing
                </th>
                <th rowSpan="2" className="border border-sky-700 px-4 py-2">
                  Average KM
                </th>
              </tr>
              <tr>
                <th className="border border-sky-700 px-4 py-2">Dry</th>
                <th className="border border-sky-700 px-4 py-2">Frozen</th>
                <th className="border border-sky-700 px-4 py-2 bg-yellow-200 text-black">Dry</th>
                <th className="border border-sky-700 px-4 py-2 bg-yellow-200 text-black">Frozen</th>
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
                        Libur (Minggu)
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
                      <td className="border border-gray-300 px-4 py-2 text-center bg-yellow-50">
                        {row.dryKm.toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-center bg-yellow-50">
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
