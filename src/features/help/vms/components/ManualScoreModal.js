// File: src/features/help/vms/components/ManualScoreModal.js
'use client';

import Button from '@/components/button/Button';
import Modal from '@/components/modal/Modal';
import { useMemo, useState } from 'react';
import { DRIVER_SCORE_CONFIG, getScoreIndex } from '../constants/driverScoreConfig';
import ScoreDetailSection, { ScoreWarningNote } from './ScoreDetailSection';
import ScoreSummaryCards from './ScoreSummaryCards';

export default function ManualScoreModal({ isOpen, onClose }) {
  const [distance, setDistance] = useState('');
  const [incidents, setIncidents] = useState({
    suddenAcceleration: '',
    suddenBraking: '',
    sharpTurn: '',
    overSpeed: '',
    idleOvertime: '',
  });
  const [calculationResult, setCalculationResult] = useState(null);

  const numericDistance = parseFloat(distance.replace(',', '.')) || 0;
  const warningThreshold = useMemo(() => {
    if (numericDistance < DRIVER_SCORE_CONFIG.MIN_DISTANCE) return 0;
    return Math.round(numericDistance * DRIVER_SCORE_CONFIG.WARNING_THRESHOLD_PERCENT);
  }, [numericDistance]);

  const handleDistanceChange = (val) => {
    const cleaned = val.replace(/[^0-9.,]/g, '');
    const separatorMatch = cleaned.match(/[.,]/);
    if (separatorMatch) {
      const sep = separatorMatch[0];
      const parts = cleaned.split(sep);
      const intPart = parts[0].replace(/[^0-9]/g, '').slice(0, 5);
      const decPart = parts
        .slice(1)
        .join('')
        .replace(/[^0-9]/g, '')
        .slice(0, 2);
      setDistance(`${intPart}${sep}${decPart}`);
    } else {
      setDistance(cleaned.slice(0, 5));
    }
  };

  const handleIncidentChange = (id, val) => {
    if (val === '') {
      setIncidents((prev) => ({
        ...prev,
        [id]: '',
      }));
      return;
    }
    const cleaned = val.replace(/[^0-9]/g, '').slice(0, 4);
    const num = Math.min(9999, parseInt(cleaned, 10) || 0);
    setIncidents((prev) => ({
      ...prev,
      [id]: num.toString(),
    }));
  };

  const isAllFieldsFilled = useMemo(() => {
    const parsedDist = parseFloat(distance.replace(',', '.'));
    if (
      !distance ||
      distance.trim() === '' ||
      isNaN(parsedDist) ||
      parsedDist < DRIVER_SCORE_CONFIG.MIN_DISTANCE
    ) {
      return false;
    }
    return DRIVER_SCORE_CONFIG.INCIDENT_TYPES.every((type) => {
      const val = incidents[type.id];
      return val !== '' && val !== null && val !== undefined;
    });
  }, [distance, incidents]);

  const handleCalculate = (e) => {
    if (e) e.preventDefault();
    if (!isAllFieldsFilled) return;

    const threshold = warningThreshold;

    const breakdown = DRIVER_SCORE_CONFIG.INCIDENT_TYPES.map((type) => {
      const count = parseInt(incidents[type.id], 10) || 0;
      let rawScore = 0;
      let isExceeded = false;
      let formulaText = '';

      if (threshold <= 0) {
        rawScore = count === 0 ? 100 : 0;
        formulaText = count === 0 ? 'Tidak ada kejadian = 100' : 'Batas 0 km = 0';
      } else if (count > threshold) {
        rawScore = 0;
        isExceeded = true;
        formulaText = `${count} > ${threshold} = 0`;
      } else {
        rawScore = Math.max(0, 100 - (count / threshold) * 100);
        formulaText = `100 - ((${count} / ${threshold}) * 100) = ${rawScore.toFixed(2)}`;
      }

      const finalScore = rawScore * type.weight;
      const finalFormulaText = `${rawScore.toFixed(2).replace('.', ',')} * ${type.weightPercent}% = ${finalScore.toFixed(2).replace('.', ',')}`;

      return {
        id: type.id,
        label: type.label,
        weight: type.weight,
        weightPercent: type.weightPercent,
        count,
        rawScore,
        finalScore,
        isExceeded,
        formulaText,
        finalFormulaText,
      };
    });

    const totalScore = breakdown.reduce((acc, curr) => acc + curr.finalScore, 0);
    const roundedTotalScore = Math.round(totalScore);
    const indexInfo = getScoreIndex(roundedTotalScore);

    setCalculationResult({
      distance: numericDistance,
      warningThreshold: threshold,
      breakdown,
      totalScore,
      roundedTotalScore,
      indexInfo,
    });
  };

  const handleReset = () => {
    setDistance('');
    setIncidents({
      suddenAcceleration: '',
      suddenBraking: '',
      sharpTurn: '',
      overSpeed: '',
      idleOvertime: '',
    });
    setCalculationResult(null);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Hitung Manual Penilaian Sopir"
      subtitle="Kalkulator simulasi perhitungan"
      maxWidth="max-w-4xl"
    >
      <div className="space-y-6 p-2 sm:p-4">
        <ScoreSummaryCards
          distance={numericDistance}
          warningThreshold={warningThreshold}
          totalScore={calculationResult?.totalScore}
          roundedTotalScore={calculationResult?.roundedTotalScore}
          indexInfo={calculationResult?.indexInfo}
          breakdown={calculationResult?.breakdown}
        />

        <div className="bg-slate-50 dark:bg-slate-900/50 p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Jarak Tempuh (km) <span className="text-rose-500">*</span>
            </label>
            <div className="relative max-w-sm">
              <input
                type="text"
                inputMode="decimal"
                maxLength={8}
                value={distance}
                onChange={(e) => handleDistanceChange(e.target.value)}
                placeholder="500"
                className={`w-full px-3.5 py-2 text-sm rounded-lg border ${
                  distance && numericDistance < DRIVER_SCORE_CONFIG.MIN_DISTANCE
                    ? 'border-amber-400 dark:border-amber-500 focus:ring-amber-500/20 focus:border-amber-500'
                    : 'border-slate-300 dark:border-slate-600 focus:ring-sky-500/20 focus:border-sky-500'
                } bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 transition-all pr-12 font-medium`}
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                km
              </span>
            </div>
            {distance && numericDistance < DRIVER_SCORE_CONFIG.MIN_DISTANCE && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium mt-1">
                Minimal jarak tempuh adalah {DRIVER_SCORE_CONFIG.MIN_DISTANCE} km
              </p>
            )}
          </div>

          <hr className="border-slate-200 dark:border-slate-700" />
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                Jumlah Kejadian
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {DRIVER_SCORE_CONFIG.INCIDENT_TYPES.map((type) => (
                <div
                  key={type.id}
                  className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 transition-all"
                >
                  <div className="flex justify-between items-start gap-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-200 leading-tight">
                      {type.label}
                    </label>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      Bobot {type.weightPercent}%
                    </span>
                  </div>

                  <div className="relative mt-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={4}
                      value={incidents[type.id]}
                      onChange={(e) => handleIncidentChange(type.id, e.target.value)}
                      placeholder="0"
                      className="w-full px-3 py-1.5 text-sm rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 pr-12 font-medium"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                      kali
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button
              text="Hitung"
              width="w-auto"
              size="md"
              disabled={!isAllFieldsFilled}
              onClick={handleCalculate}
              className="bg-sky-600 text-white hover:bg-sky-700 px-6 font-bold shadow-md shadow-sky-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <button
              type="button"
              onClick={handleReset}
              className="px-4 py-2 text-sm font-semibold rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              Reset
            </button>
          </div>
        </div>

        {calculationResult && (
          <ScoreDetailSection
            distance={calculationResult.distance}
            warningThreshold={calculationResult.warningThreshold}
            breakdown={calculationResult.breakdown}
            totalScore={calculationResult.totalScore}
          />
        )}

        <ScoreWarningNote />
      </div>
    </Modal>
  );
}
