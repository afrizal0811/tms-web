import { Fragment } from 'react';
import { formatMinutesToHHMM } from '@/lib/utils';

export default function TruckDetailTab({ data }) {
  const { driverEmails, driverMap, dateKeys, dataMatrix } = data || {};

  if (!driverEmails || driverEmails.length === 0) {
    return <div className="p-6 text-center text-gray-400">Tidak ada data driver.</div>;
  }

  // --- STYLES ---
  const thClass =
    'border border-gray-300 px-2 py-2 text-center text-xs font-bold text-slate-700 bg-blue-50';
  const thMetricClass =
    'border border-gray-300 px-2 py-2 text-center text-xs font-bold text-slate-700 bg-orange-100';
  const tdClass =
    'border border-gray-200 px-2 py-1 text-center text-xs text-slate-700 whitespace-nowrap';

  // Sticky Columns Classes (Menggunakan arbitrary value agar pas dengan lebar header)
  const stickyType = 'sticky left-0 z-20 bg-white border-r';
  const stickyPlate = 'sticky left-[80px] z-20 bg-white border-r';
  const stickyDriver = 'sticky left-[180px] z-20 bg-white border-r shadow-md';

  return (
    <div className="w-full overflow-auto max-h-[650px]">
      <table className="border-collapse border-0 text-sm whitespace-nowrap">
        {/* HEADER */}
        <thead className="sticky top-0 z-30 bg-gray-100">
          {/* Baris 1: Judul Kolom Tetap & Tanggal */}
          <tr>
            <th rowSpan="2" className={`${thClass} min-w-[80px] sticky left-0 z-40 bg-orange-100`}>
              Type
            </th>
            <th
              rowSpan="2"
              className={`${thClass} min-w-[100px] sticky left-[80px] z-40 bg-orange-100`}
            >
              Licence No.
            </th>
            <th
              rowSpan="2"
              className={`${thClass} min-w-[200px] sticky left-[180px] z-40 bg-orange-100 border-r-2 border-slate-400`}
            >
              Driver
            </th>

            {dateKeys.map((d, i) => (
              <th key={i} colSpan="7" className={`${thClass} border-l-2 border-l-gray-400`}>
                {d.display}
              </th>
            ))}
          </tr>

          {/* Baris 2: Nama Metrik */}
          <tr>
            {dateKeys.map((d, i) => (
              <Fragment key={i}>
                <th className={`${thMetricClass} border-l-2 border-l-gray-400`}>Weight</th>
                <th className={thMetricClass}>Vol</th>
                <th className={thMetricClass}>Dist (m)</th>
                <th className={thMetricClass}>Outlets</th>
                <th className={thMetricClass}>Deliv</th>
                <th className={thMetricClass}>Duration</th>
                <th className={thMetricClass}>Deliv %</th>
              </Fragment>
            ))}
          </tr>
        </thead>

        {/* BODY */}
        <tbody className="bg-white">
          {driverEmails.map((email) => {
            // Ambil data driver dari object map
            const driver = driverMap[email];

            return (
              <tr key={email} className="hover:bg-gray-50">
                {/* Kolom Sticky Kiri */}
                <td className={`${tdClass} ${stickyType}`}>{driver.type}</td>
                <td className={`${tdClass} ${stickyPlate}`}>{driver.plat}</td>
                <td className={`${tdClass} ${stickyDriver} text-left border-r-2 border-slate-400`}>
                  {driver.name}
                </td>

                {/* Kolom Data Harian */}
                {dateKeys.map((d, i) => {
                  const metrics = dataMatrix[d.str][email];

                  // Jika tidak ada data hari itu, render sel kosong
                  if (
                    !metrics ||
                    (metrics.outlets === 0 && metrics.dist === 0 && metrics.weight === 0)
                  ) {
                    return (
                      <Fragment key={i}>
                        <td className={`${tdClass} border-l-2 border-l-gray-400 bg-gray-50`}></td>
                        <td className={`${tdClass} bg-gray-50`}></td>
                        <td className={`${tdClass} bg-gray-50`}></td>
                        <td className={`${tdClass} bg-gray-50`}></td>
                        <td className={`${tdClass} bg-gray-50`}></td>
                        <td className={`${tdClass} bg-gray-50`}></td>
                        <td className={`${tdClass} bg-gray-50`}></td>
                      </Fragment>
                    );
                  }

                  // Kalkulasi Persentase untuk Tampilan
                  const weightPct =
                    metrics.maxWeight > 0
                      ? ((metrics.weight / metrics.maxWeight) * 100).toFixed(0) + '%'
                      : '-';
                  const volPct =
                    metrics.maxVolume > 0
                      ? ((metrics.volume / metrics.maxVolume) * 100).toFixed(0) + '%'
                      : '-';
                  const delPct =
                    metrics.outlets > 0
                      ? ((metrics.delivered / metrics.outlets) * 100).toFixed(0) + '%'
                      : '-';

                  return (
                    <Fragment key={i}>
                      <td className={`${tdClass} border-l-2 border-l-gray-400`}>{weightPct}</td>
                      <td className={tdClass}>{volPct}</td>
                      <td className={tdClass}>{metrics.dist?.toLocaleString()}</td>
                      <td className={tdClass}>{metrics.outlets}</td>
                      <td className={tdClass}>{metrics.delivered}</td>
                      <td className={tdClass}>{formatMinutesToHHMM(metrics.duration)}</td>

                      {/* Warnai merah jika delivery < 100% */}
                      <td
                        className={`${tdClass} font-semibold ${metrics.delivered < metrics.outlets ? 'text-red-600' : 'text-green-600'}`}
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
