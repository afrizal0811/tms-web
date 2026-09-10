'use client';

import SearchBar from '@/components/SearchBar';
import { patchRolePaths } from '@/lib/api/mileapp';
import { toastError, toastSuccess } from '@/lib/toast';
import { capitalizeText } from '@/lib/utils';
import { useMemo, useState } from 'react';
import { AVAILABLE_PATHS } from '../helper/constants';

function groupPaths(paths) {
  const groups = new Map();
  for (const path of paths) {
    let moduleName = null;
    if (path.id.includes('.')) {
      moduleName = path.id.split('.')[0];
    } else if (path.label.includes(' - ')) {
      moduleName = path.label.split(' - ')[0].trim();
    }
    const key = moduleName ? capitalizeText(moduleName) : 'General';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(path);
  }
  return Array.from(groups.entries()).map(([name, items]) => ({ name, items }));
}

function GroupCheckbox({ allChecked, someChecked, onChange }) {
  const setRef = (el) => {
    if (el) el.indeterminate = someChecked;
  };
  return (
    <input
      ref={setRef}
      type="checkbox"
      checked={allChecked}
      onChange={onChange}
      className="w-4 h-4 text-sky-600 border-gray-300 rounded focus:ring-2 focus:ring-sky-500 dark:focus:ring-sky-600 dark:bg-slate-700 dark:border-slate-600 cursor-pointer"
    />
  );
}

