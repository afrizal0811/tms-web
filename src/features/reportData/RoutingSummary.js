'use client';

import { TAG_MAP_KEY, VEHICLE_TYPES } from '@/lib/constants';
import { calculateTargetDates } from '@/lib/utils';
import { useState } from 'react';
import * as XLSX from 'xlsx-js-style';
import { getResultsSummary } from '../../lib/apiService';
import { toastError, toastSuccess, toastWarning } from '../../lib/toastHelper';
// (PERUBAHAN 1): Impor 'helper' baru
import { generateRoutingWorkbook } from '../../lib/reportGenerators/routingReport'; // <-- Path diubah

// ... (Komponen TagMappingRow - TIDAK BERUBAH) ...
function TagMappingRow({ unmappedInfo, onMapChange }) {
  const { tag, plat, fullTag } = unmappedInfo;
  return (
    <div className="p-4 border border-gray-600 rounded-lg mb-4 text-left w-full">
      <p className="mb-3">
        Plat <strong>{plat || 'N/A'}</strong> memiliki tag yang tidak standar (
        <strong>{fullTag}</strong>).
      </p>
      <p className="mb-2 font-semibold">Petakan tag `{fullTag}` untuk plat ini:</p>
      <div className="flex flex-wrap gap-2">
        {VEHICLE_TYPES.map((type) => (
          <div key={type}>
            <input
              type="radio"
              name={`map-${plat}-${tag}`}
              id={`map-${plat}-${tag}-${type}`}
              value={type}
              onChange={(e) => onMapChange(plat, tag, e.target.value)}
              className="sr-only peer"
            />
            <label
              htmlFor={`map-${plat}-${tag}-${type}`}
              className="px-3 py-1.5 border border-gray-500 rounded-md cursor-pointer text-sm 
                         hover:bg-gray-300 peer-checked:bg-sky-600 peer-checked:border-sky-500 peer-checked:text-white"
            >
              {type}
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function RoutingSummary({
  driverData,
  isInputInvalid,
  isLoading,
  onLoadingChange,
  onMappingModeChange,
  selectedDate,
  selectedLocation,
  selectedLocationName,
}) {
  const [pendingData, setPendingData] = useState(null);
  const [unmappedTags, setUnmappedTags] = useState([]);
  const [newMappings, setNewMappings] = useState({});
  const isNewMappingNull = newMappings === null || Object.keys(newMappings).length === 0;

  // (PERUBAHAN 2): Sederhanakan 'handleSaveMappingAndProcess'
  const handleSaveMappingAndProcess = () => {
    if (onLoadingChange) onLoadingChange(true);

    // Validasi
    const allTagsMapped = unmappedTags.every(
      (item) => newMappings[item.plat] && newMappings[item.plat][item.tag]
    );
    if (!allTagsMapped) {
      toastError('Harap petakan semua tipe kendaraan.');
      if (onLoadingChange) onLoadingChange(false);
      return;
    }

    // Ambil Peta Lama & Merge
    const fullTagMap = JSON.parse(localStorage.getItem(TAG_MAP_KEY) || '{}');
    const hubTagMap = fullTagMap[selectedLocation] || {};
    const updatedHubMap = JSON.parse(JSON.stringify(hubTagMap));
    for (const [plat, tags] of Object.entries(newMappings)) {
      if (!updatedHubMap[plat]) {
        updatedHubMap[plat] = {};
      }
      updatedHubMap[plat] = { ...updatedHubMap[plat], ...tags };
    }
    const updatedFullMap = { ...fullTagMap, [selectedLocation]: updatedHubMap };
    localStorage.setItem(TAG_MAP_KEY, JSON.stringify(updatedFullMap));

    try {
      // Panggil 'helper' baru
      const { wb, excelFileName, missingTimesFound } = generateRoutingWorkbook(
        driverData,
        pendingData.results,
        updatedHubMap,
        pendingData.date, // Gunakan tanggal dari pendingData (H-1)
        selectedLocationName
      );

      if (missingTimesFound) {
        toastWarning(
          'Travel Time atau Visit Time tidak ada di API. Periksa manual di menu Routing!'
        );
      }

      // Download file
      XLSX.writeFile(wb, excelFileName);
      toastSuccess('File Routing Summary berhasil di-download!');
    } catch (err) {
      toastError(err.message);
    }

    // Reset state mapping
    setPendingData(null);
    setUnmappedTags([]);
    setNewMappings({});
    if (onLoadingChange) onLoadingChange(false);
    if (onMappingModeChange) onMappingModeChange(false);
  };

  // (PERUBAHAN 3): Sederhanakan 'handleRoutingSummary'
  const handleRoutingSummary = async () => {
    if (onLoadingChange) onLoadingChange(true);
    setUnmappedTags([]);
    setPendingData(null);
    setNewMappings({});
    if (onMappingModeChange) onMappingModeChange(false);

    try {
      // 1. Fetch data
      const hubId = selectedLocation;
      if (!hubId || !Array.isArray(driverData) || driverData.length === 0) {
        throw new Error('Data Hub atau Driver (driverData) tidak valid atau belum dimuat.');
      }
      if (selectedDate === '') throw new Error('Tanggal belum dipilih.');

      // Gunakan H-1 logic
      const { dateFrom, dateTo } = calculateTargetDates(selectedDate);
      const apiDateFrom = `${dateFrom} 00:00:00`;
      const apiDateTo = `${dateTo} 23:59:59`;

      const resultsData = await getResultsSummary({
        dateFrom: apiDateFrom,
        dateTo: apiDateTo,
        limit: 500,
        hubId: hubId,
      });

      const filteredResults = resultsData.filter((item) => item.dispatchStatus === 'done');
      if (filteredResults.length === 0) {
        toastError('Tidak ada data yang ditemukan untuk tanggal ini.');
        if (onLoadingChange) onLoadingChange(false);
        return;
      }

      // 2. Logika Validasi (Read)
      const fullTagMap = JSON.parse(localStorage.getItem(TAG_MAP_KEY) || '{}');
      const hubTagMap = fullTagMap[hubId] || {};

      const driverMap = driverData.reduce((acc, driver) => {
        if (driver.email) acc[driver.email] = { name: driver.name, plat: driver.plat };
        return acc;
      }, {});

      const newUnmappedTags = new Map();
      for (const resultItem of filteredResults) {
        if (resultItem.result && Array.isArray(resultItem.result.routing)) {
          for (const route of resultItem.result.routing) {
            const tags = route.vehicleTags;
            const driverInfo = driverMap[route.assignee];
            const vehiclePlat = driverInfo && driverInfo.plat ? driverInfo.plat : 'N/A';
            if (Array.isArray(tags) && tags.length > 0) {
              const firstTag = String(tags[0]);
              const parts = firstTag.split('-');
              if (parts.length >= 2) {
                let specificType = parts[1].toUpperCase();
                if (parts.length > 2 && parts[2].toUpperCase() === 'LONG') {
                  if (['CDE', 'CDD', 'FUSO'].includes(specificType)) {
                    specificType = `${specificType}-LONG`;
                  }
                }
                const isKnown = VEHICLE_TYPES.includes(specificType);
                const isMapped = hubTagMap[vehiclePlat] && hubTagMap[vehiclePlat][specificType];

                if (!isKnown && !isMapped) {
                  const uniqueMapKey = `${vehiclePlat}-${specificType}`;
                  if (!newUnmappedTags.has(uniqueMapKey)) {
                    newUnmappedTags.set(uniqueMapKey, {
                      tag: specificType,
                      plat: vehiclePlat,
                      fullTag: firstTag,
                    });
                  }
                }
              }
            }
          }
        }
      }

      // 3. Putuskan Alur
      if (newUnmappedTags.size > 0) {
        // Mode Mapping
        setPendingData({ results: filteredResults, date: dateFrom }); // Kirim H-1
        setUnmappedTags(Array.from(newUnmappedTags.values()));
        if (onLoadingChange) onLoadingChange(false);
        if (onMappingModeChange) onMappingModeChange(true);
      } else {
        // Mode Download Langsung
        // Panggil 'helper' baru
        const { wb, excelFileName, missingTimesFound } = generateRoutingWorkbook(
          driverData,
          filteredResults,
          hubTagMap,
          selectedDate, // <-- Kirim tanggal ASLI (pilihan user) untuk penamaan
          selectedLocationName
        );

        if (missingTimesFound) {
          toastWarning(
            'Travel Time atau Visit Time tidak ada di API. Periksa manual di menu Routing!'
          );
        }

        // Download file
        XLSX.writeFile(wb, excelFileName);
        toastSuccess('File Routing Summary berhasil di-download!');

        if (onLoadingChange) onLoadingChange(false);
      }
    } catch (e) {
      toastError(e.message);
      if (onLoadingChange) onLoadingChange(false);
      if (onMappingModeChange) onMappingModeChange(false);
    }
  };

  // --- RENDER UTAMA ---

  // Tampilan 1: Mode Pemetaan (Mapping Mode)
  if (unmappedTags.length > 0) {
    // ... (JSX Mode Mapping - TIDAK BERUBAH) ...
    return (
      <div className="flex flex-col items-center w-full max-w-4xl p-4">
        <h2 className="text-2xl font-bold mb-4 text-red-400">Peringatan!</h2>
        <h3 className="text-lg mt-2 text-gray-600 mb-6">
          Ditemukan {unmappedTags.length} tipe kendaraan baru yang tidak dikenal.
        </h3>
        <div className="w-full max-w-2xl mb-6">
          {unmappedTags.map((info) => (
            <TagMappingRow
              key={`${info.plat}-${info.tag}`}
              unmappedInfo={info}
              onMapChange={(plat, tag, selectedType) => {
                setNewMappings((prev) => ({
                  ...prev,
                  [plat]: {
                    ...(prev[plat] || {}),
                    [tag]: selectedType,
                  },
                }));
              }}
            />
          ))}
        </div>
        <button
          onClick={handleSaveMappingAndProcess}
          disabled={isNewMappingNull ? true : false}
          className="px-6 py-3 bg-sky-600 cursor-pointer text-white rounded hover:bg-sky-700 disabled:bg-gray-500 w-full sm:w-64 text-center disabled:cursor-not-allowed"
        >
          <div className="flex justify-center items-center">Simpan Pemetaan</div>
        </button>
      </div>
    );
  }

  // Tampilan 2: Tombol Aksi Normal
  return (
    <div className="flex flex-col">
      <div className="flex flex-col">
        <button
          onClick={handleRoutingSummary}
          disabled={isLoading || isInputInvalid}
          className={`
          px-6 py-3 rounded w-full sm:w-64 text-center text-white font-bold text-lg 
          ${
            isInputInvalid
              ? 'bg-gray-400 cursor-not-allowed'
              : isLoading
                ? 'bg-sky-600 cursor-not-allowed'
                : 'bg-sky-600 hover:bg-sky-700 cursor-pointer'
          }
        `}
        >
          {isLoading ? (
            <div className="flex justify-center items-center">
              <div className="w-6 h-6 border-4 border-amber-400 border-t-white rounded-full animate-spin" />
            </div>
          ) : (
            'Routing Summary'
          )}
        </button>
      </div>
    </div>
  );
}
