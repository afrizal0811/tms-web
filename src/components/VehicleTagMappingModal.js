'use client';
import { TAG_MAP_KEY, VEHICLE_TYPES } from '@/lib/constants';
import { useState } from 'react';

export default function VehicleTagMappingModal({ unmappedData, onCompleted }) {
  const [mappings, setMappings] = useState({});

  const handleSave = () => {
    // 1. Load Map Lama
    let currentMap = {};
    try {
      const stored = localStorage.getItem(TAG_MAP_KEY);
      if (stored) currentMap = JSON.parse(stored);
    } catch (e) {}

    // 2. Update Map dengan Input User
    unmappedData.forEach((item) => {
      const { hubId, plat, tag } = item;
      const selectedType = mappings[`${plat}-${tag}`];

      if (selectedType) {
        if (!currentMap[hubId]) currentMap[hubId] = {};
        if (!currentMap[hubId][plat]) currentMap[hubId][plat] = {};

        // Simpan mapping: Key asli -> Value standar
        currentMap[hubId][plat][tag] = selectedType;
      }
    });

    // 3. Simpan ke Local Storage
    localStorage.setItem(TAG_MAP_KEY, JSON.stringify(currentMap));

    // 4. Lanjut ke Dashboard
    onCompleted();
  };

  // Cek apakah semua item sudah dipilih
  const isAllSelected = unmappedData.every((item) => mappings[`${item.plat}-${item.tag}`]);

  return (
    <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-orange-600 px-6 py-4">
          <h2 className="text-xl font-bold text-white">⚠️ PERINGATAN!</h2>
          <p className="text-orange-100 text-sm mt-1">
            Beberapa kendaraan punya tipe yang tidak sesuai standar sistem. Harap perbaiki dulu
            sebelum lanjut.
          </p>
        </div>

        {/* Body (Scrollable) */}
        <div className="p-6 overflow-y-auto flex-1">
          {unmappedData.map((info, idx) => (
            <div
              key={idx}
              className="p-4 border border-gray-200 rounded-lg mb-4 bg-gray-50 shadow-sm"
            >
              {/* <-- RESPONSIVE: stack on mobile, inline on sm+ --> */}
              <div className="flex flex-col sm:flex-row justify-between items-start mb-4">
                <div>
                  <p className="text-sm text-gray-500 text-left">Plat Nomor</p>
                  <p className="font-bold text-lg text-slate-800">{info.plat}</p>
                </div>

                {/* On mobile: mt & left-align; on sm+: no mt & right-align */}
                <div className="mt-3 sm:mt-0 text-left sm:text-right w-full sm:w-auto">
                  <p className="text-sm text-gray-500">Tag Terdeteksi</p>
                  <code className="bg-gray-200 px-2 py-1 rounded text-sm font-mono text-red-600 inline-block wrap-break-words max-w-full">
                    {info.fullTag}
                  </code>
                </div>
              </div>

              <div className="mt-2">
                <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide text-left">
                  Pilih Tipe Standar:
                </p>
                <div className="flex flex-wrap gap-2">
                  {VEHICLE_TYPES.map((type) => (
                    <label
                      key={type}
                      className={`
                        cursor-pointer px-3 py-1.5 rounded-md text-sm border transition-all
                        ${
                          mappings[`${info.plat}-${info.tag}`] === type
                            ? 'bg-sky-600 text-white border-sky-600 shadow-md transform scale-105'
                            : 'bg-white text-gray-600 border-gray-300 hover:border-sky-400 hover:bg-sky-50'
                        }
                      `}
                    >
                      <input
                        type="radio"
                        name={`map-${info.plat}-${info.tag}`}
                        value={type}
                        className="hidden"
                        onChange={() =>
                          setMappings((prev) => ({ ...prev, [`${info.plat}-${info.tag}`]: type }))
                        }
                      />
                      {type}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="bg-gray-100 px-6 py-4 border-t flex justify-end">
          <button
            onClick={handleSave}
            disabled={!isAllSelected}
            className="px-6 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-lg disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors w-full sm:w-auto hover:cursor-pointer"
          >
            Simpan
          </button>
        </div>
      </div>
    </div>
  );
}
