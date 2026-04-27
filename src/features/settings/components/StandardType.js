'use client';

import ConfirmModal from '@/components/modal/ConfirmModal';
import { createVehicleType, deleteVehicleType, updateVehicleType } from '@/lib/api';
import { toastError, toastSuccess } from '@/lib/toastHelper';
import { useEffect, useRef, useState } from 'react';
import Card from './Card';

export default function StandardType({ vehicleTypes, onRefresh, isReadOnly, translate }) {
  const [newTypeName, setNewTypeName] = useState('');
  const [editTypeId, setEditTypeId] = useState(null);
  const [editTypeName, setEditTypeName] = useState('');
  const [deleteConfig, setDeleteConfig] = useState({ isOpen: false, id: null });

  const editRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        event.target.closest('[role="dialog"]') ||
        event.target.closest('.swal2-container') ||
        event.target.closest('.toast')
      )
        return;
      if (editRef.current && !editRef.current.contains(event.target)) {
        setEditTypeId(null);
        setEditTypeName('');
      }
    };
    if (editTypeId) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [editTypeId]);

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

  const handleUpdateVehicleType = async (id) => {
    if (!editTypeName.trim() || isReadOnly) return;
    try {
      await updateVehicleType(id, editTypeName);
      setEditTypeId(null);
      setEditTypeName('');
      toastSuccess(translate('common.toast.success'));
      await onRefresh();
    } catch (err) {
      toastError(translate('common.toast.error', { err: err.message }));
    }
  };

  const handleDeleteClick = (id) => {
    if (isReadOnly) return;
    setDeleteConfig({ isOpen: true, id });
  };

  const confirmDeleteType = async () => {
    const targetId = deleteConfig.id;
    setDeleteConfig({ isOpen: false, id: null });
    if (!targetId) return;
    try {
      await deleteVehicleType(targetId);
      toastSuccess(translate('common.toast.success'));
      await onRefresh();
    } catch (err) {
      toastError(translate('common.toast.error', { err: err.message }));
    }
  };
  const confirmModalText = translate('setting.tab.general.standard_title');
  const isUnchanged = (old) => (editTypeName ?? '').trim() === (old ?? '').trim();

  return (
    <Card>
      <ConfirmModal
        isOpen={deleteConfig.isOpen}
        onCancel={() => setDeleteConfig({ isOpen: false, id: null })}
        onConfirm={confirmDeleteType}
        title={translate('setting.tab.modal.confirm_title', { text: confirmModalText })}
        message={translate('setting.tab.modal.confirm_message', {
          text: confirmModalText.toLowerCase(),
        })}
      />

      <div className=" mb-4 border-b border-gray-100 pb-3">
        <h2 className="text-lg font-bold text-gray-900 dark:text-slate-200">
          {translate('setting.tab.general.standard_title')}
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          {translate('setting.tab.general.standard_subtitle')}
        </p>
      </div>

      {!isReadOnly && (
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={newTypeName}
            onChange={(e) => setNewTypeName(e.target.value.toUpperCase())}
            placeholder={translate('setting.tab.general.add_placeholder')}
            className="flex-1 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 border border-gray-300 dark:border-slate-700 rounded-md outline-none focus:border-sky-500 dark:focus:border-slate-500 focus:ring-1 focus:ring-sky-500 dark:focus:ring-slate-500"
          />
          <button
            onClick={handleAddVehicleType}
            disabled={!newTypeName.trim()}
            className="shrink-0 mr-1 px-3 py-2 text-sm font-medium text-white bg-sky-600 rounded-md hover:bg-sky-700 disabled:bg-gray-400 cursor-pointer"
          >
            {translate('setting.tab.button.btn_add')}
          </button>
        </div>
      )}

      <div className="flex flex-col gap-2 overflow-y-auto pr-1 max-h-72">
        {vehicleTypes.length === 0 ? (
          <p className="text-center text-slate-500 text-sm py-4 italic">
            {translate('common.no_data')}
          </p>
        ) : (
          vehicleTypes.map((type) => (
            <div
              key={type.id}
              ref={editTypeId === type.id ? editRef : null}
              className="flex items-center justify-between gap-2 p-3 bg-slate-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-md dark:shadow-slate-700/40 hover:bg-gray-100 dark:hover:bg-slate-700/10 transition-colors overflow-hidden shrink-0 group"
            >
              {editTypeId === type.id ? (
                <input
                  type="text"
                  value={editTypeName}
                  onChange={(e) => setEditTypeName(e.target.value.toUpperCase())}
                  className="flex-1 min-w-0 px-2 py-1 bg-slate-50 dark:bg-slate-700 text-sm font-medium text-slate-900 dark:text-slate-100 border border-slate-400 dark:border-slate-600 rounded outline-none mr-1"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleUpdateVehicleType(type.id)}
                />
              ) : (
                <span className="font-semibold text-slate-700 dark:text-slate-200 text-sm truncate flex-1 mr-2">
                  {type.name}
                </span>
              )}

              {!isReadOnly && (
                <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                  {editTypeId === type.id ? (
                    <button
                      onClick={() => handleUpdateVehicleType(type.id)}
                      disabled={isUnchanged(type.name)}
                      className="text-xs font-bold px-2 py-1 bg-green-100 text-green-700 rounded whitespace-nowrap hover:bg-green-200 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed cursor-pointer transition-colors"
                    >
                      {translate('setting.tab.button.btn_save')}
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          setEditTypeId(type.id);
                          setEditTypeName(type.name);
                        }}
                        className="text-xs font-bold px-3 py-1.5 bg-sky-100 text-sky-700 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 hover:bg-sky-200 cursor-pointer transition-opacity"
                      >
                        {translate('setting.tab.button.btn_edit')}
                      </button>
                      <button
                        onClick={() => handleDeleteClick(type.id)}
                        className="text-xs font-bold px-3 py-1.5 bg-red-100 text-red-700 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 hover:bg-red-200 cursor-pointer transition-opacity"
                      >
                        {translate('setting.tab.button.btn_delete')}
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
