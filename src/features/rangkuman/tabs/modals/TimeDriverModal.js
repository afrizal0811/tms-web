'use client';

import BaseModal from '@/components/BaseModal';

export default function TimeDriverModal({ isOpen, onClose, data, translate }) {
  if (!data) return null;

  const { driverName, dateStr, entries } = data;
  // Helper untuk mengubah string "HH:mm" atau "H:m" menjadi total menit
  const parseDurationToMinutes = (str) => {
    if (!str) return 0;
    const [hours, minutes] = str.split(':').map(Number);
    return hours * 60 + (minutes || 0);
  };

  // Hitung akumulasi
  const totalMinutes = entries.reduce((acc, curr) => {
    return acc + parseDurationToMinutes(curr.durationDisplay);
  }, 0);

  const totalDistance = entries.reduce((acc, curr) => acc + (curr.distance || 0), 0);

  // Format kembali ke HH:mm
  const totalHours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;
  const totalDurationFormatted = `${String(totalHours).padStart(2, '0')}:${String(remainingMinutes).padStart(2, '0')}`;

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div>
          <h3 className="text-lg font-bold">{driverName}</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-normal">{dateStr}</p>
        </div>
      }
    >
      <div>
        <div className="overflow-x-auto border border-gray-200 dark:border-slate-700 rounded-lg">
          <table className="min-w-full text-sm text-left">
            <thead className="bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-200 font-bold border-b border-gray-200 dark:border-slate-700">
              <tr>
                <th className="px-4 py-3 text-center">#</th>
                <th className="px-4 py-3 text-center">
                  {translate('summary.tabs.time_driver.modal.start_time')}
                </th>
                <th className="px-4 py-3 text-center">
                  {translate('summary.tabs.time_driver.modal.finish_time')}
                </th>
                <th className="px-4 py-3 text-center">
                  {translate('summary.tabs.time_driver.modal.duration')}
                </th>
                <th className="px-4 py-3 text-center">
                  {translate('summary.tabs.time_driver.modal.distance')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-700 bg-white dark:bg-slate-900">
              {entries.map((entry, idx) => (
                <tr
                  key={idx}
                  className="hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <td className="px-4 py-2 text-center text-gray-500 dark:text-slate-400 font-medium">
                    {idx + 1}
                  </td>
                  <td className="px-4 py-2 text-center dark:text-slate-300">
                    {entry.startDisplay}
                  </td>
                  <td className="px-4 py-2 text-center dark:text-slate-300">
                    {entry.finishDisplay}
                    {entry.dayDiff > 0 && (
                      <span className="text-red-600 dark:text-red-400 text-xs ml-1 font-bold">
                        (+{entry.dayDiff})
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-center font-medium text-slate-700 dark:text-slate-200">
                    {entry.durationDisplay}
                  </td>
                  <td className="px-4 py-2 text-center text-slate-600 dark:text-slate-300">
                    {entry.distance ? entry.distance.toFixed(2) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 dark:bg-slate-800/50 font-bold border-t-2 border-gray-200 dark:border-slate-700">
              <tr>
                <td className="px-4 py-3 text-center text-gray-600 dark:text-slate-400 uppercase text-[10px] tracking-wider">
                  Total
                </td>
                <td></td>
                <td></td>
                <td className="px-4 py-3 text-center text-slate-800 dark:text-slate-200">
                  {totalDurationFormatted}
                </td>
                <td className="px-4 py-3 text-center text-slate-800 dark:text-slate-200">
                  {totalDistance.toFixed(2)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
        <div className="mt-3 text-xs text-slate-500 dark:text-slate-400 italic">
          {translate('summary.tabs.time_driver.modal.footer_note')}
        </div>
      </div>
    </BaseModal>
  );
}
