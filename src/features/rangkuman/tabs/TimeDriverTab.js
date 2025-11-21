import { Fragment } from 'react';

export default function TimeDriverTab({ data }) {
  const { driverEmails, driverMap, dateKeys, dataMatrix } = data || {};

  if (!driverEmails || driverEmails.length === 0) {
    return <div className="p-6 text-center text-gray-400">Tidak ada data driver.</div>;
  }

  // Helpers & Constants
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

  // --- UPDATE Z-INDEX ---
  // Menggunakan z-10 dan z-20 agar header tetap di atas body,
  // tapi tidak menutupi komponen lain yang lebih penting (seperti Navbar App / Dropdown)
  const stickyType = 'sticky left-0 z-20 border-r';
  const stickyPlate = 'sticky left-[80px] z-20 border-r';
  const stickyDriver = 'sticky left-[180px] z-20 border-r shadow-md';
  const stickyHeaderRow = 'sticky top-0 z-10 bg-gray-100'; // Turunkan ke z-10
  const stickyHeaderCol = 'sticky z-30'; // Header + Kolom Kiri (20+10)

  return (
    <div className="w-full overflow-auto h-full">
      <table className="border-collapse border-0 text-sm whitespace-nowrap">
        <thead className={stickyHeaderRow}>
          {/* Row 1: Headers */}
          <tr>
            {/* Area Sticky Kiri Atas (Corner) - z-30 agar paling atas */}
            <th
              rowSpan="2"
              className={`${thClass} min-w-20 left-0 ${stickyHeaderCol} ${COLOR_A}`}
            >
              Type
            </th>
            <th
              rowSpan="2"
              className={`${thClass} min-w-[100px] left-20 ${stickyHeaderCol} ${COLOR_A}`}
            >
              Licence No.
            </th>
            <th
              rowSpan="2"
              className={`${thClass} min-w-[200px] left-[180px] ${stickyHeaderCol} ${COLOR_A} border-r-2 border-slate-400`}
            >
              Driver
            </th>

            {dateKeys.map((d, i) => {
              const headerColor = isSunday(d.str) ? COLOR_C : COLOR_B;
              return (
                <th
                  key={i}
                  colSpan="3"
                  className={`${thClass} border-l-2 border-l-gray-400 ${headerColor}`}
                >
                  {d.display}
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
                    Start
                  </th>
                  <th className={`${thClass} ${metricColor}`}>Finish</th>
                  <th className={`${thClass} ${metricColor}`}>Duration</th>
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
                {/* Info Driver - Sticky Left (z-20) */}
                <td className={`${tdClass} ${stickyType} bg-white`}>{driver.type}</td>
                <td className={`${tdClass} ${stickyPlate} bg-white`}>{driver.plat}</td>
                <td
                  className={`${tdClass} ${stickyDriver} text-left border-r-2 border-slate-400 bg-white`}
                >
                  {driver.name}
                </td>

                {/* Data Loop */}
                {dateKeys.map((d, i) => {
                  const metrics = dataMatrix[d.str][email];
                  const isSun = isSunday(d.str);
                  const cellBg = isSun ? COLOR_C : '';
                  const emptyBg = isSun ? COLOR_C : 'bg-gray-50';

                  if (!metrics || !metrics.hasData) {
                    return (
                      <Fragment key={i}>
                        <td className={`${tdClass} border-l-2 border-l-gray-400 ${emptyBg}`}></td>
                        <td className={`${tdClass} ${emptyBg}`}></td>
                        <td className={`${tdClass} ${emptyBg}`}></td>
                      </Fragment>
                    );
                  }

                  const { startDisplay, finishDisplay, durationDisplay, dayDiff } = metrics;

                  return (
                    <Fragment key={i}>
                      <td className={`${tdClass} border-l-2 border-l-gray-400 ${cellBg}`}>
                        {startDisplay}
                      </td>
                      <td className={`${tdClass} ${cellBg}`}>
                        {finishDisplay}
                        {dayDiff > 0 && (
                          <span className="text-red-600 text-[10px] ml-1 font-bold">
                            (+{dayDiff})
                          </span>
                        )}
                      </td>
                      <td className={`${tdClass} ${cellBg} font-medium`}>{durationDisplay}</td>
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
