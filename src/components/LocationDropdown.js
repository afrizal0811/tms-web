// File: components/LocationDropdown.js
'use client';

import { useEffect, useState } from 'react';
import { toastError } from '@/lib/toastHelper';

/**
 * Simple, reusable LocationDropdown (fixed: no invalid DOM props)
 *
 * Props:
 * - value
 * - onChange(id, label)
 * - hubsToShow
 * - fetchHubsFn
 * - optionValueField (default '_id')
 * - optionLabelField (default 'name')
 * - placeholder (default '-- Pilih Lokasi --')
 * - compact (boolean) => header mode (no placeholder shown)
 * - saveToLocalStorageKey
 * - disabled
 * - className
 *
 * IMPORTANT: any custom props (like showPlaceholder) must NOT be spread into the DOM element.
 */
export default function LocationDropdown({
  value,
  onChange,
  hubsToShow = null,
  fetchHubsFn = null,
  optionValueField = '_id',
  optionLabelField = 'name',
  placeholder = '-- Pilih Lokasi --',
  compact = false,
  saveToLocalStorageKey = null,
  disabled = false,
  className = '',
  // capture any developer-passed custom props here so they don't end up on DOM
  showPlaceholder, // intentionally captured but not used/passed down
  searchable, // capture and ignore if passed accidentally
  // rest will contain only valid native props you intentionally want to forward
  ...rest
}) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(Boolean(!hubsToShow && typeof fetchHubsFn === 'function'));
  const [error, setError] = useState(null);
  const [localValue, setLocalValue] = useState(value ?? '');

  // init localValue from localStorage if key provided and no explicit value
  useEffect(() => {
    if (saveToLocalStorageKey && (value === undefined || value === null || value === '')) {
      try {
        const stored = localStorage.getItem(saveToLocalStorageKey);
        if (stored) setLocalValue(stored);
      } catch (e) {
        // ignore localStorage errors
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // sync when parent passes value
  useEffect(() => {
    if (value !== undefined && value !== null) setLocalValue(value);
  }, [value]);

  // load data: prefer hubsToShow, else fetchHubsFn
  useEffect(() => {
    let mounted = true;
    const setList = (arr) => {
      if (!mounted) return;
      setData(Array.isArray(arr) ? arr : []);
      setLoading(false);
      setError(null);
    };

    if (Array.isArray(hubsToShow)) {
      setList(hubsToShow);
      return () => (mounted = false);
    }

    if (typeof fetchHubsFn === 'function') {
      setLoading(true);
      (async () => {
        try {
          const res = await fetchHubsFn();
          if (!mounted) return;
          setList(res || []);
        } catch (err) {
          if (!mounted) return;
          const msg = err?.message || 'Gagal memuat lokasi';
          setError(msg);
          setLoading(false);
          setData([]);
          toastError?.(msg);
        }
      })();
      return () => (mounted = false);
    }

    // no data source
    setList([]);
    return () => (mounted = false);
  }, [hubsToShow, fetchHubsFn]);

  // if compact (header) and data loaded and no localValue -> auto-select first option
  useEffect(() => {
    if (!compact) return;
    if (loading) return;
    if (error) return;
    if ((localValue === '' || localValue === null || localValue === undefined) && data.length > 0) {
      const first = data[0];
      const val = String(first[optionValueField] ?? first.id ?? '');
      const label = first[optionLabelField] ?? first.name ?? '';
      setLocalValue(val);
      onChange?.(val, label);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compact, loading, error, data]);

  // persist to localStorage if needed
  useEffect(() => {
    if (!saveToLocalStorageKey) return;
    try {
      if (localValue) localStorage.setItem(saveToLocalStorageKey, localValue);
      else localStorage.removeItem(saveToLocalStorageKey);
    } catch (e) {
      // ignore storage errors
    }
  }, [localValue, saveToLocalStorageKey]);

  const handleChange = (e) => {
    const id = e.target.value;
    setLocalValue(id);
    const option = data.find((d) => String(d[optionValueField]) === String(id));
    const label = option ? (option[optionLabelField] ?? '') : '';
    onChange?.(id, label);
  };

  const paddingClass = compact ? 'px-3 py-1 text-sm' : 'px-3 py-2';
  const disabledClass =
    disabled || loading || error ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-white';
  const base =
    'rounded-md border transition focus:outline-none focus:ring-2 focus:ring-sky-400 ' +
    'border-gray-300 text-gray-700 ';

  return (
    // NOTE: we spread only `rest` (native HTML attributes) after we've excluded custom props above.
    // This prevents React warning about unknown DOM attributes like `showPlaceholder`.
    <select
      value={localValue ?? ''}
      onChange={handleChange}
      disabled={disabled || loading || Boolean(error)}
      className={`${base} ${paddingClass} ${disabledClass} ${className} cursor-pointer`}
      {...rest}
    >
      {error && <option value="">{error}</option>}

      {!loading && !error && (
        <>
          {/* show placeholder only when NOT compact (i.e., page mode) */}
          {!compact && placeholder && <option value="">{placeholder}</option>}

          {data.length === 0 && <option value="">{'-- Tidak ada lokasi --'}</option>}

          {data.map((hub) => {
            const val = String(hub[optionValueField] ?? hub.id ?? '');
            const label = hub[optionLabelField] ?? hub.name ?? String(val);
            return (
              <option key={val} value={val}>
                {label}
              </option>
            );
          })}
        </>
      )}
    </select>
  );
}
