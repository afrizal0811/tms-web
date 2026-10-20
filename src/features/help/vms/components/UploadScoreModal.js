// File: src/features/help/vms/components/UploadScoreModal.js
'use client';

import Button from '@/components/button/Button';
import Dropdown from '@/components/dropdown/Dropdown';
import FileUploader from '@/components/fileUploader/FileUploader';
import Modal from '@/components/modal/Modal';
import { toastError, toastSuccess } from '@/lib/toast';
import { capitalizeText } from '@/lib/utils';
import { useMemo, useState } from 'react';
import { DRIVER_SCORE_CONFIG } from '../constants/driverScoreConfig';
import { parseDriverScoreExcel, validateDriverScoreFile } from '../helper/driverScore';
import ScoreDetailSection, { ScoreWarningNote } from './ScoreDetailSection';
import ScoreSummaryCards from './ScoreSummaryCards';

export default function UploadScoreModal({ isOpen, onClose }) {
  const [files, setFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [drivers, setDrivers] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleReset = () => {
    setDrivers([]);
    setFiles([]);
    setCurrentIndex(0);
    setIsLoading(false);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleProcessExcel = async () => {
    if (files.length === 0) {
      toastError('Silakan pilih file Excel terlebih dahulu.');
      return;
    }

    setIsLoading(true);
    try {
      const parsedDrivers = await parseDriverScoreExcel(files[0]);

      if (!parsedDrivers || parsedDrivers.length === 0) {
        toastError('Tidak ditemukan data sopir yang valid dalam file Excel.');
        setIsLoading(false);
        return;
      }

      const sortedDrivers = [...parsedDrivers].sort((a, b) =>
        capitalizeText(a.driverName).localeCompare(capitalizeText(b.driverName), undefined, {
          numeric: true,
          sensitivity: 'base',
        })
      );

      setDrivers(sortedDrivers);
      setCurrentIndex(0);
      toastSuccess(`Berhasil memuat data ${sortedDrivers.length} sopir dari Excel.`);
    } catch (error) {
      console.error('Error parsing excel:', error);
      toastError('Gagal memproses file Excel.');
    } finally {
      setIsLoading(false);
    }
  };

  const currentDriver = drivers[currentIndex] || null;
  const driverOptions = useMemo(() => {
    return drivers
      .map((d, idx) => ({
        value: idx,
        label: capitalizeText(d.driverName),
      }))
      .sort((a, b) =>
        a.label.localeCompare(b.label, undefined, { numeric: true, sensitivity: 'base' })
      );
  }, [drivers]);

  const getDriverLabel = (val) => {
    const selected = driverOptions.find((opt) => opt.value === val);
    return selected ? selected.label : '';
  };
  const isHaveDrivers = drivers.length > 0;
  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isHaveDrivers ? 'Hasil Penilaian Sopir' : 'Unggah File Penilaian Sopir'}
      subtitle={
        isHaveDrivers
          ? 'Kalkulator simulasi perhitungan'
          : 'Unggah berkas penilaian sopir untuk melihat perhitungan otomatis'
      }
      maxWidth={isHaveDrivers ? 'max-w-4xl' : 'max-w-xl'}
    >
      <div className="space-y-6 p-2 sm:p-4">
        {drivers.length === 0 ? (
          <div className="space-y-4">
            <FileUploader
              title="Unggah Berkas"
              files={files}
              onUpdateFiles={setFiles}
              validator={validateDriverScoreFile}
              multiple={false}
              inputId="driver-score-excel-input"
            />

            <div className="flex justify-end gap-3 pt-2">
              <Button
                text="Proses"
                width="w-auto"
                size="md"
                disabled={files.length === 0 || isLoading}
                isLoading={isLoading}
                onClick={handleProcessExcel}
                className="bg-sky-600 text-white hover:bg-sky-700 px-6 font-bold shadow-md shadow-sky-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-3.5 rounded-xl border border-sky-200 dark:border-sky-800/60 bg-sky-50/70 dark:bg-sky-950/30">
              <span className="text-xs font-bold uppercase tracking-wider text-sky-800 dark:text-sky-300 shrink-0">
                Pilih Sopir:
              </span>
              <div className="flex-1 sm:max-w-md">
                <Dropdown
                  options={driverOptions}
                  value={currentIndex}
                  onChange={(val) => setCurrentIndex(val)}
                  getLabel={getDriverLabel}
                  isAutocomplete={true}
                  size="sm"
                  className="w-full min-w-0"
                />
              </div>
            </div>

            <ScoreSummaryCards
              distance={currentDriver?.distance}
              warningThreshold={currentDriver?.warningThreshold}
              totalScore={currentDriver?.totalScore}
              roundedTotalScore={currentDriver?.roundedTotalScore}
              indexInfo={currentDriver?.indexInfo}
              breakdown={currentDriver?.breakdown}
            />
            <div className="bg-slate-50 dark:bg-slate-900/50 p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Jarak Tempuh (km)
                </label>
                <div className="relative max-w-sm">
                  <input
                    type="text"
                    readOnly
                    value={currentDriver?.distance ?? ''}
                    className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none pr-12 font-semibold cursor-default"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                    km
                  </span>
                </div>
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
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-200 leading-tight block">
                          {type.label}
                        </label>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                          {type.weightPercent}%
                        </span>
                      </div>

                      <div className="relative mt-2">
                        <input
                          type="text"
                          readOnly
                          value={currentDriver?.incidents[type.id] ?? 0}
                          className="w-full px-3 py-1.5 text-sm rounded-md border border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none pr-12 font-semibold cursor-default"
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
                  text="Reset"
                  width="w-auto"
                  size="md"
                  onClick={handleReset}
                  className="bg-slate-700 hover:bg-slate-800 dark:bg-slate-600 text-white px-5 font-bold shadow-sm"
                />
              </div>
            </div>
            {currentDriver && (
              <ScoreDetailSection
                title={`Detail Perhitungan: ${capitalizeText(currentDriver.driverName)}`}
                distance={currentDriver.distance}
                warningThreshold={currentDriver.warningThreshold}
                breakdown={currentDriver.breakdown}
                totalScore={currentDriver.totalScore}
              />
            )}

            <ScoreWarningNote />
          </div>
        )}
      </div>
    </Modal>
  );
}
