import { Fragment } from 'react';
import { formatMinutesToHHMM } from '@/lib/utils';

export default function TruckDetailTab({ data }) {
  const { driverEmails, driverMap, dateKeys, dataMatrix } = data || {};

  if (!driverEmails || driverEmails.length === 0) {
    return <div className="p-6 text-center text-gray-400">Tidak ada data driver.</div>;
  }

  // --- HELPERS ---
  const isSunday = (dateStr) => {
    if (!dateStr) return false;
    const date = new Date(dateStr);
    return date.getUTCDay() === 0;
  };

  // --- STYLES ---
  const thClass = 'border border-gray-300 px-2 py-2 text-center text-xs font-bold text-slate-700';
  const thMetricClass =
    'border border-gray-300 px-2 py-2 text-center text-xs font-bold text-slate-700';
  const tdClass =
    'border border-gray-200 px-2 py-1 text-center text-xs text-slate-700 whitespace-nowrap';

  // Sticky Columns Classes
  const stickyType = 'sticky left-0 z-20 border-r';
  const stickyPlate = 'sticky left-[80px] z-20 border-r';
  const stickyDriver = 'sticky left-[180px] z-20 border-r shadow-md';

  // --- COLOR CONSTANTS (Sesuai Gambar) ---
  const COLOR_A = 'bg-[#fae2d5]'; // Peach (Type, Driver, Sub-header non-Sunday)
  const COLOR_B = 'bg-[#dbe9f7]'; // Blue (Date header non-Sunday)
  const COLOR_C = 'bg-[#f4cccc]'; // Red/Pink (All Sunday block)

  return (
    <div className="w-full overflow-auto h-full">
      <table className="border-collapse border-0 text-sm whitespace-nowrap">
        {/* HEADER */}
        <thead className="sticky top-0 z-30 bg-gray-100">
          {/* Baris 1: Judul Kolom Tetap & Tanggal */}
          <tr>
            {/* AREA A: Sticky Headers */}
            <th rowSpan="2" className={`${thClass} min-w-20 sticky left-0 z-40 ${COLOR_A}`}>
              Type
            </th>
            <th
              rowSpan="2"
              className={`${thClass} min-w-[100px] sticky left-20 z-40 ${COLOR_A}`}
            >
              Licence No.
            </th>
            <th
              rowSpan="2"
              className={`${thClass} min-w-[200px] sticky left-[180px] z-40 ${COLOR_A} border-r-2 border-slate-400`}
            >
              Driver
            </th>

            {dateKeys.map((d, i) => {
              // AREA C (Sunday) vs AREA B (Normal Date)
              const headerColor = isSunday(d.str) ? COLOR_C : COLOR_B;
              return (
                <th
                  key={i}
                  colSpan="7"
                  className={`${thClass} border-l-2 border-l-gray-400 ${headerColor}`}
                >
                  {d.display}
                </th>
              );
            })}
          </tr>

          {/* Baris 2: Nama Metrik */}
          <tr>
            {dateKeys.map((d, i) => {
              // AREA C (Sunday) vs AREA A (Normal Sub-header - ikut warna peach kiri)
              const metricColor = isSunday(d.str) ? COLOR_C : COLOR_A;
              return (
                <Fragment key={i}>
                  <th className={`${thMetricClass} ${metricColor} border-l-2 border-l-gray-400`}>
                    Weight
                  </th>
                  <th className={`${thMetricClass} ${metricColor}`}>Vol</th>
                  <th className={`${thMetricClass} ${metricColor}`}>Dist (m)</th>
                  <th className={`${thMetricClass} ${metricColor}`}>Outlets</th>
                  <th className={`${thMetricClass} ${metricColor}`}>Deliv</th>
                  <th className={`${thMetricClass} ${metricColor}`}>Duration</th>
                  <th className={`${thMetricClass} ${metricColor}`}>Deliv %</th>
                </Fragment>
              );
            })}
          </tr>
        </thead>

        {/* BODY */}
        <tbody className="bg-white">
          {driverEmails.map((email) => {
            const driver = driverMap[email];

            return (
              <tr key={email} className="hover:bg-gray-50">
                {/* Kolom Sticky Kiri - Default Putih (sticky butuh bg-white agar tidak transparan saat scroll horizontal) */}
                <td className={`${tdClass} ${stickyType} bg-white`}>{driver.type}</td>
                <td className={`${tdClass} ${stickyPlate} bg-white`}>{driver.plat}</td>
                <td
                  className={`${tdClass} ${stickyDriver} text-left border-r-2 border-slate-400 bg-white`}
                >
                  {driver.name}
                </td>

                {/* Kolom Data Harian */}
                {dateKeys.map((d, i) => {
                  const metrics = dataMatrix[d.str][email];
                  const isSun = isSunday(d.str);
                  // AREA C (Sunday Data) vs Putih/Gray
                  const cellBg = isSun ? COLOR_C : '';
                  const emptyBg = isSun ? COLOR_C : 'bg-gray-50';

                  if (
                    !metrics ||
                    (metrics.outlets === 0 && metrics.dist === 0 && metrics.weight === 0)
                  ) {
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

                  return (
                    <Fragment key={i}>
                      <td className={`${tdClass} border-l-2 border-l-gray-400 ${cellBg}`}>
                        {weightPct}
                      </td>
                      <td className={`${tdClass} ${cellBg}`}>{volPct}</td>
                      <td className={`${tdClass} ${cellBg}`}>{metrics.dist?.toLocaleString()}</td>
                      <td className={`${tdClass} ${cellBg}`}>{metrics.outlets}</td>
                      <td className={`${tdClass} ${cellBg}`}>{metrics.delivered}</td>
                      <td className={`${tdClass} ${cellBg}`}>
                        {formatMinutesToHHMM(metrics.duration)}
                      </td>
                      <td
                        className={`${tdClass} font-semibold ${cellBg} ${metrics.delivered < metrics.outlets ? 'text-red-600' : 'text-green-600'}`}
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
  );
}
