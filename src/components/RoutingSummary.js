// File: src/components/RoutingSummary.js
'use client';

import { TAG_MAP_KEY, VEHICLE_TYPES } from '@/lib/constants';
import { calculateTargetDates, formatMinutesToHHMM, formatYYYYMMDDToDDMMYYYY } from '@/lib/utils';
import { useState } from 'react';
import * as XLSX from 'xlsx-js-style';
import { toastError, toastWarning, toastSuccess } from '../lib/toastHelper';

// --- 5. PERBAIKAN TYPO JSX ---
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
              name={`map-${plat}-${tag}`} // Buat 'name' unik per plat & tag
              id={`map-${plat}-${tag}-${type}`}
              value={type}
              // Kirim 'plat', 'tag', dan 'type'
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
// --- SELESAI PERBAIKAN ---

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

  // ... (handleSaveMappingAndProcess tetap sama) ...
  const handleSaveMappingAndProcess = () => {
    if (onLoadingChange) onLoadingChange(true);

    // Validasi struktur 'newMappings' yang baru
    const allTagsMapped = unmappedTags.every(
      (item) => newMappings[item.plat] && newMappings[item.plat][item.tag]
    );

    if (!allTagsMapped) {
      toastError('Harap petakan semua tipe kendaraan.');
      if (onLoadingChange) onLoadingChange(false);
      return;
    }

    // Ambil Peta Lama
    const fullTagMap = JSON.parse(localStorage.getItem(TAG_MAP_KEY) || '{}');
    const hubTagMap = fullTagMap[selectedLocation] || {};

    // Lakukan DEEP MERGE untuk Peta Baru
    // (Penting: Salin hubTagMap agar tidak mengubah state sebelumnya)
    const updatedHubMap = JSON.parse(JSON.stringify(hubTagMap));
    for (const [plat, tags] of Object.entries(newMappings)) {
      if (!updatedHubMap[plat]) {
        updatedHubMap[plat] = {};
      }
      // Gabungkan tag baru ke plat yang ada
      updatedHubMap[plat] = { ...updatedHubMap[plat], ...tags };
    }

    // Simpan Peta
    const updatedFullMap = { ...fullTagMap, [selectedLocation]: updatedHubMap };
    localStorage.setItem(TAG_MAP_KEY, JSON.stringify(updatedFullMap));

    try {
      const missingTimes = processAndDownloadExcel(
        pendingData.results,
        updatedHubMap, // Kirim peta baru ke Excel
        pendingData.date,
        selectedLocationName
      );
      if (missingTimes) {
        toastWarning(
          'Travel Time atau Visit Time tidak ada di API. Periksa manual di menu Routing!'
        );
      }
    } catch (err) {
      toastError(err.message);
    }

    setPendingData(null);
    setUnmappedTags([]);
    setNewMappings({});

    if (onLoadingChange) onLoadingChange(false);
    if (onMappingModeChange) onMappingModeChange(false);
  };

  const processAndDownloadExcel = (filteredResults, tagMap, dateForFile, hubName) => {
    // ... (driverMap, processedDataRows, inisialisasi sheet 2 & 3... tetap sama) ...
    const driverMap = driverData.reduce((acc, driver) => {
      if (driver.email) acc[driver.email] = { name: driver.name, plat: driver.plat };
      return acc;
    }, {});
    let processedDataRows = [];
    let totalDryDistance = 0;
    let totalFrozenDistance = 0;
    let truckUsageCount = {};
    [...VEHICLE_TYPES, 'Lainnya'].forEach((type) => {
      truckUsageCount[type] = { Dry: 0, Frozen: 0 };
    });

    filteredResults.forEach((resultItem) => {
      if (resultItem.result && Array.isArray(resultItem.result.routing)) {
        resultItem.result.routing.forEach((route) => {
          const assigneeEmail = route.assignee;
          const driverInfo = driverMap[assigneeEmail];
          const driverName = driverInfo ? driverInfo.name : assigneeEmail;
          const manualWeightPercentage = (
            (route.totalWeight / route.vehicleMaxWeight) *
            100
          ).toFixed(1);
          const manualVolumePercentage = (
            (route.totalVolume / route.vehicleMaxVolume) *
            100
          ).toFixed(1);
          const totalTravelTime = route.totalTravelTime || 0;
          const totalVisitTime = route.totalVisitTime || 0;
          const totalWaitingTime = route.totalWaitingTime || 0;
          const manualSpentTime = totalTravelTime + totalVisitTime + totalWaitingTime;
          const hasTrips = Array.isArray(route.trips) && route.trips.length > 0;
          processedDataRows.push({
            plat: driverInfo ? driverInfo.plat : null,
            driver: driverName,
            weightPercentage: manualWeightPercentage || 0,
            volumePercentage: manualVolumePercentage || 0,
            totalDistance: route.totalDistance || 0,
            totalVisits: null,
            totalDelivered: null,
            shipDurationRaw: manualSpentTime || route.totalSpentTime || 0,
            hasTrips: hasTrips,
            totalTravelTime: totalTravelTime,
            totalVisitTime: totalVisitTime,
          });
          const tags = route.vehicleTags;
          const distance = route.totalDistance || 0;

          // Tentukan 'vehiclePlat' sebagai kunci mapping
          const vehiclePlat = driverInfo && driverInfo.plat ? driverInfo.plat : 'N/A';

          if (hasTrips && Array.isArray(tags) && tags.length > 0) {
            const firstTag = String(tags[0]);
            const parts = firstTag.split('-');

            if (parts.length >= 2) {
              const generalType = parts[0].toUpperCase();
              if (generalType === 'FROZEN') totalFrozenDistance += distance;
              else if (generalType === 'DRY') totalDryDistance += distance;

              let specificType = parts[1].toUpperCase();
              if (parts.length > 2 && parts[2].toUpperCase() === 'LONG') {
                if (['CDE', 'CDD', 'FUSO'].includes(specificType)) {
                  specificType = `${specificType}-LONG`;
                }
              }

              let category = 'Lainnya';
              if (VEHICLE_TYPES.includes(specificType)) {
                category = specificType;
              }
              // --- PERUBAHAN DI SINI ---
              // Baca dari 'tagMap' menggunakan [plat][tag]
              else if (tagMap[vehiclePlat] && tagMap[vehiclePlat][specificType]) {
                category = tagMap[vehiclePlat][specificType];
              }
              // --- SELESAI PERUBAHAN ---

              if (generalType === 'FROZEN') truckUsageCount[category]['Frozen'] += 1;
              else if (generalType === 'DRY') truckUsageCount[category]['Dry'] += 1;
            }
          }
        });
      }
    });

    // --- 1. GABUNGKAN DATA (MERGE) ---
    const mergedTruckDetailMap = new Map();
    for (const row of processedDataRows) {
      const key = row.driver;
      if (!mergedTruckDetailMap.has(key)) {
        mergedTruckDetailMap.set(key, { ...row });
      } else {
        const existing = mergedTruckDetailMap.get(key);
        mergedTruckDetailMap.set(key, {
          plat: existing.plat || row.plat,
          driver: existing.driver,
          weightPercentage: Math.max(existing.weightPercentage, row.weightPercentage),
          volumePercentage: Math.max(existing.volumePercentage, row.volumePercentage),
          totalDistance: Math.max(existing.totalDistance, row.totalDistance),
          shipDurationRaw: Math.max(existing.shipDurationRaw, row.shipDurationRaw),
          hasTrips: existing.hasTrips || row.hasTrips,
          totalTravelTime: existing.totalTravelTime && row.totalTravelTime,
          totalVisitTime: existing.totalVisitTime && row.totalVisitTime,
        });
      }
    }

    // --- PEMBUATAN EXCEL ---
    const wb = XLSX.utils.book_new();
    const headerStyle = {
      font: { bold: true },
      alignment: { horizontal: 'center', vertical: 'center' },
    };
    const centerStyle = { alignment: { horizontal: 'center', vertical: 'center' } };
    const redFillStyle = {
      fill: { patternType: 'solid', fgColor: { rgb: 'FF0000' } },
      alignment: { horizontal: 'center', vertical: 'center' }, // pastikan tetap di tengah
    };
    // --- Sheet 1: Truck Detail (LOGIKA BARU) ---
    const headers1 = [
      'Plat',
      'Driver',
      'Weight Percentage',
      'Volume Percentage',
      'Total Distance (m)',
      'Total Visits',
      'Total Delivered',
      'Ship Duration',
    ];

    // --- Poin 1: Filter "Demo" dan plat null dari driverData ---
    const validDriverData = driverData.filter((driver) => {
      const plat = driver.plat || ''; // Ambil plat, jadikan string kosong jika null
      if (plat === '') return false; // Filter plat null/kosong
      if (plat.toUpperCase().includes('DEMO')) return false; // Filter "Demo"
      return true;
    });

    // 1. Buat data Excel dari 'validDriverData'
    const excelDataRows = validDriverData.map((driver) => {
      const driverName = driver.name;
      const driverPlat = driver.plat;
      const mergedRow = mergedTruckDetailMap.get(driverName);

      if (mergedRow && mergedRow.hasTrips) {
        const hasMissingTimes = mergedRow.totalTravelTime === 0 || mergedRow.totalVisitTime === 0;
        return {
          Plat: mergedRow.plat,
          Driver: mergedRow.driver,
          WeightPercentage:
            mergedRow.weightPercentage > 0 ? `${mergedRow.weightPercentage}%` : null,
          VolumePercentage:
            mergedRow.volumePercentage > 0 ? `${mergedRow.volumePercentage}%` : null,
          TotalDistance: mergedRow.totalDistance > 0 ? mergedRow.totalDistance : null,
          TotalVisits: null,
          TotalDelivered: null,
          ShipDuration: formatMinutesToHHMM(mergedRow.shipDurationRaw),
          hasMissingTimes: hasMissingTimes,
        };
      } else {
        return {
          Plat: driverPlat,
          Driver: driverName,
          WeightPercentage: null,
          VolumePercentage: null,
          TotalDistance: null,
          TotalVisits: null,
          TotalDelivered: null,
          ShipDuration: null,
          hasMissingTimes: false,
        };
      }
    });

    // --- Poin 2 & 3: Sorting Bertingkat ---
    const getSortGroup = (platStr) => {
      if (!platStr) return 1; // Jika plat null (seharusnya sudah difilter, tapi jaga-jaga)
      const platUpper = platStr.toUpperCase();
      if (platUpper.includes('DM')) return 3;
      if (platUpper.includes('SEWA')) return 2;
      return 1; // Standar
    };

    excelDataRows.sort((a, b) => {
      const platA = a.Plat || '';
      const platB = b.Plat || '';
      const driverA = a.Driver || '';
      const driverB = b.Driver || '';

      const groupA = getSortGroup(platA);
      const groupB = getSortGroup(platB);

      if (groupA !== groupB) {
        return groupA - groupB; // Urutkan grup (1. Standar, 2. Sewa, 3. DM)
      }

      // Jika grup sama, urutkan berdasarkan nama driver
      return driverA.localeCompare(driverB);
    });
    // --- Selesai Sorting ---
    const missingTimesFound = excelDataRows.some((row) => row.hasMissingTimes);
    // Konversi object ke array of arrays
    const finalSheetData1 = [
      headers1,
      ...excelDataRows.map((row) => [
        row.Plat,
        row.Driver,
        row.WeightPercentage,
        row.VolumePercentage,
        row.TotalDistance,
        row.TotalVisits,
        row.TotalDelivered,
        row.ShipDuration,
      ]),
    ];

    const wsTruckDetail = XLSX.utils.aoa_to_sheet(finalSheetData1);
    // (Styling Sheet 1)
    const range1 = XLSX.utils.decode_range(wsTruckDetail['!ref']);
    const centerAlignedDataColumns1 = [2, 3, 4, 7];
    const shipDurationColIndex = 7;
    for (let R = range1.s.r; R <= range1.e.r; ++R) {
      for (let C = range1.s.c; C <= range1.e.c; ++C) {
        const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
        if (!wsTruckDetail[cellRef]) continue;

        if (R === 0) {
          wsTruckDetail[cellRef].s = headerStyle;

          if (C === shipDurationColIndex && missingTimesFound) {
            if (!wsTruckDetail[cellRef].c) wsTruckDetail[cellRef].c = [];
            wsTruckDetail[cellRef].c.push({
              a: 'Info',
              t: 'Travel Time atau Visit Time tidak ada di API. Periksa manual di menu Routing!',
              h: true,
            });
          }
        } else if (centerAlignedDataColumns1.includes(C)) {
          wsTruckDetail[cellRef].s = centerStyle;
        }

        const rowData = excelDataRows[R - 1];
        if (rowData && rowData.hasMissingTimes && C === shipDurationColIndex) {
          wsTruckDetail[cellRef].s = redFillStyle; // Terapkan style merah
        }
      }
    }
    const colWidths1 = headers1.map((_, i) => ({
      wch:
        finalSheetData1.reduce((max, row) => Math.max(max, row[i] ? String(row[i]).length : 0), 0) +
        2,
    }));
    wsTruckDetail['!cols'] = colWidths1;
    XLSX.utils.book_append_sheet(wb, wsTruckDetail, 'Truck Detail');

    // --- Sheet 2: Total Distance Summary (Tidak berubah) ---
    // ... (Logika sheet 2 tetap sama) ...
    const totalDryKm = totalDryDistance / 1000;
    const totalFrozenKm = totalFrozenDistance / 1000;
    const distanceSummaryData = [
      ['DRY (km)', 'FROZEN (km)'],
      [totalDryKm, totalFrozenKm],
    ];
    const wsDistanceSummary = XLSX.utils.aoa_to_sheet(distanceSummaryData);
    const distanceHeaderStyle = {
      font: { bold: true },
      alignment: { horizontal: 'center', vertical: 'center' },
    };
    const distanceDataStyle = {
      alignment: { horizontal: 'center', vertical: 'center' },
      t: 'n',
      z: '0.00',
    };
    wsDistanceSummary['A1'] = { v: 'DRY (km)', t: 's', s: distanceHeaderStyle };
    wsDistanceSummary['B1'] = { v: 'FROZEN (km)', t: 's', s: distanceHeaderStyle };
    wsDistanceSummary['A2'] = { v: totalDryKm, t: 'n', s: distanceDataStyle };
    wsDistanceSummary['B2'] = { v: totalFrozenKm, t: 'n', s: distanceDataStyle };
    wsDistanceSummary['!cols'] = [{ wch: 15 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, wsDistanceSummary, 'Total Distance Summary');

    // --- Sheet 3: Truck Usage (Tidak berubah) ---
    // ... (Logika sheet 3 tetap sama) ...
    const usageHeader = ['Tipe Kendaraan', 'Jumlah (Dry)', 'Jumlah (Frozen)'];
    const usageDataRows = VEHICLE_TYPES.map((type) => {
      const dryCount = truckUsageCount[type]['Dry'];
      const frozenCount = truckUsageCount[type]['Frozen'];
      return [type, dryCount > 0 ? dryCount : null, frozenCount > 0 ? frozenCount : null];
    });
    const lainDryCount = truckUsageCount['Lainnya']['Dry'];
    const lainFrozenCount = truckUsageCount['Lainnya']['Frozen'];
    if (lainDryCount > 0 || lainFrozenCount > 0) {
      usageDataRows.push([
        'Lainnya',
        lainDryCount > 0 ? lainDryCount : null,
        lainFrozenCount > 0 ? lainFrozenCount : null,
      ]);
    }
    const finalUsageData = [usageHeader, ...usageDataRows];
    const wsTruckUsage = XLSX.utils.aoa_to_sheet(finalUsageData);
    // (Styling Sheet 3)
    const usageHeaderStyle = {
      font: { bold: true },
      alignment: { horizontal: 'center', vertical: 'center' },
    };
    const usageDataNumStyle = { alignment: { horizontal: 'center', vertical: 'center' }, t: 'n' };
    const usageDataLabelStyle = { alignment: { horizontal: 'left', vertical: 'center' } };
    wsTruckUsage['A1'].s = usageHeaderStyle;
    wsTruckUsage['B1'].s = usageHeaderStyle;
    wsTruckUsage['C1'].s = usageHeaderStyle;
    finalUsageData.forEach((row, R) => {
      if (R === 0) return;
      const aRef = `A${R + 1}`;
      const bRef = `B${R + 1}`;
      const cRef = `C${R + 1}`;
      if (wsTruckUsage[aRef]) wsTruckUsage[aRef].s = usageDataLabelStyle;
      if (wsTruckUsage[bRef]) wsTruckUsage[bRef].s = usageDataNumStyle;
      if (wsTruckUsage[cRef]) wsTruckUsage[cRef].s = usageDataNumStyle;
    });
    wsTruckUsage['!cols'] = [{ wch: 20 }, { wch: 15 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, wsTruckUsage, 'Truck Usage');

    // --- Download File ---
    // --- 3. Nama fungsi diubah ---
    const formattedDate = formatYYYYMMDDToDDMMYYYY(dateForFile);
    const excelFileName = `Routing Summary - ${formattedDate} - ${hubName}.xlsx`;
    XLSX.writeFile(wb, excelFileName);
    toastSuccess('File Routing Summary berhasil di-download!');
    return missingTimesFound;
  };

  /**
   * Ini adalah fungsi UTAMA yang dipanggil tombol "Routing Summary"
   */
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
      const { dateFrom, dateTo } = calculateTargetDates(selectedDate);
      const apiUrl = `/api/get-results-summary?dateFrom=${dateFrom}&dateTo=${dateTo}&limit=500&hubId=${hubId}`;
      const response = await fetch(apiUrl);
      const responseData = await response.json();
      if (!response.ok) throw new Error(responseData.error || 'Gagal mengambil data hasil routing');
      if (!responseData.data || !Array.isArray(responseData.data.data))
        throw new Error('Format data tidak sesuai.');

      const filteredResults = responseData.data.data.filter(
        (item) => item.dispatchStatus === 'done'
      );
      if (filteredResults.length === 0) {
        toastError('Tidak ada data yang ditemukan untuk tanggal ini.');
        if (onLoadingChange) onLoadingChange(false);
        return;
      }

      // 2. Logika Validasi (Read) - Di-update
      const fullTagMap = JSON.parse(localStorage.getItem(TAG_MAP_KEY) || '{}');
      const hubTagMap = fullTagMap[hubId] || {}; // hubTagMap = { [plat]: { [tag]: newType } }

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

                // Cek mapping baru: hubTagMap[plat][tag]
                const isMapped = hubTagMap[vehiclePlat] && hubTagMap[vehiclePlat][specificType];

                if (!isKnown && !isMapped) {
                  // Buat key unik per plat dan per tag
                  const uniqueMapKey = `${vehiclePlat}-${specificType}`;
                  if (!newUnmappedTags.has(uniqueMapKey)) {
                    newUnmappedTags.set(uniqueMapKey, {
                      tag: specificType,
                      plat: vehiclePlat, // Kirim plat ke UI
                      fullTag: firstTag,
                    });
                  }
                }
              }
            }
          }
        }
      }

      // 3. Putuskan Alur (Tidak berubah)
      if (newUnmappedTags.size > 0) {
        setPendingData({ results: filteredResults, date: dateFrom });
        setUnmappedTags(Array.from(newUnmappedTags.values()));
        if (onLoadingChange) onLoadingChange(false);
        if (onMappingModeChange) onMappingModeChange(true);
      } else {
        const missingTimes = processAndDownloadExcel(
          filteredResults,
          hubTagMap, // Kirim peta baru
          selectedDate,
          selectedLocationName
        );
        if (missingTimes) {
          toastWarning(
            'Travel Time atau Visit Time tidak ada di API. Periksa manual di menu Routing!'
          );
        }
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
    return (
      <div className="flex flex-col items-center w-full max-w-4xl p-4">
        <h2 className="text-2xl font-bold mb-4 text-red-400">Peringatan!</h2>
        <h3 className="text-lg mt-2 text-gray-600 mb-6">
          Ditemukan {unmappedTags.length} tipe kendaraan baru yang tidak dikenal.
        </h3>

        <div className="w-full max-w-2xl mb-6">
          {unmappedTags.map((info) => (
            <TagMappingRow
              key={`${info.plat}-${info.tag}`} // Key harus unik
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
        {/* --- GANTI SELURUH TOMBOL INI --- */}
        <button
          onClick={handleRoutingSummary}
          disabled={isLoading || isInputInvalid}
          className={`
          px-6 py-3 rounded w-full sm:w-64 text-center text-white font-bold text-lg cursor-pointer
          ${
            isInputInvalid
              ? 'bg-gray-400 cursor-not-allowed' // <-- Style jika tanggal tidak valid
              : isLoading
                ? 'bg-sky-600'
                : 'bg-sky-600 hover:bg-sky-700' // Style normal/loading
          }
        `}
        >
          {isLoading ? (
            <div className="flex justify-center items-center">
              <div className="w-6 h-6 border-4 border-amber-400 border-t-white rounded-full animate-spin" />
            </div>
          ) : (
            'Routing Summary' // <-- Teks tetap ada
          )}
        </button>
        {/* --- SELESAI PERUBAHAN --- */}
      </div>
    </div>
  );
}
