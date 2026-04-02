'use client';

import { toastError } from '@/lib/toastHelper';
import { isEmpty } from '@/lib/utils';
import { useEffect, useState } from 'react';

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
  showPlaceholder,
  searchable,
  translate,
  ...rest
}) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(Boolean(!hubsToShow && typeof fetchHubsFn === 'function'));
  const [error, setError] = useState(null);
  const [localValue, setLocalValue] = useState(value ?? '');

  useEffect(() => {
    if (saveToLocalStorageKey && isEmpty(value)) {
      try {
        const stored = localStorage.getItem(saveToLocalStorageKey);
        if (stored) setLocalValue(stored);
      } catch (e) {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (value !== undefined && value !== null) setLocalValue(value);
  }, [value]);

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

    setList([]);
    return () => (mounted = false);
  }, [hubsToShow, fetchHubsFn]);

  useEffect(() => {
    if (!compact) return;
    if (loading) return;
    if (error) return;
    if (isEmpty(localValue) && data.length > 0) {
      const first = data[0];
      const val = String(first[optionValueField] ?? first.id ?? '');
      const label = first[optionLabelField] ?? first.name ?? '';
      setLocalValue(val);
      onChange?.(val, label);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compact, loading, error, data]);

  useEffect(() => {
    if (!saveToLocalStorageKey) return;
    try {
      if (localValue) localStorage.setItem(saveToLocalStorageKey, localValue);
      else localStorage.removeItem(saveToLocalStorageKey);
    } catch (e) {
      console.error(e);
      toastError(translate('common.toast.error', { err: e.message }));
    }
  }, [localValue, saveToLocalStorageKey, translate]);

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
    'rounded-md border transition border-gray-300 text-gray-700 cursor-pointer hover:bg-gray-50';

  return (
    <select
      value={localValue ?? ''}
      onChange={handleChange}
      disabled={disabled || loading || Boolean(error)}
      className={`${base} ${paddingClass} ${disabledClass} ${className} `}
      {...rest}
    >
      {error && <option value="">{error}</option>}

      {!loading && !error && (
        <>
          {!compact && placeholder && <option value="">{placeholder}</option>}
          {isEmpty(data) && <option value="">{'-- Tidak ada lokasi --'}</option>}

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
