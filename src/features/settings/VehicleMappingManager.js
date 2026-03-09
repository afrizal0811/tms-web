'use client';

import { deleteVehicleMapping, getVehicleMappings, updateVehicleMapping } from '@/lib/api';
import { toastError, toastInfo } from '@/lib/toastHelper';
import { useCallback, useEffect, useState } from 'react';

export default function VehicleMappingManager({ hubsList, vehicleTypes }) {
  const [selectedHub, setSelectedHub] = useState('');
  const [mappings, setMappings] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingPlat, setEditingPlat] = useState(null);
  const [editType, setEditType] = useState('');

  useEffect(() => {
    if (hubsList && hubsList.length > 0 && !selectedHub) {
      setSelectedHub(hubsList[0]._id || hubsList[0].id);
    }
  }, [hubsList, selectedHub]);

  // Bungkus dengan useCallback agar referensi fungsinya tidak berubah-ubah setiap render
  const loadMappings = useCallback(async () => {
    if (!selectedHub) return;
    setIsLoading(true);
    try {
      const data = await getVehicleMappings(selectedHub);
      setMappings(data);
    } catch (error) {
      toastError(error.message);
    } finally {
      setIsLoading(false);
    }
  }, [selectedHub]);

  useEffect(() => {
    if (selectedHub) {
      loadMappings();
    }
  }, [selectedHub, loadMappings]);

  const handleEdit = (plat, currentType) => {
    setEditingPlat(plat);
    setEditType(currentType);
  };

  const handleSaveEdit = async () => {
    if (!editType) return;
    try {
      await updateVehicleMapping(editingPlat, editType);
      toastInfo(`Tipe kendaraan plat ${editingPlat} berhasil diubah!`);
      setEditingPlat(null);
      loadMappings();
    } catch (error) {
      toastError(error.message);
    }
  };

  const handleDelete = async (plat) => {
    if (
      window.confirm(
        `Hapus pemetaan untuk plat ${plat}?\nKendaraan ini akan kembali meminta mapping saat digunakan.`
      )
    ) {
      try {
        await deleteVehicleMapping(plat);
        toastInfo(`Pemetaan plat ${plat} dihapus!`);
        loadMappings();
      } catch (error) {
        toastError(error.message);
      }
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm mt-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 border-b border-gray-100 pb-3 gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Pemetaan Tipe Kendaraan</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Kelola tipe kendaraan yang sudah disesuaikan secara manual
          </p>
        </div>
        <select
          value={selectedHub}
          onChange={(e) => setSelectedHub(e.target.value)}
          className="px-3 py-2 bg-slate-50 border border-gray-300 rounded-md outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 text-sm font-medium cursor-pointer"
        >
          <option value="" disabled>
            Pilih Cabang
          </option>
          {hubsList.map((hub) => (
            <option key={hub._id || hub.id} value={hub._id || hub.id}>
              {hub.name}
            </option>
          ))}
        </select>
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
                      <button
                        onClick={() => handleDelete(item.plat)}
                        className="text-xs text-red-500 hover:text-red-700 font-bold px-2 py-1 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        Hapus
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
