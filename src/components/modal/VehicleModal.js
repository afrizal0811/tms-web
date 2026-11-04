'use client';

import Button from '@/components/button/Button';
import Dropdown from '@/components/dropdown/Dropdown';
import Modal from '@/components/modal/Modal';
import { useLanguage } from '@/context/LanguageContext';
import { configureVehicles, getVehicleTypes } from '@/lib/api/mileapp';
import { getLocalStorage } from '@/lib/localStorageHandler';
import { toastError, toastSuccess } from '@/lib/toast';
import { getBasePlate, ProperCaseText } from '@/lib/utils';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx-js-style';

const STORAGE_OPTIONS = [
  { label: 'Dry', value: 'Dry' },
  { label: 'Frozen', value: 'Frozen' },
];

const getItemKey = (item) =>
  item.base_plate || getBasePlate(item.license_number || item.plat || item.vehicle_id || '');

const getPlatDisplay = (item) =>
  item.base_plate || getBasePlate(item.license_number || item.plat || '');

const formatStorage = (val) => (val ? ProperCaseText(String(val).toLowerCase().trim()) : '');

const formatType = (val) => (val ? String(val).toUpperCase().trim() : '');

export default function VehicleModal({ isOpen, unmappedData = [], onCompleted, t: propT }) {
  const { t: contextT } = useLanguage();
  const t = propT || contextT;

  const [selections, setSelections] = useState({});
  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef(null);

  const isModalOpen = isOpen !== undefined ? isOpen : unmappedData.length > 0;

  useEffect(() => {
    if (!isModalOpen || !unmappedData || unmappedData.length === 0) return;

    async function fetchVehicleTypes() {
      setIsLoading(true);
      try {
        const typesObj = await getVehicleTypes();
        const types = typesObj?.allTypes || [];
        setVehicleTypes(types.map((v) => ({ label: v.name, value: v.name })));

        const initial = {};
        unmappedData.forEach((item) => {
          initial[getItemKey(item)] = {
            storage: formatStorage(item.storage),
            type: formatType(item.type),
          };
        });
        setSelections(initial);
      } catch (error) {
        toastError(t('common.toast.error', { err: error.message }), error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchVehicleTypes();
  }, [isModalOpen, unmappedData, t]);

  const sortedData = useMemo(() => {
    return [...(unmappedData || [])].sort((a, b) =>
      getPlatDisplay(a).localeCompare(getPlatDisplay(b))
    );
  }, [unmappedData]);

  if (!isModalOpen || !unmappedData || unmappedData.length === 0) {
    return null;
  }

  const handleSelectionChange = (key, field, value) => {
    setSelections((prev) => ({
      ...prev,
      [key]: {
        ...(prev[key] || {}),
        [field]: value,
      },
    }));
  };

  const isAllSelected = sortedData.every((item) => {
    const sel = selections[getItemKey(item)];
    return sel?.storage && sel?.type;
  });

  const handleDownloadTemplate = () => {
    try {
      const typeListStr = vehicleTypes.map((v) => v.value).join(', ');
      const rows =
        sortedData.length > 0
          ? sortedData.map((item) => {
              const plat = getPlatDisplay(item);
              return {
                number_license: plat,
                storage: selections[plat]?.storage || '',
                type: selections[plat]?.type || '',
              };
            })
          : [{ number_license: '', storage: '', type: '' }];

      const ws = XLSX.utils.json_to_sheet(rows, {
        header: ['number_license', 'storage', 'type'],
      });

      ws['!cols'] = [{ wch: 18 }, { wch: 15 }, { wch: 20 }];

      if (ws['B1']) {
        ws['B1'].c = [{ a: 'System', t: 'Dry/Frozen' }];
      }
      if (ws['C1']) {
        ws['C1'].c = [
          {
            a: 'System',
            t: typeListStr ? `Pilihan: ${typeListStr}` : 'Tipe kendaraan dari database',
          },
        ];
      }

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Data');
      XLSX.writeFile(wb, 'Template_Kendaraan.xlsx');
    } catch (err) {
      toastError(t('common.toast.error', { err: err.message }), err);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });

      const sheetName = wb.SheetNames.find((name) => name.trim().toLowerCase() === 'data');
      if (!sheetName) {
        toastError('Sheet bernama "Data" tidak ditemukan dalam file excel');
        return;
      }

      const ws = wb.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });

      if (rows.length === 0) {
        toastError('File excel tidak memiliki baris data');
        return;
      }

      const firstRowKeys = Object.keys(rows[0]).map((k) => k.trim().toLowerCase());
      const hasNumberLicense = firstRowKeys.includes('number_license');
      const hasStorage = firstRowKeys.includes('storage');
      const hasType = firstRowKeys.includes('type');

      if (!hasNumberLicense || !hasStorage || !hasType) {
        toastError('Header kolom file excel harus memiliki number_license, storage, dan type');
        return;
      }

      const validTypes = new Set(vehicleTypes.map((v) => v.value.toUpperCase()));
      const validStorage = new Set(['DRY', 'FROZEN']);
      const updates = {};

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNum = i + 2;
        const normalizedRow = Object.fromEntries(
          Object.entries(row).map(([k, v]) => [k.trim().toLowerCase(), String(v).trim()])
        );

        const rawPlat = normalizedRow['number_license'] || '';
        const rawStorage = normalizedRow['storage'] || '';
        const rawType = normalizedRow['type'] || '';

        if (!rawPlat) {
          toastError(`Baris ${rowNum}: Kolom number_license tidak boleh kosong`);
          return;
        }

        if (!rawStorage) {
          toastError(`Baris ${rowNum}: Kolom storage untuk ${rawPlat} tidak boleh kosong`);
          return;
        }

        if (!validStorage.has(rawStorage.toUpperCase())) {
          toastError(
            `Baris ${rowNum}: Storage "${rawStorage}" untuk ${rawPlat} tidak valid. Harus Dry atau Frozen`
          );
          return;
        }

        if (!rawType) {
          toastError(`Baris ${rowNum}: Kolom type untuk ${rawPlat} tidak boleh kosong`);
          return;
        }

        if (!validTypes.has(rawType.toUpperCase())) {
          const typeNames = vehicleTypes.map((v) => v.value).join(', ');
          toastError(
            `Baris ${rowNum}: Tipe kendaraan "${rawType}" untuk ${rawPlat} tidak valid. Pilihan: ${typeNames}`
          );
          return;
        }

        const basePlat = getBasePlate(rawPlat);
        updates[basePlat] = {
          storage: formatStorage(rawStorage),
          type: formatType(rawType),
        };
      }

      setSelections((prev) => {
        const next = { ...prev };
        Object.entries(updates).forEach(([platKey, val]) => {
          const matchedItem = sortedData.find((item) => {
            const itemKey = getItemKey(item);
            return (
              itemKey.replace(/\s+/g, '').toUpperCase() ===
              platKey.replace(/\s+/g, '').toUpperCase()
            );
          });

          const finalKey = matchedItem ? getItemKey(matchedItem) : platKey;
          next[finalKey] = {
            storage: val.storage,
            type: val.type,
          };
        });
        return next;
      });

      toastSuccess('Berhasil memuat data kendaraan dari excel');
    } catch (err) {
      toastError(`Gagal membaca file excel: ${err.message}`);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { storedLocation } = getLocalStorage();
      const payload = sortedData.map((item) => {
        const key = getItemKey(item);
        const sel = selections[key] || {};
        const plat = getPlatDisplay(item);
        return {
          base_plate: plat,
          license_number: plat,
          vehicle_ids: item.vehicle_ids || (item.vehicle_id ? [item.vehicle_id] : []),
          storage: formatStorage(sel.storage),
          type: formatType(sel.type),
          vendorData: item.vendorData,
          vendorVehicles: item.vendorVehicles,
        };
      });

      await configureVehicles(payload, storedLocation);
      toastSuccess(t('common.toast.success'));

      if (typeof onCompleted === 'function') {
        onCompleted();
      }
    } catch (error) {
      toastError(t('common.toast.error', { err: error.message }), error);
    } finally {
      setIsSaving(false);
    }
  };

  const footerContent = (
    <div className="flex items-center justify-between gap-2 w-full">
      <div>
        <input
          type="file"
          ref={fileInputRef}
          accept=".xlsx, .xls"
          className="hidden"
          onChange={handleFileUpload}
        />
        <Button
          type="split"
          size="sm"
          text="Upload"
          onClick={() => fileInputRef.current?.click()}
          menuPlacement="top"
          menuAlign="left"
          options={[
            {
              id: 'template',
              label: 'Template',
              onClick: handleDownloadTemplate,
            },
          ]}
          width="w-auto"
        />
      </div>

      <Button
        size="sm"
        text={t('common.button.btn_save')}
        onClick={handleSave}
        disabled={!isAllSelected || isLoading || isSaving}
        isLoading={isSaving}
        width="w-auto"
      />
    </div>
  );

  return (
    <Modal
      isOpen={isModalOpen}
      title={t('common.warning')}
      subtitle={t('common.modal.vehicle_subtitle')}
      maxWidth="max-w-2xl"
      contentClassName="min-h-[500px] overflow-visible"
      bodyClassName="m-6 overflow-visible"
      footer={footerContent}
      noClose={true}
    >
      <div>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <svg className="animate-spin h-6 w-6 text-sky-600" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </div>
        ) : (
          <div
            className={
              sortedData.length > 3 ? 'max-h-[55vh] overflow-y-auto space-y-3 pr-1' : 'space-y-3'
            }
          >
            {sortedData.map((info, idx) => {
              const key = getItemKey(info);
              const currentSel = selections[key] || { storage: '', type: '' };
              const plat = getPlatDisplay(info);

              return (
                <div
                  key={key || idx}
                  className="p-3 border border-gray-200 dark:border-slate-700 rounded-lg bg-gray-50/50 dark:bg-slate-800/60"
                >
                  <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm mb-2">
                    {plat}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
                        {t('common.storage_type')}
                      </label>
                      <Dropdown
                        options={STORAGE_OPTIONS}
                        value={currentSel.storage}
                        onChange={(val) => handleSelectionChange(key, 'storage', val)}
                        getLabel={(val) => val || t('common.select')}
                        size="sm"
                        className="w-full"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
                        {t('common.vehicle_type')}
                      </label>
                      <Dropdown
                        options={vehicleTypes}
                        value={currentSel.type}
                        onChange={(val) => handleSelectionChange(key, 'type', val)}
                        getLabel={(val) => val || t('common.select')}
                        size="sm"
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
}
