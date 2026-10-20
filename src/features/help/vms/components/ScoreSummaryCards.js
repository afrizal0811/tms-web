// File: src/features/help/vms/components/ScoreSummaryCards.js
'use client';

import InformationButton from '@/components/button/InformationButton';
import { DRIVER_SCORE_CONFIG } from '../constants/driverScoreConfig';

export default function ScoreSummaryCards({
  distance = 0,
  warningThreshold = 0,
  totalScore = null,
  roundedTotalScore = null,
  indexInfo = null,
  breakdown = null,
}) {
  const thresholdTooltipText =
    distance >= DRIVER_SCORE_CONFIG.MIN_DISTANCE
      ? `5% x ${distance} km = ${warningThreshold}`
      : distance > 0
        ? `Minimal jarak tempuh ${DRIVER_SCORE_CONFIG.MIN_DISTANCE} km`
        : '5% x {Jarak Tempuh}';

  const totalScoreTooltipText =
    breakdown && totalScore !== null && totalScore !== undefined
      ? breakdown.map((b) => `${b.finalScore.toFixed(2).replace('.', ',')}`).join(' + ') +
        ` = ${totalScore.toFixed(2).replace('.', ',')} (${roundedTotalScore ?? Math.round(totalScore)})`
      : 'Skor 1 + Skor 2 + ... + Skor N';

  const indexTooltipText =
    `Rentang Nilai Indeks Skor:\n` +
    DRIVER_SCORE_CONFIG.INDEX_RANGES.map((r) => `${r.min}-${r.max}: ${r.grade} (${r.label})`).join(
      '\n'
    );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <div className="p-4 rounded-xl border border-sky-100 dark:border-sky-900/40 bg-sky-50/60 dark:bg-sky-950/20 flex flex-col justify-between">
        <div className="flex items-center justify-between text-xs font-semibold text-sky-700 dark:text-sky-400 uppercase tracking-wider">
          <span>Batas Peringatan</span>
          <InformationButton infoText={thresholdTooltipText} size="4" />
        </div>
        <div className="mt-2 flex items-baseline gap-1.5">
          <span className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            {warningThreshold > 0 ? warningThreshold : '-'}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400">kali kejadian</span>
        </div>
      </div>
      <div className="p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/60 dark:bg-indigo-950/20 flex flex-col justify-between">
        <div className="flex items-center justify-between text-xs font-semibold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">
          <span>Total Skor</span>
          <InformationButton infoText={totalScoreTooltipText} size="4" />
        </div>
        <div className="mt-2 flex items-baseline gap-1.5">
          <span className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            {totalScore !== null && totalScore !== undefined
              ? totalScore.toFixed(2).replace('.', ',')
              : '-'}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400">/ 100</span>
        </div>
      </div>
      <div className="p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/40 bg-emerald-50/60 dark:bg-emerald-950/20 flex flex-col justify-between">
        <div className="flex items-center justify-between text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
          <span>Indeks Skor</span>
          <InformationButton infoText={indexTooltipText} size="4" />
        </div>
        <div className="mt-2 flex items-center gap-2">
          <span
            className={`inline-flex items-center justify-center w-9 h-9 text-xl font-extrabold rounded-lg border shadow-sm ${
              indexInfo
                ? indexInfo.badgeClass
                : 'bg-slate-100 text-slate-400 border-slate-200 dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700'
            }`}
          >
            {indexInfo ? indexInfo.grade : '-'}
          </span>
        </div>
      </div>
    </div>
  );
}
