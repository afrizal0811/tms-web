// File: src/features/help/vms/components/ScoreDetailSection.js
'use client';

export function ScoreWarningNote() {
  return (
    <div className="flex items-start gap-2.5 p-3.5 rounded-lg border border-amber-200 dark:border-amber-900/40 bg-amber-50/70 dark:bg-amber-950/20 text-xs text-amber-900 dark:text-amber-200">
      <span className="text-base shrink-0 leading-none">⚠️</span>
      <div className="leading-relaxed">
        Tiap jumlah kejadian yang melebihi Batas Peringatan, maka otomatis skor untuk kejadian itu
        bernilai <strong>0</strong>.
      </div>
    </div>
  );
}

export default function ScoreDetailSection({
  title = 'Detail Hasil Perhitungan',
  distance = 0,
  warningThreshold = 0,
  breakdown = [],
  totalScore = 0,
}) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 sm:p-5 shadow-sm space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
          {title}
        </h3>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          Jarak: <strong>{distance} km</strong> | Batas Peringatan:{' '}
          <strong>{warningThreshold} kali</strong>
        </span>
      </div>
      <div className="space-y-3">
        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
          1. Skor Tiap Jenis Kejadian
        </h4>

        <div className="p-3 rounded-lg bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 flex items-center gap-3">
          <span className="shrink-0 text-xs font-bold px-2 py-1 bg-sky-600 text-white rounded">
            Rumus
          </span>
          <code className="text-xs sm:text-sm font-mono font-semibold text-sky-900 dark:text-sky-200">
            Skor = 100 - ((Jumlah Peringatan / Jumlah Batas Peringatan) * 100)
          </code>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
                <th className="py-2 px-3 font-semibold">Jenis Kejadian</th>
                <th className="py-2 px-3 font-semibold text-center">Jumlah Kejadian</th>
                <th className="py-2 px-3 font-semibold">Perhitungan Rumus</th>
                <th className="py-2 px-3 font-semibold text-right">Skor (Maks. 100)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {breakdown.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-750">
                  <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-200">
                    {item.label}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span
                      className={`font-semibold px-2 py-0.5 rounded text-[11px] ${
                        item.isExceeded || (warningThreshold > 0 && item.count > warningThreshold)
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 font-bold'
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {item.count} kali
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                    {item.formulaText}
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold text-slate-900 dark:text-slate-100">
                    {item.rawScore.toFixed(2).replace('.', ',')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <hr className="border-slate-100 dark:border-slate-700" />
      <div className="space-y-3">
        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
          2. Skor Akhir Tiap Jenis Kejadian
        </h4>

        <div className="p-3 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 flex items-center gap-3">
          <span className="shrink-0 text-xs font-bold px-2 py-1 bg-indigo-600 text-white rounded">
            Rumus
          </span>
          <code className="text-xs sm:text-sm font-mono font-semibold text-indigo-900 dark:text-indigo-200">
            Skor Akhir = Skor * %Bobot Penilaian
          </code>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
                <th className="py-2 px-3 font-semibold">Jenis Kejadian</th>
                <th className="py-2 px-3 font-semibold text-center">Bobot Penilaian</th>
                <th className="py-2 px-3 font-semibold">Perhitungan Skor Akhir</th>
                <th className="py-2 px-3 font-semibold text-right">Skor Akhir</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {breakdown.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-750">
                  <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-200">
                    {item.label}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span className="font-semibold px-2 py-0.5 rounded text-[11px] bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                      {item.weightPercent}%
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                    {item.finalFormulaText}
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold text-indigo-700 dark:text-indigo-300">
                    {item.finalScore.toFixed(2).replace('.', ',')}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-300 dark:border-slate-600 bg-slate-50/80 dark:bg-slate-900/60 font-bold">
                <td
                  colSpan={3}
                  className="py-2.5 px-3 text-slate-800 dark:text-slate-100 text-right uppercase tracking-wider"
                >
                  Total Skor Akhir:
                </td>
                <td className="py-2.5 px-3 text-right text-base text-indigo-700 dark:text-indigo-300">
                  {totalScore.toFixed(2).replace('.', ',')}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
