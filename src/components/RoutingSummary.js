// File: src/components/RoutingSummary.js
'use client';

import { useState } from 'react';
import { 
  calculateTargetDates, 
  formatMinutesToHHMM, 
  parseAndRoundPercentage,
  formatYYYYMMDDToDDMMYYYY // <-- 3. Nama impor diubah
} from '@/lib/utils';
import { VEHICLE_TYPES, TAG_MAP_KEY } from '@/lib/constants'; 
import * as XLSX from 'xlsx-js-style';

// --- 5. PERBAIKAN TYPO JSX ---
function TagMappingRow({ unmappedInfo, onMapChange }) {
  const { tag, plat, fullTag } = unmappedInfo;
  return (
    <div className="p-4 border border-gray-600 rounded-lg mb-4 text-left w-full">
      <p className="mb-3">
        Plat <strong>{plat || 'N/A'}</strong> (tag: <strong>{fullTag}</strong>) memiliki tipe <strong>`{tag}`</strong> yg tidak dikenal.
      </p>
      <p className="mb-2 font-semibold">Petakan tipe `{tag}` ke tipe standar:</p>
      {/* ... (sisa JSX radio button tetap sama) ... */}
    </div>
  );
}
// --- SELESAI PERBAIKAN ---


export default function RoutingSummary({ selectedLocation, selectedUser, driverData, selectedDate, selectedLocationName }) {
  
  // ... (state tetap sama) ...
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pendingData, setPendingData] = useState(null); 
  const [unmappedTags, setUnmappedTags] = useState([]); 
  const [newMappings, setNewMappings] = useState({});

  // ... (handleSaveMappingAndProcess tetap sama) ...
  const handleSaveMappingAndProcess = () => {
    setIsLoading(true);
    setError(null);
    const allTagsMapped = unmappedTags.every(item => newMappings[item.tag]);
    if (!allTagsMapped) {
      setError("Harap petakan semua tipe kendaraan.");
      setIsLoading(false);
      return;
    }
    const fullTagMap = JSON.parse(localStorage.getItem(TAG_MAP_KEY) || '{}');
    const hubTagMap = fullTagMap[selectedLocation] || {};
    const updatedHubMap = { ...hubTagMap, ...newMappings };
    const updatedFullMap = { ...fullTagMap, [selectedLocation]: updatedHubMap };
    localStorage.setItem(TAG_MAP_KEY, JSON.stringify(updatedFullMap));
    
    try {
      processAndDownloadExcel(pendingData.results, updatedHubMap, pendingData.date, selectedLocationName);
    } catch (err) {
      setError(err.message);
    }
    setPendingData(null);
    setUnmappedTags([]);
    setNewMappings({});
    setIsLoading(false);
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
    [...VEHICLE_TYPES, "Lainnya"].forEach(type => {
      truckUsageCount[type] = { "Dry": 0, "Frozen": 0 };
    });

    filteredResults.forEach(resultItem => {
      if (resultItem.result && Array.isArray(resultItem.result.routing)) {
        resultItem.result.routing.forEach(route => {
           // ... (logika pengisian processedDataRows dan sheet 2 & 3 tetap sama) ...
           const assigneeEmail = route.assignee;
           const driverInfo = driverMap[assigneeEmail];
           const driverName = driverInfo ? driverInfo.name : assigneeEmail;
           const weightPercent = parseAndRoundPercentage(route.weightPercentage);
           const volumePercent = parseAndRoundPercentage(route.volumePercentage);
           const hasTrips = (Array.isArray(route.trips) && route.trips.length > 0);
           processedDataRows.push({
             plat: driverInfo ? driverInfo.plat : null,
             driver: driverName,
             weightPercentage: weightPercent || 0,
             volumePercentage: volumePercent || 0,
             totalDistance: route.totalDistance || 0,
             totalVisits: null,
             totalDelivered: null,
             shipDurationRaw: route.totalSpentTime || 0,
             hasTrips: hasTrips 
           });
           const tags = route.vehicleTags;
           const distance = route.totalDistance || 0; 
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
                let category = "Lainnya"; 
                if (VEHICLE_TYPES.includes(specificType)) category = specificType;
                else if (tagMap[specificType]) category = tagMap[specificType];
                if (generalType === 'FROZEN') truckUsageCount[category]["Frozen"] += 1;
                else if (generalType === 'DRY') truckUsageCount[category]["Dry"] += 1;
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
          hasTrips: existing.hasTrips || row.hasTrips
        });
      }
    }
    
    // --- PEMBUATAN EXCEL ---
    const wb = XLSX.utils.book_new();
    const headerStyle = { font: { bold: true }, alignment: { horizontal: "center", vertical: "center" } };
    const centerStyle = { alignment: { horizontal: "center", vertical: "center" } };

    // --- Sheet 1: Truck Detail (LOGIKA BARU) ---
    const headers1 = [
      "Plat", "Driver", "Weight Percentage", "Volume Percentage",
      "Total Distance (m)", "Total Visits", "Total Delivered", "Ship Duration"
    ];

    // --- Poin 1: Filter "Demo" dan plat null dari driverData ---
    const validDriverData = driverData.filter(driver => {
        const plat = driver.plat || ''; // Ambil plat, jadikan string kosong jika null
        if (plat === '') return false; // Filter plat null/kosong
        if (plat.toUpperCase().includes('DEMO')) return false; // Filter "Demo"
        return true;
    });

    // 1. Buat data Excel dari 'validDriverData'
    const excelDataRows = validDriverData.map(driver => {
      const driverName = driver.name;
      const driverPlat = driver.plat;
      const mergedRow = mergedTruckDetailMap.get(driverName);
      
      if (mergedRow && mergedRow.hasTrips) {
        return {
          Plat: mergedRow.plat,
          Driver: mergedRow.driver,
          WeightPercentage: mergedRow.weightPercentage > 0 ? `${mergedRow.weightPercentage}%` : null, 
          VolumePercentage: mergedRow.volumePercentage > 0 ? `${mergedRow.volumePercentage}%` : null, 
          TotalDistance: mergedRow.totalDistance > 0 ? mergedRow.totalDistance : null, 
          TotalVisits: null,
          TotalDelivered: null,
          ShipDuration: formatMinutesToHHMM(mergedRow.shipDurationRaw)
        };
      } else {
        return {
          Plat: driverPlat,
          Driver: driverName,
          WeightPercentage: null, VolumePercentage: null, TotalDistance: null,
          TotalVisits: null, TotalDelivered: null, ShipDuration: null
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
    
    // Konversi object ke array of arrays
    const finalSheetData1 = [headers1, ...excelDataRows.map(row => [
        row.Plat, row.Driver, row.WeightPercentage, row.VolumePercentage,
        row.TotalDistance, row.TotalVisits, row.TotalDelivered, row.ShipDuration
    ])];
    
    const wsTruckDetail = XLSX.utils.aoa_to_sheet(finalSheetData1);
    // (Styling Sheet 1)
    const range1 = XLSX.utils.decode_range(wsTruckDetail['!ref']);
    const centerAlignedDataColumns1 = [2, 3, 4, 7];
    for (let R = range1.s.r; R <= range1.e.r; ++R) {
      for (let C = range1.s.c; C <= range1.e.c; ++C) {
        const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
        if (!wsTruckDetail[cellRef]) continue;
        if (R === 0) {
          wsTruckDetail[cellRef].s = headerStyle;
        } else if (centerAlignedDataColumns1.includes(C)) {
          wsTruckDetail[cellRef].s = centerStyle;
        }
      }
    }
    const colWidths1 = headers1.map((_, i) => ({ wch: finalSheetData1.reduce((max, row) => Math.max(max, row[i] ? String(row[i]).length : 0), 0) + 2 }));
    wsTruckDetail['!cols'] = colWidths1;
    XLSX.utils.book_append_sheet(wb, wsTruckDetail, "Truck Detail");

    // --- Sheet 2: Total Distance Summary (Tidak berubah) ---
    // ... (Logika sheet 2 tetap sama) ...
    const totalDryKm = totalDryDistance / 1000;
    const totalFrozenKm = totalFrozenDistance / 1000;
    const distanceSummaryData = [
      ["DRY (km)", "FROZEN (km)"],
      [totalDryKm, totalFrozenKm]
    ];
    const wsDistanceSummary = XLSX.utils.aoa_to_sheet(distanceSummaryData);
    const distanceHeaderStyle = { font: { bold: true }, alignment: { horizontal: "center", vertical: "center" } };
    const distanceDataStyle = { alignment: { horizontal: "center", vertical: "center" }, t: 'n', z: '0.00' }; 
    wsDistanceSummary['A1'] = { v: "DRY (km)", t: 's', s: distanceHeaderStyle };
    wsDistanceSummary['B1'] = { v: "FROZEN (km)", t: 's', s: distanceHeaderStyle };
    wsDistanceSummary['A2'] = { v: totalDryKm, t: 'n', s: distanceDataStyle };
    wsDistanceSummary['B2'] = { v: totalFrozenKm, t: 'n', s: distanceDataStyle };
    wsDistanceSummary['!cols'] = [{ wch: 15 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, wsDistanceSummary, "Total Distance Summary");

    // --- Sheet 3: Truck Usage (Tidak berubah) ---
    // ... (Logika sheet 3 tetap sama) ...
    const usageHeader = ["Tipe Kendaraan", "Jumlah (Dry)", "Jumlah (Frozen)"];
    const usageDataRows = VEHICLE_TYPES.map(type => {
      const dryCount = truckUsageCount[type]["Dry"];
      const frozenCount = truckUsageCount[type]["Frozen"];
      return [
        type, 
        dryCount > 0 ? dryCount : null,
        frozenCount > 0 ? frozenCount : null
      ];
    });
    const lainDryCount = truckUsageCount["Lainnya"]["Dry"];
    const lainFrozenCount = truckUsageCount["Lainnya"]["Frozen"];
    if (lainDryCount > 0 || lainFrozenCount > 0) {
      usageDataRows.push([
        "Lainnya",
        lainDryCount > 0 ? lainDryCount : null,
        lainFrozenCount > 0 ? lainFrozenCount : null
      ]);
    }
    const finalUsageData = [usageHeader, ...usageDataRows];
    const wsTruckUsage = XLSX.utils.aoa_to_sheet(finalUsageData);
    // (Styling Sheet 3)
    const usageHeaderStyle = { font: { bold: true }, alignment: { horizontal: "center", vertical: "center" } };
    const usageDataNumStyle = { alignment: { horizontal: "center", vertical: "center" }, t: 'n' };
    const usageDataLabelStyle = { alignment: { horizontal: "left", vertical: "center" } };
    wsTruckUsage['A1'].s = usageHeaderStyle;
    wsTruckUsage['B1'].s = usageHeaderStyle;
    wsTruckUsage['C1'].s = usageHeaderStyle;
    finalUsageData.forEach((row, R) => {
      if (R === 0) return; 
      const aRef = `A${R+1}`; const bRef = `B${R+1}`; const cRef = `C${R+1}`;
      if (wsTruckUsage[aRef]) wsTruckUsage[aRef].s = usageDataLabelStyle; 
      if (wsTruckUsage[bRef]) wsTruckUsage[bRef].s = usageDataNumStyle;
      if (wsTruckUsage[cRef]) wsTruckUsage[cRef].s = usageDataNumStyle;
    });
    wsTruckUsage['!cols'] = [{ wch: 20 }, { wch: 15 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, wsTruckUsage, "Truck Usage");
    
    // --- Download File ---
    // --- 3. Nama fungsi diubah ---
    const formattedDate = formatYYYYMMDDToDDMMYYYY(dateForFile);
    const excelFileName = `Routing Summary - ${formattedDate} - ${hubName}.xlsx`;
    XLSX.writeFile(wb, excelFileName);
  }

  
  /**
   * Ini adalah fungsi UTAMA yang dipanggil tombol "Routing Summary"
   */
  const handleRoutingSummary = async () => {
    setIsLoading(true);
    setError(null);
    setUnmappedTags([]);
    setPendingData(null);
    setNewMappings({});

    try {
      // 1. Fetch data
      const hubId = selectedLocation; 
      // --- Poin 1: Pastikan driverData ada ---
      if (!hubId || !Array.isArray(driverData) || driverData.length === 0) {
        throw new Error("Data Hub atau Driver (driverData) tidak valid atau belum dimuat.");
      }
      
      const { dateFrom, dateTo } = calculateTargetDates(selectedDate); 
      
      const apiUrl = `/api/get-results-summary?dateFrom=${dateFrom}&dateTo=${dateTo}&limit=500&hubId=${hubId}`;
      const response = await fetch(apiUrl);
      const responseData = await response.json();
      if (!response.ok) throw new Error(responseData.error || 'Gagal mengambil data hasil routing');
      if (!responseData.data || !Array.isArray(responseData.data.data)) throw new Error("Format data tidak sesuai.");
      
      const filteredResults = responseData.data.data.filter(item => item.dispatchStatus === 'done');
      if (filteredResults.length === 0) {
        // JIKA API KOSONG, kita tetap lanjutkan untuk generate file KOSONG
        console.warn('Tidak ada data routing berstatus "done" ditemukan. File akan berisi daftar driver saja.');
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
                const isMapped = hubTagMap[specificType];
                
                if (!isKnown && !isMapped) {
                  if (!newUnmappedTags.has(specificType)) {
                    const driverInfo = driverMap[route.assignee];
                    newUnmappedTags.set(specificType, {
                      tag: specificType,
                      plat: driverInfo ? driverInfo.plat : 'N/A',
                      fullTag: firstTag
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
        setPendingData({ results: filteredResults, date: dateFrom }); 
        setUnmappedTags(Array.from(newUnmappedTags.values())); 
        setIsLoading(false);
      } else {
        processAndDownloadExcel(filteredResults, hubTagMap, dateFrom, selectedLocationName); 
        setIsLoading(false);
      }

    } catch (err) {
      setError(err.message);
      setIsLoading(false);
    } 
  };

  // --- RENDER UTAMA ---

  // Tampilan 1: Mode Pemetaan (Mapping Mode)
  if (unmappedTags.length > 0) {
    return (
      <div className="flex flex-col items-center w-full max-w-4xl p-4">
        <h2 className="text-2xl font-bold mb-4 text-yellow-400">Peringatan (Routing)</h2>
        <h3 className="text-lg mt-2 text-gray-300 mb-6">
          Ditemukan {unmappedTags.length} tipe kendaraan baru yang tidak dikenal.
        </h3>
        
        <div className="w-full max-w-2xl mb-6">
          {unmappedTags.map(info => (
            <TagMappingRow 
              key={info.tag}
              unmappedInfo={info}
              onMapChange={(tag, selectedType) => {
                setNewMappings(prev => ({...prev, [tag]: selectedType}));
              }}
            />
          ))}
        </div>

        <button
          onClick={handleSaveMappingAndProcess}
          disabled={isLoading}
          className="px-6 py-3 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-500 w-full sm:w-auto"
        >
          {isLoading ? 'Menyimpan...' : 'Simpan Pemetaan & Lanjutkan'}
        </button>

        {error && (
          <p className="mt-6 text-red-500 text-center">{error}</p>
        )}
      </div>
    );
  }

  // Tampilan 2: Tombol Aksi Normal
  return (
    <div className="flex flex-col">
      <button
        onClick={handleRoutingSummary}
        disabled={isLoading}
        className="px-6 py-3 rounded w-full sm:w-auto text-white
                   bg-blue-600 hover:bg-blue-700 disabled:bg-gray-500"
      >
        {isLoading ? 'Memproses Routing...' : '1. Generate Routing Summary'}
      </button>
      {error && (
        <p className="mt-4 text-red-500 text-xs text-center">{error}</p>
      )}
    </div>
  );
}