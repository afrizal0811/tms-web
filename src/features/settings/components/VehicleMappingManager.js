'use client';

import ConfirmModal from '@/components/ConfirmModal';
import { deleteVehicleMapping, getVehicleMappings, updateVehicleMapping } from '@/lib/api';
import { getLocalStorage } from '@/lib/localStorageHandler';
import { toastError, toastSuccess } from '@/lib/toastHelper';
import { useCallback, useEffect, useRef, useState } from 'react';

export default function VehicleMappingManager({ vehicleTypes, isReadOnly, translate }) {
  const [activeHubId, setActiveHubId] = useState('');
  const [activeHubName, setActiveHubName] = useState('');
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
    setActiveHubName(hubName || 'Cabang Aktif');
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
    setEditingPlat(plat); // <--- Memastikan plat masuk ke state saat edit diklik
    setEditType(currentType);
  };

  const handleSaveEdit = async () => {
    if (!editType || isReadOnly) return;
    setIsLoading(true);
    try {
      // Panggil langsung dari file API
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
      // Panggil langsung dari file API
      await deleteVehicleMapping(targetId, targetPlat);

      toastSuccess(translate('common.toast.success'));
      await loadMappings();
    } catch (error) {
      setIsLoading(false);
      toastError(translate('common.toast.error', { err: error.message }));
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm relative flex flex-col min-h-0">
      <ConfirmModal
        isOpen={deleteConfig.isOpen}
        onCancel={() => setDeleteConfig({ isOpen: false, id: null, plat: null })}
        onConfirm={confirmDelete}
        title={translate('setting.tab.master_data.confirm_title')}
        message={translate('setting.tab.master_data.confirm_message')}
        confirmText={translate('setting.tab.master_data.btn_delete')}
        cancelText={translate('setting.tab.master_data.btn_cancel')}
      />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 border-b border-gray-100 pb-3 gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-800">
            {translate('setting.tab.master_data.mapping_title')}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {translate('setting.tab.master_data.mapping_subtitle')}
          </p>
        </div>
      </div>

      <div className="min-h-0 overflow-y-auto pr-1 max-h-[60vh]">
        {isLoading ? (
          <div className="py-8 flex justify-center">
            <span className="animate-spin h-6 w-6 border-4 border-slate-300 border-t-sky-600 rounded-full"></span>
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
                  className="flex flex-col p-3 border border-gray-200 rounded-lg bg-slate-50 hover:bg-white transition-colors shadow-sm group"
                >
                  <div className="font-bold text-slate-800 truncate mb-2" title={item.plat}>
                    {item.plat}
                  </div>

                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <select
                        value={editType}
                        onChange={(e) => setEditType(e.target.value)}
                        className="flex-1 px-2 py-1.5 text-sm border border-sky-400 rounded outline-none cursor-pointer bg-white"
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
                        {translate('setting.tab.master_data.btn_save')}
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div
                        className="flex-1 text-sm text-sky-700 font-medium truncate"
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
                            {translate('setting.tab.master_data.btn_edit')}
                          </button>
                          <button
                            onClick={() => handleDeleteClick(item.id, item.plat)}
                            className="text-xs bg-red-100 text-red-700 hover:bg-red-200 font-bold px-3 py-1.5 rounded cursor-pointer transition-colors whitespace-nowrap"
                          >
                            {translate('setting.tab.master_data.btn_delete')}
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
    </div>
  );
}
