'use client';

import { TAG_MAP_KEY, VEHICLE_TYPES } from '@/lib/constants';
import { calculateTargetDates } from '@/lib/utils';
import * as XLSX from 'xlsx-js-style';
import { getResultsSummary } from '../../lib/apiService';
import { generateRoutingWorkbook } from '../../lib/reportGenerators/routingReport'; // <-- Path diubah
import { toastError, toastSuccess, toastWarning } from '../../lib/toastHelper';

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
  const handleRoutingSummary = async () => {
    if (onLoadingChange) onLoadingChange(true);
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

      const { wb, excelFileName, missingTimesFound } = generateRoutingWorkbook(
        driverData,
        filteredResults,
        hubTagMap,
        selectedDate,
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
    } catch (e) {
      toastError(e.message);
      if (onLoadingChange) onLoadingChange(false);
      if (onMappingModeChange) onMappingModeChange(false);
    }
  };

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
