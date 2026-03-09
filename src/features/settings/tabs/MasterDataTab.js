'use client';

import ConfirmModal from '@/components/ConfirmModal';
import { createVehicleType, deleteVehicleType, updateVehicleType } from '@/lib/api';
import { toastError, toastInfo } from '@/lib/toastHelper';
import { useState } from 'react';
import VehicleMappingManager from '../components/VehicleMappingManager';

export default function MasterDataTab({ vehicleTypes, onRefresh, isReadOnly }) {
  const [newTypeName, setNewTypeName] = useState('');
  const [editTypeId, setEditTypeId] = useState(null);
  const [editTypeName, setEditTypeName] = useState('');

  // State untuk Confirm Modal
  const [deleteConfig, setDeleteConfig] = useState({ isOpen: false, id: null });

  const handleAddVehicleType = async () => {
    if (!newTypeName.trim() || isReadOnly) return;
    try {
      await createVehicleType(newTypeName);
      setNewTypeName('');
      toastInfo('✅ Tipe kendaraan ditambahkan!');
      await onRefresh();
    } catch (err) {
      toastError(err.message);
    }
  };

  const handleUpdateVehicleType = async (id) => {
    if (!editTypeName.trim() || isReadOnly) return;
    try {
      await updateVehicleType(id, editTypeName);
      setEditTypeId(null);
      setEditTypeName('');
      toastInfo('✅ Tipe kendaraan diubah!');
      await onRefresh();
    } catch (err) {
      toastError(err.message);
    }
  };

  // Buka modal pengesahan
  const handleDeleteClick = (id) => {
    if (isReadOnly) return;
    setDeleteConfig({ isOpen: true, id });
  };

  // Laksanakan pemadaman selepas disahkan
  const confirmDeleteType = async () => {
    const targetId = deleteConfig.id;
    setDeleteConfig({ isOpen: false, id: null });

    if (!targetId) return;

    try {
      await deleteVehicleType(targetId);
      toastInfo('🗑️ Tipe kendaraan dihapus!');
      await onRefresh();
    } catch (err) {
      toastError(err.message);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start relative">
      {/* Panggil ConfirmModal */}
      <ConfirmModal
        isOpen={deleteConfig.isOpen}
        onCancel={() => setDeleteConfig({ isOpen: false, id: null })}
        onConfirm={confirmDeleteType}
        title="Hapus Tipe Kendaraan"
        message="Yakin menghapus tipe kendaraan ini? Data tidak dapat dikembalikan."
        confirmText="Hapus"
        cancelText="Batal"
      />

      <div className="lg:col-span-2">
        <div className="-mt-8">
          <VehicleMappingManager vehicleTypes={vehicleTypes} isReadOnly={isReadOnly} />
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm sticky top-24">
        <h2 className="text-lg font-bold text-slate-800 mb-4 border-b border-gray-100 pb-3">
          Tipe Kendaraan
        </h2>

        {!isReadOnly && (
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={newTypeName}
              onChange={(e) => setNewTypeName(e.target.value.toUpperCase())}
              placeholder="Tambah tipe baru..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 text-sm"
              onKeyDown={(e) => e.key === 'Enter' && handleAddVehicleType()}
            />
            <button
              onClick={handleAddVehicleType}
              disabled={!newTypeName.trim()}
              className="bg-sky-600 text-white px-3 py-2 rounded-md hover:bg-sky-700 font-medium text-sm disabled:bg-gray-400 cursor-pointer"
            >
              Tambah
            </button>
          </div>
        )}

        <div className="flex flex-col gap-2 max-h-[500px] overflow-y-auto pr-1">
          {vehicleTypes.length === 0 ? (
            <p className="text-center text-slate-500 text-sm py-4 italic">
              Belum ada data tipe kendaraan.
            </p>
          ) : (
            vehicleTypes.map((type) => (
              <div
                key={type.id}
                className="flex items-center justify-between p-3 border border-gray-200 rounded-md bg-slate-50 hover:bg-white transition-colors group"
              >
                {editTypeId === type.id ? (
                  <input
                    type="text"
                    value={editTypeName}
                    onChange={(e) => setEditTypeName(e.target.value.toUpperCase())}
                    className="flex-1 px-2 py-1 border border-sky-400 rounded outline-none text-sm font-medium mr-2"
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleUpdateVehicleType(type.id)}
                  />
                ) : (
                  <span className="font-semibold text-slate-700 text-sm">{type.name}</span>
                )}

                {!isReadOnly && (
                  <div className="flex items-center gap-2">
                    {editTypeId === type.id ? (
                      <>
                        <button
                          onClick={() => handleUpdateVehicleType(type.id)}
                          className="text-xs text-green-600 hover:text-green-700 font-bold cursor-pointer bg-green-50 px-2 py-1 rounded"
                        >
                          Simpan
                        </button>
                        <button
                          onClick={() => {
                            setEditTypeId(null);
                            setEditTypeName('');
                          }}
                          className="text-xs text-slate-500 hover:text-slate-700 font-medium cursor-pointer bg-slate-200 px-2 py-1 rounded"
                        >
                          Batal
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            setEditTypeId(type.id);
                            setEditTypeName(type.name);
                          }}
                          className="text-xs text-sky-600 hover:text-sky-700 font-bold cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          Edit
                        </button>
                        {/* Ubah onClick di sini */}
                        <button
                          onClick={() => handleDeleteClick(type.id)}
                          className="text-xs text-red-500 hover:text-red-700 font-bold cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity ml-1"
                        >
                          Hapus
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
    </div>
  );
}
