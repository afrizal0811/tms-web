'use client';

import Accordion from '@/components/Accordion';
import HighlightText from '@/components/HighlightText';
import ConfirmModal from '@/components/modal/ConfirmModal';
import SearchBar from '@/components/SearchBar';
import { createVehicleType, deleteVehicleType, updateVehicleType } from '@/lib/api/mileapp';
import { toastError, toastSuccess } from '@/lib/toast';
import { useMemo, useState } from 'react';
import Card from './Card';
import CustomTable from './CustomTable';

export default function StandardType({ vehicleTypes, onRefresh, isReadOnly, translate }) {
  const [newTypeName, setNewTypeName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [deleteConfig, setDeleteConfig] = useState({ isOpen: false, id: null, name: null });

  const filteredVehicleTypes = useMemo(() => {
    const list = vehicleTypes || [];
    const q = searchQuery.toLowerCase().trim();
    const filtered = !q ? list : list.filter((vt) => (vt.name || '').toLowerCase().includes(q));

    return filtered.map((item, idx) => ({
      ...item,
      _index: idx + 1,
    }));
  }, [vehicleTypes, searchQuery]);

  const handleAddVehicleType = async () => {
    if (!newTypeName.trim() || isReadOnly) return;
    try {
      await createVehicleType(newTypeName);
      setNewTypeName('');
      setIsAddOpen(false);
      toastSuccess(translate('common.toast.success'));
      await onRefresh();
    } catch (e) {
      toastError(translate('common.toast.error', { err: e.message }), e);
    }
  };

  const handleUpdateVehicleType = async (id, editValues) => {
    if (!editValues.name.trim() || isReadOnly) return;
    try {
      await updateVehicleType(id, editValues.name);
      toastSuccess(translate('common.toast.success'));
      await onRefresh();
    } catch (e) {
      toastError(translate('common.toast.error', { err: e.message }), e);
      throw e;
    }
  };

  const confirmDeleteType = async () => {
    const targetId = deleteConfig.id;
    setDeleteConfig({ isOpen: false, id: null, name: null });
    if (!targetId) return;
    try {
      await deleteVehicleType(targetId);
      toastSuccess(translate('common.toast.success'));
      await onRefresh();
    } catch (e) {
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
        header: translate('common.vehicle_type') || 'Tipe Kendaraan',
        field: 'name',
        render: (item) => (
          <span className="font-semibold text-slate-700 dark:text-slate-200 text-[10px] md:text-sm">
            <HighlightText text={item.name} highlight={searchQuery} />
          </span>
        ),
        renderEdit: (value, onChange, onSave) => (
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && onSave()}
            className="w-full min-w-0 px-2 py-1 text-[10px] md:text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded outline-none uppercase"
            autoFocus
          />
        ),
      },
    ],
    [searchQuery, translate]
  );

  const title = translate('setting.tab.general.standard_title');
  const msgParts = translate('common.modal.delete_message', { text: '|||' }).split('|||');

  return (
    <Card>
      <ConfirmModal
        isOpen={deleteConfig.isOpen}
        onCancel={() => setDeleteConfig({ isOpen: false, id: null, name: null })}
        onConfirm={confirmDeleteType}
        title={translate('common.modal.delete_title', { text: title })}
        message={
          <span>
            {msgParts[0]}
            <strong>{deleteConfig.name}</strong>
            {msgParts[1]}
          </span>
        }
      />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 border-b border-gray-100 dark:border-slate-800 pb-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-slate-200">
            {translate('setting.tab.general.standard_title')}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {translate('setting.tab.general.standard_subtitle')}
          </p>
        </div>
        <div className="w-full sm:w-64 shrink-0">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder={translate('common.search')}
            size="md"
            width="w-full"
            tooltip={translate('common.vehicle_type') || 'Tipe Kendaraan'}
          />
        </div>
      </div>

      {!isReadOnly && (
        <Accordion
          isFloating
          isOpen={isAddOpen}
          onToggle={setIsAddOpen}
          title={
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-sky-100 dark:bg-sky-900/40 text-sky-600 dark:text-sky-400 font-bold text-xs">
                +
              </span>
              <span className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200">
                {translate('common.button.btn_add')} {title}
              </span>
            </div>
          }
          defaultOpen={false}
          className="mb-4"
        >
          <div className="flex gap-1.5 sm:gap-2 w-full">
            <input
              type="text"
              value={newTypeName}
              onChange={(e) => setNewTypeName(e.target.value.toUpperCase())}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newTypeName.trim()) {
                  handleAddVehicleType();
                }
              }}
              placeholder={translate('setting.tab.general.add_placeholder')}
              className="flex-1 min-w-0 px-2 sm:px-3 py-2 text-[10px] sm:text-sm text-slate-900 dark:text-slate-100 border border-gray-300 dark:border-slate-700 rounded-md outline-none focus:border-sky-500 dark:focus:border-slate-500 focus:ring-1 focus:ring-sky-500 dark:focus:ring-slate-500 bg-white dark:bg-slate-800"
            />
            <button
              onClick={handleAddVehicleType}
              disabled={!newTypeName.trim()}
              className="shrink-0 px-2.5 sm:px-3 py-2 text-[12px] sm:text-sm font-bold text-white bg-sky-600 rounded-md hover:bg-sky-700 disabled:bg-gray-400 cursor-pointer"
            >
              <span className="hidden sm:inline">{translate('common.button.btn_add')}</span>
              <span className="sm:hidden text-sm leading-none">+</span>
            </button>
          </div>
        </Accordion>
      )}

      <CustomTable
        data={filteredVehicleTypes}
        columns={columns}
        isReadOnly={isReadOnly}
        containerHeight="h-[350px]"
        emptyMessage={translate('common.no_data')}
        translate={translate}
        onSave={handleUpdateVehicleType}
        onDelete={(item) => setDeleteConfig({ isOpen: true, id: item.id, name: item.name })}
      />
    </Card>
  );
}
