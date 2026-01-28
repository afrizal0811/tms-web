'use client';

import { useLanguage } from '@/context/LanguageContext';
import { useEffect, useRef, useState } from 'react';

export default function StorageTypeFilter({ selectedTypes, onApply }) {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [tempSelected, setTempSelected] = useState(selectedTypes);
  const dropdownRef = useRef(null);

  useEffect(() => {
    setTempSelected(selectedTypes);
  }, [selectedTypes]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setTempSelected(selectedTypes);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedTypes]);

  const handleCheckboxChange = (type) => {
    setTempSelected((prev) => {
      if (prev.includes(type)) {
        return prev.filter((t) => t !== type);
      } else {
        return [...prev, type];
      }
    });
  };

  const handleApply = () => {
    if (tempSelected.length === 0) return;
    onApply(tempSelected);
    setIsOpen(false);
  };

  const getLabel = () => {
    if (selectedTypes.length === 0) return 'None Selected';

    const displayNames = selectedTypes.map((type) => {
      if (type === 'DRY') return 'Dry';
      if (type === 'FROZEN') return 'Frozen';
      return type;
    });

    return displayNames.join(', ');
  };

  const areArraysEqual = (arr1, arr2) => {
    if (arr1.length !== arr2.length) return false;
    const sorted1 = [...arr1].sort();
    const sorted2 = [...arr2].sort();
    return sorted1.every((value, index) => value === sorted2[index]);
  };

  const isSelectionEmpty = tempSelected.length === 0;
  const isUnchanged = areArraysEqual(tempSelected, selectedTypes);
  const isApplyDisabled = isSelectionEmpty || isUnchanged;

  return (
    <div className="relative w-full xl:w-48" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between gap-2 bg-white px-3 py-2 rounded-md shadow-sm border border-gray-300 hover:bg-gray-50 transition-all text-sm font-medium text-slate-700 w-full"
      >
        <span className="truncate">{getLabel()}</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className={`w-4 h-4 transition-transform shrink-0 ${isOpen ? 'rotate-180' : ''}`}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-full bg-white rounded-lg shadow-xl ring-1 ring-black ring-opacity-5 z-50 animate-in fade-in zoom-in-95 duration-100 overflow-hidden">
          <div className="p-3 flex flex-col gap-2">
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer hover:bg-slate-50 p-2 rounded transition-colors select-none">
              <input
                type="checkbox"
                checked={tempSelected.includes('DRY')}
                onChange={() => handleCheckboxChange('DRY')}
                className="rounded text-sky-600 focus:ring-sky-500 w-4 h-4 border-gray-300"
              />
              Dry
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer hover:bg-slate-50 p-2 rounded transition-colors select-none">
              <input
                type="checkbox"
                checked={tempSelected.includes('FROZEN')}
                onChange={() => handleCheckboxChange('FROZEN')}
                className="rounded text-sky-600 focus:ring-sky-500 w-4 h-4 border-gray-300"
              />
              Frozen
            </label>
          </div>
          <div className="bg-gray-50 p-2 border-t border-gray-100">
            <button
              onClick={handleApply}
              disabled={isApplyDisabled}
              className={`
                w-full text-white text-xs font-bold px-3 py-2 rounded transition-all capitalize
                ${
                  isApplyDisabled
                    ? 'bg-gray-400 cursor-not-allowed opacity-70'
                    : 'bg-sky-600 hover:bg-sky-700 cursor-pointer shadow-sm hover:shadow'
                }
              `}
            >
              {t('common.save')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
