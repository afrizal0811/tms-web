// File: src/features/help/vms/components/ManualScoreModal.js
'use client';

import Button from '@/components/button/Button';
import InformationButton from '@/components/button/InformationButton';
import Modal from '@/components/modal/Modal';
import { useMemo, useState } from 'react';
import { DRIVER_SCORE_CONFIG, getScoreIndex } from '../constants/driverScoreConfig';

export default function ManualScoreModal({ isOpen, onClose }) {
  // Input fields state (string kosong saat belum diisi)
  const [distance, setDistance] = useState('');
  const [incidents, setIncidents] = useState({
    suddenAcceleration: '',
    suddenBraking: '',
    sharpTurn: '',
    overSpeed: '',
    idleOvertime: '',
  });

  // State untuk menyimpan hasil kalkulasi setelah tombol 'Hitung' ditekan
  const [calculationResult, setCalculationResult] = useState(null);

  // Batas Peringatan (5% dari Jarak Tempuh, pembulatan round)
  const numericDistance = parseFloat(distance) || 0;
  const warningThreshold = useMemo(() => {
    if (numericDistance <= 0) return 0;
    return Math.round(numericDistance * DRIVER_SCORE_CONFIG.WARNING_THRESHOLD_PERCENT);
  }, [numericDistance]);

  // Handler input Jarak Tempuh: maksimal 5 digit (maksimal 99999 km)
  const handleDistanceChange = (val) => {
    const cleaned = val.replace(/[^0-9]/g, '').slice(0, 5);
    setDistance(cleaned);
  };

  // Handler input Kejadian: maksimal 4 digit (maksimal 9999 kali)
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

  // Cek apakah semua field telah terisi
  const isAllFieldsFilled = useMemo(() => {
    if (!distance || distance.trim() === '') return false;
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
        // Aturan: Melebihi Batas Peringatan -> otomatis 0
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

  // Tooltip content
  const thresholdTooltipText =
    numericDistance > 0 ? `5% x ${numericDistance} km = ${warningThreshold}` : '5% x {Jarak Tempuh}';

  const totalScoreTooltipText = calculationResult
    ? calculationResult.breakdown
        .map((b) => `${b.finalScore.toFixed(2).replace('.', ',')}`)
        .join(' + ') +
      ` = ${calculationResult.totalScore.toFixed(2).replace('.', ',')} (${calculationResult.roundedTotalScore})`
    : 'Skor 1 + Skor 2 + ... + Skor N';

  const indexTooltipText =
    `Rentang Nilai Indeks Skor:\n` +
    DRIVER_SCORE_CONFIG.INDEX_RANGES.map((r) => `${r.min}-${r.max}: ${r.grade} (${r.label})`).join('\n');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Hitung Manual Penilaian Sopir"
      subtitle="Kalkulator simulasi perhitungan batas peringatan, skor tiap kejadian, total skor, dan indeks skor"
      maxWidth="max-w-4xl"
    >
      <div className="space-y-6 p-2 sm:p-4">
        {/* RINGKASAN STATUS ATAS (Batas Peringatan, Total Skor, Indeks Skor) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* 1. Batas Peringatan */}
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

          {/* 2. Total Skor */}
          <div className="p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/60 dark:bg-indigo-950/20 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-semibold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">
              <span>Total Skor</span>
              <InformationButton infoText={totalScoreTooltipText} size="4" />
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                {calculationResult
                  ? calculationResult.totalScore.toFixed(2).replace('.', ',')
                  : '-'}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">/ 100</span>
            </div>
          </div>

          {/* 3. Indeks Skor */}
          <div className="p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/40 bg-emerald-50/60 dark:bg-emerald-950/20 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
              <span>Indeks Skor</span>
              <InformationButton infoText={indexTooltipText} size="4" />
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span
                className={`inline-flex items-center justify-center w-9 h-9 text-xl font-extrabold rounded-lg border shadow-sm ${
                  calculationResult
                    ? calculationResult.indexInfo.badgeClass
                    : 'bg-slate-100 text-slate-400 border-slate-200 dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700'
                }`}
              >
                {calculationResult ? calculationResult.indexInfo.grade : '-'}
              </span>
            </div>
          </div>
        </div>

        {/* FORM INPUT SECTION */}
        <div className="bg-slate-50 dark:bg-slate-900/50 p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4">
          {/* Field Jarak Tempuh (Maksimal 5 karakter / 99999 km) */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Jarak Tempuh (km) <span className="text-rose-500">*</span>
            </label>
            <div className="relative max-w-sm">
              <input
                type="text"
                inputMode="numeric"
                maxLength={5}
                value={distance}
                onChange={(e) => handleDistanceChange(e.target.value)}
                placeholder="Contoh: 500"
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all pr-12 font-medium"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                km
              </span>
            </div>
          </div>

          <hr className="border-slate-200 dark:border-slate-700" />

          {/* KELOMPOK: JUMLAH KEJADIAN */}
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

          {/* ACTION BUTTONS (Hitung hanya enable saat semua field terisi) */}
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

        {/* KELOMPOK: DETAIL (Muncul setelah dihitung) */}
        {calculationResult && (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 sm:p-5 shadow-sm space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
                Detail Hasil Perhitungan
              </h3>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Jarak: <strong>{calculationResult.distance} km</strong> | Batas Peringatan: <strong>{calculationResult.warningThreshold} kali</strong>
              </span>
            </div>

            {/* SUB-TITLE 1: Skor Tiap Jenis Kejadian */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                1. Skor Tiap Jenis Kejadian
              </h4>

              {/* Formula Badge Penanda Khusus */}
              <div className="p-3 rounded-lg bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 flex items-center gap-3">
                <span className="shrink-0 text-xs font-bold px-2 py-1 bg-sky-600 text-white rounded">
                  Rumus
                </span>
                <code className="text-xs sm:text-sm font-mono font-semibold text-sky-900 dark:text-sky-200">
                  Skor = 100 - ((Jumlah Peringatan / Jumlah Batas Peringatan) * 100)
                </code>
              </div>

              {/* Rincian Tiap Baris */}
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
                    {calculationResult.breakdown.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-750">
                        <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-200">
                          {item.label}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="font-semibold px-2 py-0.5 rounded text-[11px] bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                            {item.count} kali
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                          {item.formulaText}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900 dark:text-slate-100">
                          {item.rawScore.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <hr className="border-slate-100 dark:border-slate-700" />

            {/* SUB-TITLE 2: Skor Akhir Tiap Jenis Kejadian */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                2. Skor Akhir Tiap Jenis Kejadian
              </h4>

              {/* Formula Badge Penanda Khusus */}
              <div className="p-3 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 flex items-center gap-3">
                <span className="shrink-0 text-xs font-bold px-2 py-1 bg-indigo-600 text-white rounded">
                  Rumus
                </span>
                <code className="text-xs sm:text-sm font-mono font-semibold text-indigo-900 dark:text-indigo-200">
                  Skor Akhir = Skor * %Bobot Penilaian
                </code>
              </div>

              {/* Rincian Tiap Baris */}
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
                    {calculationResult.breakdown.map((item) => (
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
                      <td colSpan={3} className="py-2.5 px-3 text-slate-800 dark:text-slate-100 text-right uppercase tracking-wider">
                        Total Skor Akhir:
                      </td>
                      <td className="py-2.5 px-3 text-right text-base text-indigo-700 dark:text-indigo-300">
                        {calculationResult.totalScore.toFixed(2).replace('.', ',')}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* NOTE DI BAWAH MODAL (Hanya ikon warning dan penjelasannya) */}
        <div className="flex items-start gap-2.5 p-3.5 rounded-lg border border-amber-200 dark:border-amber-900/40 bg-amber-50/70 dark:bg-amber-950/20 text-xs text-amber-900 dark:text-amber-200">
          <span className="text-base shrink-0 leading-none">⚠️</span>
          <div className="leading-relaxed">
            Tiap jumlah kejadian yang melebihi Batas Peringatan, maka otomatis skor untuk kejadian itu bernilai <strong>0</strong>.
          </div>
        </div>
      </div>
    </Modal>
  );
}
