'use client';

import ConfirmModal from '@/components/modal/ConfirmModal';
import { createVehicleType, deleteVehicleType, updateVehicleType } from '@/lib/api';
import { toastError, toastSuccess } from '@/lib/toastHelper';
import { useEffect, useRef, useState } from 'react';
import BranchAcronymManager from '../components/BranchAcronymManager';

export default function GeneralTab({ vehicleTypes, hubs, onRefresh, isReadOnly, translate }) {
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
      <ConfirmModal
        isOpen={deleteConfig.isOpen}
        onCancel={() => setDeleteConfig({ isOpen: false, id: null })}
        onConfirm={confirmDeleteType}
        title={translate('setting.tab.general.confirm_title')}
        message={translate('setting.tab.general.confirm_message')}
      />

      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex flex-col w-full">
        <h2 className="text-lg font-bold text-slate-800 mb-4 border-b border-gray-100 pb-3">
          {translate('setting.tab.general.standart_title')}
        </h2>

        {!isReadOnly && (
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={newTypeName}
              onChange={(e) => setNewTypeName(e.target.value.toUpperCase())}
              placeholder={translate('setting.tab.general.add_placeholder')}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 text-sm"
              onKeyDown={(e) => e.key === 'Enter' && handleAddVehicleType()}
            />
            <button
              onClick={handleAddVehicleType}
              disabled={!newTypeName.trim()}
              className="bg-sky-600 text-white px-3 py-2 rounded-md hover:bg-sky-700 font-medium text-sm disabled:bg-gray-400 cursor-pointer shrink-0 mr-1"
            >
              {translate('setting.tab.general.btn_add')}
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
                className="flex items-center justify-between p-3 border border-gray-200 rounded-md bg-slate-50 hover:bg-white transition-colors group gap-2 overflow-hidden shrink-0"
              >
                {editTypeId === type.id ? (
                  <input
                    type="text"
                    value={editTypeName}
                    onChange={(e) => setEditTypeName(e.target.value.toUpperCase())}
                    className="flex-1 min-w-0 px-2 py-1 border border-sky-400 rounded outline-none text-sm font-medium mr-1"
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleUpdateVehicleType(type.id)}
                  />
                ) : (
                  <span
                    className="font-semibold text-slate-700 text-sm truncate flex-1 mr-2"
                    title={type.name}
                  >
                    {type.name}
                  </span>
                )}

                {!isReadOnly && (
                  <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                    {editTypeId === type.id ? (
                      <button
                        onClick={() => handleUpdateVehicleType(type.id)}
                        className="text-xs bg-green-100 text-green-700 hover:bg-green-200 font-bold px-2 py-1 rounded cursor-pointer"
                      >
                        {translate('setting.tab.general.btn_save')}
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            setEditTypeId(type.id);
                            setEditTypeName(type.name);
                          }}
                          className="text-xs bg-sky-100 text-sky-700 hover:bg-sky-200 font-bold px-3 py-1.5 rounded cursor-pointer whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          {translate('setting.tab.general.btn_edit')}
                        </button>
                        <button
                          onClick={() => handleDeleteClick(type.id)}
                          className="text-xs bg-red-100 text-red-700 hover:bg-red-200 font-bold px-3 py-1.5 rounded cursor-pointer whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          {translate('setting.tab.general.btn_delete')}
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <BranchAcronymManager
        hubs={hubs}
        onRefresh={onRefresh}
        isReadOnly={isReadOnly}
        translate={translate}
      />
    </div>
  );
}