function PermissionCheckbox({ checked, label, onChange }) {
  return (
    <label
      className={`flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer select-none transition-colors ${
        checked
          ? 'bg-sky-50 border-sky-200 dark:bg-sky-900/20 dark:border-sky-800'
          : 'bg-white border-slate-200 hover:bg-slate-50 dark:bg-slate-800/50 dark:border-slate-700 dark:hover:bg-slate-800'
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="w-4 h-4 text-sky-600 border-gray-300 rounded focus:ring-2 focus:ring-sky-500 dark:focus:ring-sky-600 dark:ring-offset-slate-800 dark:bg-slate-700 dark:border-slate-600 cursor-pointer"
      />
      <span
        className={`text-sm ${
          checked
            ? 'font-medium text-sky-800 dark:text-sky-300'
            : 'text-slate-600 dark:text-slate-400'
        }`}
      >
        {label}
      </span>
    </label>
  );
}

export default function PermissionTab({ roles, onRefresh, isReadOnly, translate }) {
  const [editingId, setEditingId] = useState(null);
  const [selectedPaths, setSelectedPaths] = useState([]);
  const [initialPaths, setInitialPaths] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [query, setQuery] = useState('');

  const allIds = AVAILABLE_PATHS.map((p) => p.id);
  const groups = useMemo(() => groupPaths(AVAILABLE_PATHS), []);
  const isFlat = groups.length === 1 && groups[0].name === 'General';

  const filteredGroups = useMemo(() => {
    if (!query.trim()) return groups;
    const q = query.toLowerCase();
    return groups
      .map((g) => ({ ...g, items: g.items.filter((p) => p.label.toLowerCase().includes(q)) }))
      .filter((g) => g.items.length > 0);
  }, [groups, query]);

  const hasUnsavedChanges = useMemo(() => {
    if (selectedPaths.length !== initialPaths.length) return true;
    const a = [...selectedPaths].sort();
    const b = [...initialPaths].sort();
    return a.some((v, i) => v !== b[i]);
  }, [selectedPaths, initialPaths]);

  const handleEdit = (role) => {
    const id = role._id || role.id;
    setEditingId(id);
    setQuery('');
    const isAll = !role.paths || role.paths.length === 0;
    const initial = isAll ? allIds : role.paths;
    setSelectedPaths(initial);
    setInitialPaths(initial);
  };

  const handleCancel = () => {
    setEditingId(null);
    setSelectedPaths([]);
    setInitialPaths([]);
    setQuery('');
  };

  const handleTogglePath = (pathId) => {
    setSelectedPaths((prev) =>
      prev.includes(pathId) ? prev.filter((p) => p !== pathId) : [...prev, pathId]
    );
  };

  const handleToggleGroup = (items, enable) => {
    const ids = items.map((p) => p.id);
    setSelectedPaths((prev) =>
      enable ? Array.from(new Set([...prev, ...ids])) : prev.filter((p) => !ids.includes(p))
    );
  };

  const handleSave = async (id) => {
    setIsSaving(true);
    try {
      const finalPaths = selectedPaths.length === allIds.length ? [] : selectedPaths;
      await patchRolePaths(id, finalPaths);
      toastSuccess(translate('common.toast.success') || 'Akses diperbarui');
      await onRefresh();
      setEditingId(null);
    } catch (err) {
      toastError(translate('common.toast.error', { err: err.message }));
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async (id) => {
    setIsSaving(true);
    try {
      await patchRolePaths(id, []);
      toastSuccess(translate('common.toast.success') || 'Akses direset');
      await onRefresh();
      setEditingId(null);
    } catch (err) {
      toastError(translate('common.toast.error', { err: err.message }));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
      {roles.map((role) => {
        const id = role._id || role.id;
        const isEditing = editingId === id;
        const hasPaths = Array.isArray(role.paths) && role.paths.length > 0;
        const isDefault = !hasPaths;
        const activeCount = isEditing
          ? selectedPaths.length
          : isDefault
            ? allIds.length
            : role.paths.length;

        return (
          <div
            key={id}
            className={`rounded-xl border transition-all duration-200 ${
              isEditing
                ? 'bg-white dark:bg-slate-800 border-sky-400 dark:border-sky-600 shadow-md ring-1 ring-sky-400 dark:ring-sky-600 lg:col-span-2'
                : 'bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800 shadow-sm hover:border-sky-300 dark:hover:border-slate-600'
            }`}
          >
            {/* Header: role identity + at-a-glance permission count */}
            <div className="flex items-start justify-between p-5 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                  {capitalizeText(role.name)}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                      isDefault
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    {isDefault ? 'Semua akses' : `${activeCount} dari ${allIds.length} akses`}
                  </span>
                  {isEditing && hasUnsavedChanges && (
                    <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                      Ada perubahan belum disimpan
                    </span>
                  )}
                </div>
              </div>

              {!isReadOnly && !isEditing && (
                <div className="flex gap-2 shrink-0">
                  {!isDefault && (
                    <button
                      onClick={() => handleReset(id)}
                      className="text-xs px-3 py-1.5 font-medium text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40 rounded transition-colors cursor-pointer"
                    >
                      Reset ke default
                    </button>
                  )}
                  <button
                    onClick={() => handleEdit(role)}
                    className="text-xs px-3 py-1.5 font-medium text-sky-700 bg-sky-50 hover:bg-sky-100 dark:bg-sky-900/30 dark:text-sky-400 dark:hover:bg-sky-900/50 rounded transition-colors cursor-pointer"
                  >
                    Atur akses
                  </button>
                </div>
              )}

              {isEditing && (
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={handleCancel}
                    disabled={isSaving}
                    className="text-xs px-3 py-1.5 font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    onClick={() => handleSave(id)}
                    disabled={isSaving || !hasUnsavedChanges}
                    className="text-xs px-3 py-1.5 font-medium text-white bg-sky-600 hover:bg-sky-700 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm cursor-pointer"
                  >
                    {isSaving ? 'Menyimpan...' : 'Simpan perubahan'}
                  </button>
                </div>
              )}
            </div>

            {isEditing ? (
              <div className="px-5 pb-5">
                {/* Search, always visible so user never scrolls blind */}
                <div className="mb-4">
                  <SearchBar
                    value={query}
                    onChange={setQuery}
                    placeholder="Cari akses..."
                    width="w-full"
                    size="md"
                  />
                </div>

                {/* Permission list grouped by module — flat checkboxes (no section) when there's only the fallback "General" group */}
                {filteredGroups.length === 0 ? (
                  <p className="text-sm text-slate-500 py-6 text-center">
                    Tidak ada akses yang cocok dengan pencarian.
                  </p>
                ) : isFlat ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[420px] overflow-y-auto pr-1">
                    {filteredGroups[0].items.map((path) => (
                      <PermissionCheckbox
                        key={path.id}
                        checked={selectedPaths.includes(path.id)}
                        label={path.label}
                        onChange={() => handleTogglePath(path.id)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
                    {filteredGroups.map((group) => {
                      const groupIds = group.items.map((p) => p.id);
                      const allChecked = groupIds.every((gid) => selectedPaths.includes(gid));
                      const someChecked =
                        !allChecked && groupIds.some((gid) => selectedPaths.includes(gid));

                      return (
                        <div
                          key={group.name}
                          className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden"
                        >
                          <label className="flex items-center gap-2.5 px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 cursor-pointer select-none">
                            <GroupCheckbox
                              allChecked={allChecked}
                              someChecked={someChecked}
                              onChange={() => handleToggleGroup(group.items, !allChecked)}
                            />
                            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                              {group.name}
                            </span>
                            <span className="text-xs font-normal text-slate-400">
                              {groupIds.filter((gid) => selectedPaths.includes(gid)).length}/
                              {groupIds.length}
                            </span>
                          </label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3">
                            {group.items.map((path) => (
                              <PermissionCheckbox
                                key={path.id}
                                checked={selectedPaths.includes(path.id)}
                                label={path.label}
                                onChange={() => handleTogglePath(path.id)}
                              />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              !isDefault && (
                <div className="px-5 pb-5">
                  <div className="flex flex-wrap gap-2">
                    {role.paths.slice(0, 6).map((p) => {
                      const label = AVAILABLE_PATHS.find((a) => a.id === p)?.label || p;
                      return (
                        <span
                          key={p}
                          className="px-2.5 py-1 text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 rounded-md border border-slate-200 dark:border-slate-700"
                        >
                          {label}
                        </span>
                      );
                    })}
                    {role.paths.length > 6 && (
                      <span className="px-2.5 py-1 text-xs font-medium text-slate-500">
                        +{role.paths.length - 6} lainnya
                      </span>
                    )}
                  </div>
                </div>
              )
            )}
          </div>
        );
      })}
    </div>
  );
}
