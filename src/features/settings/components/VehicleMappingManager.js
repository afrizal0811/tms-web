'use client';

import ConfirmModal from '@/components/ConfirmModal';
import { deleteVehicleMapping, getVehicleMappings, updateVehicleMapping } from '@/lib/api';
import { getLocalStorage } from '@/lib/localStorageHandler';
import { toastError, toastInfo } from '@/lib/toastHelper';
import { useCallback, useEffect, useState } from 'react';

export default function VehicleMappingManager({ vehicleTypes, isReadOnly }) {
  const [activeHubId, setActiveHubId] = useState('');
  const [activeHubName, setActiveHubName] = useState('');
  const [mappings, setMappings] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingPlat, setEditingPlat] = useState(null);
  const [editType, setEditType] = useState('');

  // State untuk Confirm Modal
  const [deleteConfig, setDeleteConfig] = useState({ isOpen: false, plat: null });

  useEffect(() => {
    const { storedSession } = getLocalStorage();
    if (storedSession && storedSession.activeHubId) {
      setActiveHubId(storedSession.activeHubId);
      setActiveHubName(storedSession.activeHubName || 'Cabang Aktif');
    }
  }, []);

  const loadMappings = useCallback(async () => {
    if (!activeHubId) return;
    setIsLoading(true);
    try {
      const data = await getVehicleMappings(activeHubId);
      setMappings(data);
    } catch (error) {
      toastError(error.message);
    } finally {
      setIsLoading(false);
    }
  }, [activeHubId]);

  useEffect(() => {
    if (activeHubId) {
      loadMappings();
    }
  }, [activeHubId, loadMappings]);

  const handleEdit = (plat, currentType) => {
    setEditingPlat(plat);
    setEditType(currentType);
  };

  const handleSaveEdit = async () => {
    if (!editType || isReadOnly) return;
    try {
      await updateVehicleMapping(editingPlat, editType);
      toastInfo(`Tipe kendaraan plat ${editingPlat} berhasil diubah!`);
      setEditingPlat(null);
      loadMappings();
    } catch (error) {
      toastError(error.message);
    }
  };

  // Buka modal pengesahan
  const handleDeleteClick = (plat) => {
    if (isReadOnly) return;
    setDeleteConfig({ isOpen: true, plat });
  };

  // Laksanakan pemadaman selepas disahkan
  const confirmDelete = async () => {
    const targetPlat = deleteConfig.plat;
    setDeleteConfig({ isOpen: false, plat: null }); // Tutup modal terus

    if (!targetPlat) return;

    try {
      await deleteVehicleMapping(targetPlat);
      toastInfo(`Pemetaan plat ${targetPlat} dihapus!`);
      loadMappings();
    } catch (error) {
      toastError(error.message);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm mt-8 relative">
      {/* Panggil ConfirmModal */}
      <ConfirmModal
        isOpen={deleteConfig.isOpen}
        onCancel={() => setDeleteConfig({ isOpen: false, plat: null })}
        onConfirm={confirmDelete}
        title="Hapus Pemetaan"
        message={`Hapus pemetaan untuk plat ${deleteConfig.plat}? Kendaraan ini akan kembali meminta mapping saat digunakan.`}
        confirmText="Hapus"
        cancelText="Batal"
      />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 border-b border-gray-100 pb-3 gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Pemetaan Tipe Kendaraan</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Kelola tipe kendaraan yang sudah disesuaikan secara manual
          </p>
        </div>
        {activeHubName && (
          <div className="px-3 py-1.5 bg-sky-50 text-sky-700 border border-sky-200 rounded-md text-sm font-semibold">
            {activeHubName}
          </div>
        )}
      </div>

      <div className="max-h-[400px] overflow-y-auto pr-1">
        {isLoading ? (
          <div className="py-8 flex justify-center">
            <span className="animate-spin h-6 w-6 border-4 border-slate-300 border-t-sky-600 rounded-full"></span>
          </div>
        ) : mappings.length === 0 ? (
          <p className="text-center text-slate-500 text-sm py-4 italic">
            Tidak ada data pemetaan kendaraan di cabang ini.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {mappings.map((item) => (
              <div
                key={item.plat}
                className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-slate-50 hover:bg-white transition-colors shadow-sm group"
              >
                <div className="flex-1">
                  <div className="font-bold text-slate-800">{item.plat}</div>
                  {editingPlat === item.plat ? (
                    <select
                      value={editType}
                      onChange={(e) => setEditType(e.target.value)}
                      className="mt-1 block w-full px-2 py-1 text-sm border border-sky-400 rounded outline-none cursor-pointer"
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
                  ) : (
                    <div className="text-sm text-sky-700 font-medium mt-0.5">{item.mappedType}</div>
                  )}
                </div>

                {!isReadOnly && (
                  <div className="flex items-center gap-2 ml-4">
                    {editingPlat === item.plat ? (
                      <>
                        <button
                          onClick={handleSaveEdit}
                          className="text-xs bg-green-100 text-green-700 hover:bg-green-200 font-bold px-2.5 py-1.5 rounded cursor-pointer"
                        >
                          Simpan
                        </button>
                        <button
                          onClick={() => setEditingPlat(null)}
                          className="text-xs bg-slate-200 text-slate-600 hover:bg-slate-300 font-medium px-2.5 py-1.5 rounded cursor-pointer"
                        >
                          Batal
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handleEdit(item.plat, item.mappedType)}
                          className="text-xs text-sky-600 hover:text-sky-800 font-bold px-2 py-1 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          Edit
                        </button>
                        {/* Ubah onClick di sini */}
                        <button
                          onClick={() => handleDeleteClick(item.plat)}
                          className="text-xs text-red-500 hover:text-red-700 font-bold px-2 py-1 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          Hapus
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
