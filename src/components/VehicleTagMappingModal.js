'use client';

import BaseModal from '@/components/BaseModal';
import { getVehicleTypes } from '@/lib/api';
import { getLocalStorage, setLocalStorage } from '@/lib/localStorageHandler';
import { useEffect, useState } from 'react';

export default function VehicleTagMappingModal({ unmappedData, onCompleted, t }) {
  const [mappings, setMappings] = useState({});
  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchVehicleTypes() {
      try {
        const types = await getVehicleTypes();
        setVehicleTypes(types.map((type) => type.name));
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchVehicleTypes();
  }, []);

  const handleSave = () => {
    let currentMap = {};
    try {
      const { storedVehicleTag: stored } = getLocalStorage();
      if (stored) currentMap = JSON.parse(stored);
    } catch (e) {}

    unmappedData.forEach((item) => {
      const { hubId, plat, tag } = item;
      const selectedType = mappings[`${plat}-${tag}`];

      if (selectedType) {
        if (!currentMap[hubId]) currentMap[hubId] = {};
        if (!currentMap[hubId][plat]) currentMap[hubId][plat] = {};
        currentMap[hubId][plat][tag] = selectedType;
      }
    });

    setLocalStorage('vehicleTagMap', JSON.stringify(currentMap));
    onCompleted();
  };

  const isAllSelected = unmappedData.every((item) => mappings[`${item.plat}-${item.tag}`]);

  const footerContent = (
    <div className="flex justify-end">
      <button
        onClick={handleSave}
        disabled={!isAllSelected || isLoading}
        className="px-6 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-lg disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors w-full sm:w-auto hover:cursor-pointer"
      >
        {t('common.save')}
      </button>
    </div>
  );

  return (
    <BaseModal
      isOpen={true}
      onClose={() => {}}
      title={
        <div>
          <h2 className="text-xl font-bold">{t('common.warning')}</h2>
          <p className="text-sm mt-1 font-normal">{t('vehicle_tag.description')}</p>
        </div>
      }
      maxWidth="max-w-3xl"
      footer={footerContent}
      noClose={true}
    >
      <div>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <svg className="animate-spin h-8 w-8 text-sky-600" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          </div>
        ) : (
          unmappedData.map((info, idx) => (
            <div
              key={idx}
              className="p-4 border border-gray-200 rounded-lg mb-4 bg-gray-50 shadow-sm"
            >
              <div className="flex flex-col sm:flex-row justify-between items-start mb-4">
                <div>
                  <p className="text-sm text-gray-500 text-left">{t('common.number_plates')}</p>
                  <p className="font-bold text-lg text-slate-800">{info.plat}</p>
                </div>
                <div className="mt-3 sm:mt-0 text-left sm:text-right w-full sm:w-auto">
                  <p className="text-sm text-gray-500">{t('vehicle_tag.tag')}</p>
                  <code className="bg-gray-200 px-2 py-1 rounded text-sm font-mono text-red-600 inline-block wrap-break-words max-w-full">
                    {info.fullTag}
                  </code>
                </div>
              </div>
              <div className="mt-2">
                <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide text-left">
                  {t('vehicle_tag.message_choose')}:
                </p>
                <div className="flex flex-wrap gap-2">
                  {vehicleTypes.map((type) => (
                    <label
                      key={type}
                      className={`cursor-pointer px-3 py-1.5 rounded-md text-sm border transition-all ${mappings[`${info.plat}-${info.tag}`] === type ? 'bg-sky-600 text-white border-sky-600 shadow-md transform scale-105' : 'bg-white text-gray-600 border-gray-300 hover:border-sky-400 hover:bg-sky-50'}`}
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
          ))
        )}
      </div>
    </BaseModal>
  );
}
