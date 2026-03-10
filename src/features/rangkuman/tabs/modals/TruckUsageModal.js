import BaseModal from '@/components/BaseModal';
import ConfirmModal from '@/components/ConfirmModal';
import { toastError, toastSuccess } from '@/lib/toastHelper';
import { formatLongDate } from '@/lib/utils';
import { useEffect, useState } from 'react';

export default function TruckUsageModal({ isOpen, onClose, data, hubId, onSuccess }) {
  const [count, setCount] = useState('');
  const [desc, setDesc] = useState('');

  // Melacak data awal untuk mendeteksi apakah ada perubahan
  const [initialCount, setInitialCount] = useState('');
  const [initialDesc, setInitialDesc] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  useEffect(() => {
    if (data) {
      const initC = data.manualCount > 0 ? String(data.manualCount) : '';
      const initD = data.description || '';

      setCount(initC);
      setInitialCount(initC);
      setDesc(initD);
      setInitialDesc(initD);
    }
  }, [data]);

  const totalInput = (parseInt(count) || 0) + (data?.tmsCount || 0);
  const isOverLimit = data?.masterTotal > 0 && totalInput > data.masterTotal;

  // Cek apakah ada perubahan data
  const isChanged = count !== initialCount || desc !== initialDesc;
  // Tombol simpan hanya aktif jika bukan loading, angka terisi, teks tidak kosong, DAN data berubah
  const isSaveDisabled = isLoading || count === '' || !desc.trim() || !isChanged;

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/truck-usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hubId,
          date: data.date,
          storageType: data.storage,
          vehicleType: data.type,
          count: count || 0,
          description: desc,
        }),
      });

      if (!res.ok) throw new Error('Gagal menyimpan data');
      const resData = await res.json();

      toastSuccess('Data penggunaan manual berhasil disimpan');
      onSuccess(resData);
      onClose();
    } catch (e) {
      toastError(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!data?.id) return;
    setIsConfirmOpen(false);
    setIsLoading(true);
    try {
      const res = await fetch(`/api/truck-usage?id=${data.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Gagal menghapus data');

      toastSuccess('Data penggunaan manual dihapus');
      onSuccess({ id: data.id, isDelete: true });
      onClose();
    } catch (e) {
      toastError(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!data) return null;

  return (
    <>
      <ConfirmModal
        isOpen={isConfirmOpen}
        onCancel={() => setIsConfirmOpen(false)}
        onConfirm={handleDelete}
        title="Hapus Data Manual"
        message="Anda yakin ingin menghapus data manual ini?"
        confirmText="Hapus"
      />

      <BaseModal
        isOpen={isOpen && !isConfirmOpen}
        onClose={onClose}
        maxWidth="max-w-md"
        title={
          <div className="flex flex-col gap-0.5">
            <span>
              {data.storage} - {data.type}
            </span>
            <span className="text-sm font-normal opacity-70">
              {formatLongDate(data.date, 'id-ID')}
            </span>
          </div>
        }
        footer={
          <div className="flex justify-between items-center w-full">
            <div>
              {data.id && (
                <button
                  disabled={isLoading}
                  onClick={() => setIsConfirmOpen(true)}
                  className="px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 font-medium text-sm transition-colors cursor-pointer"
                >
                  Hapus Data
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <button
                disabled={isLoading}
                onClick={onClose}
                className="px-4 py-2 bg-slate-200 text-slate-700 rounded-md hover:bg-slate-300 font-medium text-sm cursor-pointer"
              >
                Batal
              </button>
              <button
                disabled={isSaveDisabled}
                onClick={handleSave}
                className="px-4 py-2 bg-sky-600 text-white rounded-md hover:bg-sky-700 font-medium text-sm min-w-[90px] disabled:bg-slate-300 disabled:cursor-not-allowed cursor-pointer"
              >
                {isLoading ? 'Wait...' : 'Simpan'}
              </button>
            </div>
          </div>
        }
      >
        <div className="flex flex-col gap-4 pt-2 pb-2 relative">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Jumlah Kendaraan <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="0"
              value={count}
              onChange={(e) => setCount(e.target.value)}
              placeholder="Masukkan angka..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>

          {isOverLimit && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-md text-xs font-medium">
              ⚠️ Total kendaraan melebihin total kendaraan yang tersedia
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Keterangan <span className="text-red-500">*</span>
            </label>
            <textarea
              rows="3"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Jelaskan alasan penggunaan manual..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-sky-500 resize-none"
            ></textarea>
          </div>
        </div>
      </BaseModal>
    </>
  );
}
