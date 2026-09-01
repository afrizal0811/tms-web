'use client';

import ConfirmModal from '@/components/modal/ConfirmModal';
import { createVehicleType, deleteVehicleType, updateVehicleType } from '@/lib/api';
import { toastError, toastSuccess } from '@/lib/toast';
import { useState } from 'react';
import Card from './Card';
import Table from './Table';

export default function StandardType({ vehicleTypes, onRefresh, isReadOnly, translate }) {
  const [newTypeName, setNewTypeName] = useState('');
  const [deleteConfig, setDeleteConfig] = useState({ isOpen: false, id: null, name: null });

  const handleAddVehicleType = async () => {
    if (!newTypeName.trim() || isReadOnly) return;
    try {
      await createVehicleType(newTypeName);
      setNewTypeName('');
      toastSuccess(translate('common.toast.success'));
      await onRefresh();
    } catch (err) {
      toastError(translate('common.toast.error', { err: err.message }));
    }
  };

  const handleUpdateVehicleType = async (id, editValues) => {
    if (!editValues.name.trim() || isReadOnly) return;
    try {
      await updateVehicleType(id, editValues.name);
      toastSuccess(translate('common.toast.success'));
      await onRefresh();
    } catch (err) {
      toastError(translate('common.toast.error', { err: err.message }));
      throw err;
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
    } catch (err) {
      toastError(translate('common.toast.error', { err: err.message }));
    }
  };

  const columns = [
    {
      header: translate('common.vehicle_type') || 'Tipe Kendaraan',
      field: 'name',
      render: (item) => (
        <span className="font-semibold text-slate-700 dark:text-slate-200 text-[10px] md:text-sm">
          {item.name}
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
  ];

  const title = translate('setting.tab.general.standard_title');
  const msgParts = translate('common.modal.confirm_message', { text: '|||' }).split('|||');

  return (
    <Card>
      <ConfirmModal
        isOpen={deleteConfig.isOpen}
        onCancel={() => setDeleteConfig({ isOpen: false, id: null, name: null })}
        onConfirm={confirmDeleteType}
        title={translate('common.modal.confirm_title', { text: title })}
        message={
          <span>
            {msgParts[0]}
            <strong>{deleteConfig.name}</strong>
            {msgParts[1]}
          </span>
        }
      />

      <div className="mb-4 border-b border-gray-100 pb-3">
        <h2 className="text-lg font-bold text-gray-900 dark:text-slate-200">
          {translate('setting.tab.general.standard_title')}
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          {translate('setting.tab.general.standard_subtitle')}
        </p>
      </div>

      {!isReadOnly && (
        <div className="flex gap-1.5 sm:gap-2 mb-4 w-full">
          <input
            type="text"
            value={newTypeName}
            onChange={(e) => setNewTypeName(e.target.value.toUpperCase())}
            placeholder={translate('setting.tab.general.add_placeholder')}
            className="flex-1 min-w-0 px-2 sm:px-3 py-2 text-[10px] sm:text-sm text-slate-900 dark:text-slate-100 border border-gray-300 dark:border-slate-700 rounded-md outline-none focus:border-sky-500 dark:focus:border-slate-500 focus:ring-1 focus:ring-sky-500 dark:focus:ring-slate-500"
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
      )}

      <Table
        data={vehicleTypes}
        columns={columns}
        isReadOnly={isReadOnly}
        emptyMessage={translate('common.no_data')}
        translate={translate}
        onSave={handleUpdateVehicleType}
        onDelete={(item) => setDeleteConfig({ isOpen: true, id: item.id, name: item.name })}
      />
    </Card>
  );
}
