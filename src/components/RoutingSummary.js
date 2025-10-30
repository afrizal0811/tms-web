// File: src/components/RoutingSummary.js
// INI ADALAH KOMPONEN BARU UNTUK LOGIKA ROUTING

'use client';

import { useState } from 'react';
import { calculateTargetDates, formatMinutesToHHMM, parseAndRoundPercentage } from '@/lib/utils';
import { VEHICLE_TYPES, TAG_MAP_KEY } from '@/lib/constants'; 
import * as XLSX from 'xlsx-js-style';

// Komponen kecil untuk baris pemetaan (mapping)
function TagMappingRow({ unmappedInfo, onMapChange }) {
  const { tag, plat, fullTag } = unmappedInfo;
  return (
    <div className="p-4 border border-gray-600 rounded-lg mb-4 text-left w-full">
      <p className="mb-3">
        Plat <strong>{plat || 'N/A'}</strong> (tag: <strong>{fullTag}</strong>) memiliki tipe <strong>`{tag}`</strong> yg tidak dikenal.
      </p>
      <p className="mb-2 font-semibold">Petakan tipe `{tag}` ke tipe standar:</p>
      <div className="flex flex-wrap gap-2">
        {VEHICLE_TYPES.map(type => (
          <div key={type}>
            <input 
              type="radio" 
              name={`map-${tag}`} 
              id={`map-${tag}-${type}`} 
              value={type} 
              onChange={(e) => onMapChange(tag, e.target.value)}
              className="sr-only peer"
            />
            <label
              htmlFor={`map-${tag}-${type}`}
              className="px-3 py-1.5 border border-gray-500 rounded-md cursor-pointer text-sm 
                         hover:bg-gray-700 peer-checked:bg-blue-600 peer-checked:border-blue-500"
            >
              {type}
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}

// Komponen utama file ini
// Menerima props dari TmsSummary.js
export default function RoutingSummary({
  selectedLocation,
  selectedUser,
  driverData,
  selectedDate,
  selectedLocationName
}) {
  // SEMUA STATE DAN LOGIKA PINDAH KE SINI
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pendingData, setPendingData] = useState(null); 
  const [unmappedTags, setUnmappedTags] = useState([]); 
  const [newMappings, setNewMappings] = useState({});

  
  const handleSaveMappingAndProcess = () => {
    setIsLoading(true);
    setError(null);
    const allTagsMapped = unmappedTags.every(item => newMappings[item.tag]);
    if (!allTagsMapped) {
      setError("Harap petakan semua tipe kendaraan.");
      setIsLoading(false);
      return;
    }
    const currentTagMap = JSON.parse(localStorage.getItem(TAG_MAP_KEY) || '{}');
    const updatedTagMap = { ...currentTagMap, ...newMappings };
    localStorage.setItem(TAG_MAP_KEY, JSON.stringify(updatedTagMap));
    
    try {
      processAndDownloadExcel(pendingData.results, updatedTagMap, pendingData.date, selectedLocationName);
    }
    catch (err) {
      console.error("Error saat proses Excel setelah mapping:", err);
      setError(err.message);
    }
    setPendingData(null);
    setUnmappedTags([]);
    setNewMappings({});
    setIsLoading(false);
  };

  
  const processAndDownloadExcel = (filteredResults, tagMap, dateForFile, hubName) => {
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
          const assigneeEmail = route.assignee;
          const driverInfo = driverMap[assigneeEmail];
          const weightPercent = parseAndRoundPercentage(route.weightPercentage);
          const volumePercent = parseAndRoundPercentage(route.volumePercentage);
          processedDataRows.push({
            plat: driverInfo ? driverInfo.plat : null,
            driver: driverInfo ? driverInfo.name : assigneeEmail,
            weightPercentage: weightPercent,
            volumePercentage: volumePercent,
            totalDistance: route.totalDistance,
            totalVisits: null,
            totalDelivered: null,
            shipDurationRaw: route.totalSpentTime
          });
          const tags = route.vehicleTags;
          const distance = route.totalDistance || 0; 
          if (Array.isArray(tags) && tags.length > 0) {
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
              if (VEHICLE_TYPES.includes(specificType)) {
                category = specificType;
              } else if (tagMap[specificType]) {
                category = tagMap[specificType];
              } 
              if (generalType === 'FROZEN') {
                truckUsageCount[category]["Frozen"] += 1;
              } else if (generalType === 'DRY') {
                truckUsageCount[category]["Dry"] += 1;
              }
            }
          }
        });
      }
    });

    processedDataRows.sort((a, b) => (a.driver || '').localeCompare(b.driver || ''));

    // --- PEMBUATAN EXCEL ---
    const wb = XLSX.utils.book_new();

    // Sheet 1: Truck Detail
    const headers = ["Plat", "Driver", "Weight Percentage", "Volume Percentage", "Total Distance (m)", "Total Visits", "Total Delivered", "Ship Duration"];
    const finalSheetData = [headers, ...processedDataRows.map(row => [
      row.plat, row.driver,
      row.weightPercentage !== null ? `${row.weightPercentage}%` : null,
      row.volumePercentage !== null ? `${row.volumePercentage}%` : null,
      row.totalDistance, row.totalVisits, row.totalDelivered,
      formatMinutesToHHMM(row.shipDurationRaw)
    ])];
    const wsTruckDetail = XLSX.utils.aoa_to_sheet(finalSheetData);
    // ... (Styling sheet 1) ...
    const headerStyle = { font: { bold: true }, alignment: { horizontal: "center", vertical: "center" } };
    const centerStyle = { alignment: { horizontal: "center", vertical: "center" } };
    const range = XLSX.utils.decode_range(wsTruckDetail['!ref']);
    const headerRowIndex = 0;
    const centerAlignedDataColumns = [2, 3, 4, 7];
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellRef = XLSX.utils.encode_cell({ r: headerRowIndex, c: C });
      let cell = wsTruckDetail[cellRef];
      if (!cell) { wsTruckDetail[cellRef] = { t: 's', v: headers[C] }; cell = wsTruckDetail[cellRef]; }
      cell.s = headerStyle;
    }
    for (let R = range.s.r + 1; R <= range.e.r; ++R) {
      for (let C of centerAlignedDataColumns) {
         if (C > range.e.c) continue;
         const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
         let cell = wsTruckDetail[cellRef];
         if (!cell) {
            let cellValue = finalSheetData[R][C];
            let cellType = (typeof cellValue === 'number') ? 'n' : 's';
            wsTruckDetail[cellRef] = { t: cellType, v: cellValue };
            cell = wsTruckDetail[cellRef];
         }
         if (!cell.s) cell.s = {};
         cell.s.alignment = centerStyle.alignment;
      }
    }
    const colWidths = headers.map((_, i) => ({ wch: finalSheetData.reduce((max, row) => Math.max(max, row[i] ? String(row[i]).length : 0), 0) + 2 }));
    wsTruckDetail['!cols'] = colWidths;
    XLSX.utils.book_append_sheet(wb, wsTruckDetail, "Truck Detail");

    // Sheet 2: Total Distance Summary
    const totalDryKm = totalDryDistance / 1000;
    const totalFrozenKm = totalFrozenDistance / 1000;
    const distanceSummaryData = [["DRY (km)", "FROZEN (km)"], [totalDryKm, totalFrozenKm]];
    const wsDistanceSummary = XLSX.utils.aoa_to_sheet(distanceSummaryData);
    const distanceHeaderStyle = { font: { bold: true }, alignment: { horizontal: "center", vertical: "center" } };
    const distanceDataStyle = { alignment: { horizontal: "center", vertical: "center" }, t: 'n', z: '0.00' }; 
    wsDistanceSummary['A1'] = { v: "DRY (km)", t: 's', s: distanceHeaderStyle };
    wsDistanceSummary['B1'] = { v: "FROZEN (km)", t: 's', s: distanceHeaderStyle };
    wsDistanceSummary['A2'] = { v: totalDryKm, t: 'n', s: distanceDataStyle };
    wsDistanceSummary['B2'] = { v: totalFrozenKm, t: 'n', s: distanceDataStyle };
    wsDistanceSummary['!cols'] = [{ wch: 15 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, wsDistanceSummary, "Total Distance Summary");

    // Sheet 3: Truck Usage
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
    // ... (Styling sheet 3) ...
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
    
    const excelFileName = `Routing Summary - ${dateForFile} - ${hubName}.xlsx`;
    XLSX.writeFile(wb, excelFileName);
  }

  
  // Ini adalah fungsi UTAMA yang dipanggil tombol "Routing Summary"
  const handleRoutingSummary = async () => {
    setIsLoading(true);
    setError(null);
    setUnmappedTags([]);
    setPendingData(null);
    setNewMappings({});

    try {
      // 1. Fetch data (Gunakan props 'selectedLocation' dan 'selectedDate')
      const hubId = selectedLocation; 
      if (!hubId || !Array.isArray(driverData)) {
        throw new Error("Data Hub atau Driver tidak valid.");
      }
      
      const { dateFrom, dateTo } = calculateTargetDates(selectedDate); // <-- Gunakan props 'selectedDate'
      
      const apiUrl = `/api/get-results-summary?dateFrom=${dateFrom}&dateTo=${dateTo}&limit=500&hubId=${hubId}`;
      const response = await fetch(apiUrl);
      const responseData = await response.json();
      if (!response.ok) throw new Error(responseData.error || 'Gagal mengambil data hasil routing');
      if (!responseData.data || !Array.isArray(responseData.data.data)) throw new Error("Format data tidak sesuai.");
      
      const filteredResults = responseData.data.data.filter(item => item.dispatchStatus === 'done');
      if (filteredResults.length === 0) {
        alert('Tidak ada data hasil routing berstatus "done" ditemukan.');
        setIsLoading(false);
        return;
      }

      // 2. VALIDASI TAG
      const driverMap = driverData.reduce((acc, driver) => {
        if (driver.email) acc[driver.email] = { name: driver.name, plat: driver.plat };
        return acc;
      }, {});
      const tagMap = JSON.parse(localStorage.getItem(TAG_MAP_KEY) || '{}');
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
                const isMapped = tagMap[specificType];
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
        // HENTIKAN PROSES, TAMPILKAN UI MAPPING
        console.warn("Ditemukan tag tidak dikenal, meminta input user:", newUnmappedTags);
        setPendingData({ results: filteredResults, date: selectedDate }); 
        setUnmappedTags(Array.from(newUnmappedTags.values())); 
        setIsLoading(false);
      } else {
        processAndDownloadExcel(filteredResults, tagMap, selectedDate, selectedLocationName);
        setIsLoading(false);
      }

    } catch (err) {
      console.error('Error saat proses Routing Summary:', err);
      setError(err.message);
      setIsLoading(false);
    } 
  };


  // --- RENDER UTAMA ---
  // UI untuk komponen ini sekarang hanya berisi tombol aksinya sendiri
  // dan UI mapping jika diperlukan

  if (unmappedTags.length > 0) {
    // Tampilan 1: Mode Pemetaan (Mapping Mode)
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
    // HAPUS "w-full" dari div ini, dan tambahkan "flex flex-col"
    <div className="flex flex-col">
      <button
        onClick={handleRoutingSummary}
        disabled={isLoading}
        // Pastikan w-full hanya berlaku di mobile (bawaan), dan sm:w-auto untuk desktop
        className="px-6 py-3 rounded w-full sm:w-auto text-white
                   bg-blue-600 hover:bg-blue-700 disabled:bg-gray-500"
      >
        {isLoading ? 'Memproses Routing...' : '1. Generate Routing Summary'}
      </button>
      {error && (
        // Tampilkan error di bawah tombolnya sendiri
        <p className="mt-2 text-red-500 text-xs text-center w-full max-w-xs">{error}</p>
      )}
    </div>
  );
}