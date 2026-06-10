'use client';

import ConfirmModal from '@/components/modal/ConfirmModal';
import { deleteVehicleMapping, getVehicleMappings, updateVehicleMapping } from '@/lib/api';
import { getLocalStorage } from '@/lib/localStorageHandler';
import { toastError, toastSuccess } from '@/lib/toast';
import { useCallback, useEffect, useState } from 'react';
import Card from './Card';
import Table from './Table';

export default function VehicleMappingManager({ vehicleTypes, isReadOnly, translate }) {
  const [activeHub, setActiveHub] = useState({ hubId: '', hubName: '' });
  const [mappings, setMappings] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [deleteConfig, setDeleteConfig] = useState({ isOpen: false, id: null, plat: null });

  useEffect(() => {
    const { storedUser, storedLocation, storedLocationName } = getLocalStorage();
    let hubId = storedLocation;
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        if (parsed.activeHub) hubId = parsed.activeHub;
      } catch (e) {}
    }
    setActiveHub({ hubId, hubName: storedLocationName });
  }, []);

  const loadMappings = useCallback(async () => {
    if (!activeHub) return;
    setIsLoading(true);
    try {
      const data = await getVehicleMappings(activeHub.hubId);
      const sortedData = data.sort((a, b) => a.plat.localeCompare(b.plat));
      setMappings(sortedData);
    } catch (error) {
      toastError(
        translate ? translate('common.toast.error', { err: error.message }) : error.message
      );
    } finally {
      setIsLoading(false);
    }
  }, [activeHub, translate]);

  useEffect(() => {
    if (activeHub) loadMappings();
  }, [activeHub, loadMappings]);

  const handleUpdateMapping = async (id, editValues, item) => {
    if (!editValues.mappedType || isReadOnly) return;
    try {
      await updateVehicleMapping(id, item.plat, editValues.mappedType);
      toastSuccess(translate('common.toast.success'));
      await loadMappings();
    } catch (error) {
      toastError(translate('common.toast.error', { err: error.message }));
      throw error;
    }
  };

  const confirmDelete = async () => {
    const targetId = deleteConfig.id;
    const targetPlat = deleteConfig.plat;
    setDeleteConfig({ isOpen: false, id: null, plat: null });
    if (!targetId && !targetPlat) return;

    setIsLoading(true);
    try {
      await deleteVehicleMapping(targetId, targetPlat);
      toastSuccess(translate('common.toast.success'));
      await loadMappings();
    } catch (error) {
      setIsLoading(false);
      toastError(translate('common.toast.error', { err: error.message }));
    }
  };

  const columns = [
    {
      header: translate('common.license_number') || 'Plat',
      field: 'plat',
      render: (item) => (
        <span className="font-semibold text-slate-700 dark:text-slate-200 text-[10px] md:text-sm">
          {item.plat}
        </span>
      ),
    },
    {
      header: translate('common.vehicle_type') || 'Tipe',
      field: 'mappedType',
      headerClassName: 'w-32 md:w-48',
      render: (item) => (
        <span className="text-[10px] md:text-sm font-medium text-sky-700 dark:text-sky-400">
          {item.mappedType}
        </span>
      ),
      renderEdit: (value, onChange) => (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full min-w-0 px-1 py-1 text-[10px] md:text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded outline-none cursor-pointer"
        >
          <option value="" disabled>
            Pilih Tipe
          </option>
          {vehicleTypes.map((v) => (
            <option key={v.id} value={v.name}>
              {v.name}
            </option>
          ))}
        </select>
      ),
    },
  ];

  const confirmModalText = translate('setting.tab.general.mapping_title');

  return (
    <Card>
      <ConfirmModal
        isOpen={deleteConfig.isOpen}
        onCancel={() => setDeleteConfig({ isOpen: false, id: null, plat: null })}
        onConfirm={confirmDelete}
        title={translate('setting.tab.modal.confirm_title', { text: confirmModalText })}
        message={translate('setting.tab.modal.confirm_message', {
          text: confirmModalText.toLowerCase(),
        })}
      />

      <div className="mb-4 border-b border-gray-100 pb-3">
        <h2 className="text-lg font-bold text-gray-900 dark:text-slate-200">
          {translate('setting.tab.general.mapping_title')} ({activeHub.hubName})
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          {translate('setting.tab.general.mapping_subtitle')}
        </p>
      </div>

      <Table
        data={mappings}
        columns={columns}
        isReadOnly={isReadOnly}
        isLoading={isLoading}
        containerHeight="h-[408px]"
        emptyMessage={translate('common.no_data')}
        translate={translate}
        onSave={handleUpdateMapping}
        onDelete={(item) => setDeleteConfig({ isOpen: true, id: item.id, plat: item.plat })}
      />
    </Card>
  );
}
