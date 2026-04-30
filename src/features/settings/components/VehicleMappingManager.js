'use client';

import ConfirmModal from '@/components/modal/ConfirmModal';
import { deleteVehicleMapping, getVehicleMappings, updateVehicleMapping } from '@/lib/api';
import { getLocalStorage } from '@/lib/localStorageHandler';
import { toastError, toastSuccess } from '@/lib/toastHelper';
import { useCallback, useEffect, useRef, useState } from 'react';
import Card from './Card';
import Spinner from '@/components/Spinner';

export default function VehicleMappingManager({ vehicleTypes, isReadOnly, translate }) {
  const [activeHubId, setActiveHubId] = useState('');
  const [mappings, setMappings] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingPlat, setEditingPlat] = useState('');
  const [editType, setEditType] = useState('');
  const [deleteConfig, setDeleteConfig] = useState({ isOpen: false, id: null, plat: null });

  const editRef = useRef(null);

  useEffect(() => {
    const { storedUser, storedLocation, storedLocationName } = getLocalStorage();
    let hubId = storedLocation;
    let hubName = storedLocationName;

    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        if (parsed.activeHubId) hubId = parsed.activeHubId;
        if (parsed.activeHubName) hubName = parsed.activeHubName;
      } catch (e) {}
    }

    setActiveHubId(hubId || '');
  }, []);

  const loadMappings = useCallback(async () => {
    if (!activeHubId) return;
    setIsLoading(true);
    try {
      const data = await getVehicleMappings(activeHubId);
      const sortedData = data.sort((a, b) => a.plat.localeCompare(b.plat));
      setMappings(sortedData);
    } catch (error) {
      toastError(
        translate ? translate('common.toast.error', { err: error.message }) : error.message
      );
    } finally {
      setIsLoading(false);
    }
  }, [activeHubId, translate]);

  useEffect(() => {
    if (activeHubId) {
      loadMappings();
    }
  }, [activeHubId, loadMappings]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        event.target.closest('[role="dialog"]') ||
        event.target.closest('.swal2-container') ||
        event.target.closest('.toast')
      ) {
        return;
      }

      if (editRef.current && !editRef.current.contains(event.target)) {
        setEditingId(null);
        setEditingPlat('');
        setEditType('');
      }
    };

    if (editingId || editingPlat) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [editingId, editingPlat]);

  const handleEdit = (id, plat, currentType) => {
    setEditingId(id);
    setEditingPlat(plat);
    setEditType(currentType);
  };

  const handleSaveEdit = async () => {
    if (!editType || isReadOnly) return;
    setIsLoading(true);
    try {
      await updateVehicleMapping(editingId, editingPlat, editType);

      toastSuccess(translate('common.toast.success'));
      setEditingId(null);
      setEditingPlat('');
      await loadMappings();
    } catch (error) {
      setIsLoading(false);
      toastError(translate('common.toast.error', { err: error.message }));
    }
  };

  const handleDeleteClick = (id, plat) => {
    if (isReadOnly) return;
    setDeleteConfig({ isOpen: true, id, plat });
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
  const confirmModalText = translate('setting.tab.master_data.mapping_title');
  return (
    <Card className="h-full">
      <ConfirmModal
        isOpen={deleteConfig.isOpen}
        onCancel={() => setDeleteConfig({ isOpen: false, id: null, plat: null })}
        onConfirm={confirmDelete}
        title={translate('setting.tab.modal.confirm_title', { text: confirmModalText })}
        message={translate('setting.tab.modal.confirm_message', {
          text: confirmModalText.toLowerCase(),
        })}
      />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 border-b border-gray-100 pb-3 gap-3 shrink-0">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-slate-200">
            {translate('setting.tab.master_data.mapping_title')}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {translate('setting.tab.master_data.mapping_subtitle')}
          </p>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto pr-2">
        {isLoading ? (
          <div className="py-8 flex justify-center items-center h-full">
            <Spinner />
          </div>
        ) : mappings.length === 0 ? (
          <p className="text-center text-slate-500 text-sm py-4 italic">
            {translate('common.no_data')}
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 content-start items-start">
            {mappings.map((item) => {
              const isEditing = editingId === item.id || editingPlat === item.plat;
              return (
                <div
                  key={item.id || item.plat}
                  ref={isEditing ? editRef : null}
                  className="flex flex-col p-3 border bg-slate-50 border-gray-200 dark:bg-slate-800 rounded-lg dark:border-slate-700 shadow-md dark:shadow-slate-700/40 hover:bg-gray-100 dark:hover:bg-slate-700/10 transition-colors group"
                >
                  <div
                    className="font-bold text-slate-700 dark:text-slate-200 truncate mb-2"
                    title={item.plat}
                  >
                    {item.plat}
                  </div>

                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <select
                        value={editType}
                        onChange={(e) => setEditType(e.target.value)}
                        className="flex-1 px-2 py-1.5 text-sm border border-sky-400 rounded outline-none cursor-pointer bg-white dark:bg-slate-700"
                      >
                        <option value="" disabled>
                          {translate('setting.tab.master_data.dropdown_title')}
                        </option>
                        {vehicleTypes.map((v) => (
                          <option key={v.id} value={v.name}>
                            {v.name}
                          </option>
                        ))}
                      </select>

                      <button
                        onClick={handleSaveEdit}
                        disabled={editType === item.mappedType || isLoading}
                        className="text-xs bg-green-100 text-green-700 hover:bg-green-200 font-bold px-3 py-1.5 rounded cursor-pointer disabled:opacity-60 disabled:bg-slate-200 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                      >
                        {translate('common.button.btn_save')}
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div
                        className="flex-1 text-sm text-sky-700 dark:text-sky-400 font-medium truncate"
                        title={item.mappedType}
                      >
                        {item.mappedType}
                      </div>

                      {!isReadOnly && (
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleEdit(item.id, item.plat, item.mappedType)}
                            className="text-xs bg-sky-100 text-sky-700 hover:bg-sky-200 font-bold px-3 py-1.5 rounded cursor-pointer transition-colors whitespace-nowrap"
                          >
                            {translate('setting.tab.button.btn_edit')}
                          </button>
                          <button
                            onClick={() => handleDeleteClick(item.id, item.plat)}
                            className="text-xs bg-red-100 text-red-700 hover:bg-red-200 font-bold px-3 py-1.5 rounded cursor-pointer transition-colors whitespace-nowrap"
                          >
                            {translate('common.button.btn_delete')}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
}
