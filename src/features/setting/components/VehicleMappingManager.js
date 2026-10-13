'use client';

import Dropdown from '@/components/dropdown/Dropdown';
import HighlightText from '@/components/HighlightText';
import ConfirmModal from '@/components/modal/ConfirmModal';
import SearchBar from '@/components/SearchBar';
import { deleteVehicleMapping, getVehicleMappings, updateVehicleMapping } from '@/lib/api/mileapp';
import { getLocalStorage } from '@/lib/localStorageHandler';
import { toastError, toastSuccess } from '@/lib/toast';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Card from './Card';
import CustomTable from './CustomTable';

export default function VehicleMappingManager({ vehicleTypes, isReadOnly, translate }) {
  const [activeHub, setActiveHub] = useState({ hubId: '', hubName: '' });
  const [mappings, setMappings] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfig, setDeleteConfig] = useState({ isOpen: false, id: null, plat: null });

  useEffect(() => {
    const { storedUser, storedLocation, storedLocationName } = getLocalStorage();
    let hubId = storedLocation;
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        if (parsed.activeHub) hubId = parsed.activeHub;
      } catch (e) {
        toastError(translate('common.toast.error', { err: e.message }), e);
      }
    }
    setActiveHub({ hubId, hubName: storedLocationName });
  }, [translate]);

  const loadMappings = useCallback(async () => {
    if (!activeHub) return;
    setIsLoading(true);
    try {
      const data = await getVehicleMappings(activeHub.hubId);
      setMappings(data);
    } catch (e) {
      toastError(translate('common.toast.error', { err: e.message }), e);
    } finally {
      setIsLoading(false);
    }
  }, [activeHub, translate]);

  useEffect(() => {
    if (activeHub) loadMappings();
  }, [activeHub, loadMappings]);

  const filteredMappings = useMemo(() => {
    const list = mappings || [];
    const q = searchQuery.toLowerCase().trim();
    const filtered = !q
      ? list
      : list.filter((m) => {
          const plat = (m.plat || '').toLowerCase();
          const mappedType = (m.mappedType || '').toLowerCase();
          return plat.includes(q) || mappedType.includes(q);
        });

    return filtered.map((item, idx) => ({
      ...item,
      _index: idx + 1,
    }));
  }, [mappings, searchQuery]);

  const handleUpdateMapping = async (id, editValues, item) => {
    if (!editValues.mappedType || isReadOnly) return;
    try {
      await updateVehicleMapping(id, item.plat, editValues.mappedType);
      toastSuccess(translate('common.toast.success'));
      await loadMappings();
    } catch (e) {
      toastError(translate('common.toast.error', { err: e.message }), e);
      throw e;
    }
  };

  const confirmDelete = async () => {
    const targetId = deleteConfig.id;
    setDeleteConfig({ isOpen: false, id: null, plat: null });
    if (!targetId) return;

    setIsLoading(true);
    try {
      await deleteVehicleMapping(targetId);
      toastSuccess(translate('common.toast.success'));
      await loadMappings();
    } catch (e) {
      setIsLoading(false);
      toastError(translate('common.toast.error', { err: e.message }), e);
    }
  };

  const columns = useMemo(
    () => [
      {
        header: '#',
        field: '_index',
        headerClassName: 'w-10 sm:w-12 text-center',
        align: 'center',
        cellClassName: 'text-center',
        render: (item) => (
          <span className="text-[10px] md:text-xs font-medium text-slate-500 dark:text-slate-400">
            {item._index}
          </span>
        ),
      },
      {
        header: translate('common.license_number') || 'Plat',
        field: 'plat',
        render: (item) => (
          <span className="font-semibold text-slate-700 dark:text-slate-200 text-[10px] md:text-sm">
            <HighlightText text={item.plat} highlight={searchQuery} />
          </span>
        ),
      },
      {
        header: translate('common.vehicle_type') || 'Tipe',
        field: 'mappedType',
        headerClassName: 'w-32 md:w-48',
        render: (item) => (
          <span className="text-[10px] md:text-sm font-medium text-sky-700 dark:text-sky-400">
            <HighlightText text={item.mappedType} highlight={searchQuery} />
          </span>
        ),
        renderEdit: (value, onChange) => (
          <Dropdown
            options={vehicleTypes.map((v) => ({ label: v.name, value: v.name }))}
            value={value}
            onChange={onChange}
            getLabel={(val) => val || translate('common.select')}
            size="sm"
            className="w-full min-w-0"
          />
        ),
      },
    ],
    [searchQuery, translate, vehicleTypes]
  );

  const msgParts = translate('common.modal.delete_message', { text: '|||' }).split('|||');

  return (
    <Card>
      <ConfirmModal
        isOpen={deleteConfig.isOpen}
        onCancel={() => setDeleteConfig({ isOpen: false, id: null, plat: null })}
        onConfirm={confirmDelete}
        title={translate('common.modal.delete_title', {
          text: translate('setting.tab.general.mapping_title'),
        })}
        message={
          <span>
            {msgParts[0]}
            <strong>{deleteConfig.plat}</strong>
            {msgParts[1]}
          </span>
        }
      />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 border-b border-gray-100 dark:border-slate-800 pb-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-slate-200">
            {translate('setting.tab.general.mapping_title')}{' '}
            {activeHub?.hubName ? `(${activeHub.hubName})` : ''}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {translate('setting.tab.general.mapping_subtitle')}
          </p>
        </div>
        <div className="w-full sm:w-64 shrink-0">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder={translate('common.search')}
            size="md"
            width="w-full"
            tooltip={`${translate('common.license_number') || 'Plat'}, ${translate('common.vehicle_type') || 'Tipe'}`}
          />
        </div>
      </div>

      <CustomTable
        data={filteredMappings}
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
