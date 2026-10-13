'use client';

import Button from '@/components/button/Button';
import ConfirmModal from '@/components/modal/ConfirmModal';
import SearchBar from '@/components/SearchBar';
import { patchRolePaths } from '@/lib/api/mileapp';
import { toastError, toastSuccess } from '@/lib/toast';
import { capitalizeText } from '@/lib/utils';
import { useMemo, useState } from 'react';
import { AVAILABLE_PATHS } from '@/lib/navigation';

const EditIcon = () => (
  <svg
    className="w-4 h-4"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
    />
  </svg>
);

const DeleteIcon = () => (
  <svg
    className="w-4 h-4"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
    />
  </svg>
);

function groupPaths(paths) {
  const groups = new Map();
  for (const path of paths) {
    let moduleName = path.group || null;
    if (!moduleName) {
      if (path.id.includes('.')) {
        moduleName = path.id.split('.')[0];
      } else if (path.label.includes(' - ')) {
        moduleName = path.label.split(' - ')[0].trim();
      }
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
      className="w-4 h-4 text-sky-600 border-gray-300 rounded focus:ring-2 focus:ring-sky-500 dark:focus:ring-sky-600 dark:bg-slate-700 dark:border-slate-600 cursor-pointer shrink-0"
    />
  );
}

function PermissionCheckbox({ checked, label, onChange }) {
  return (
    <label
      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border text-xs sm:text-sm cursor-pointer select-none transition-all duration-150 ${
        checked
          ? 'bg-sky-50/90 border-sky-300 text-sky-900 font-medium dark:bg-sky-950/40 dark:border-sky-800 dark:text-sky-300 shadow-xs ring-1 ring-sky-300/40 dark:ring-sky-800/40'
          : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300 dark:bg-slate-800/40 dark:border-slate-700/80 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="w-4 h-4 text-sky-600 border-gray-300 rounded focus:ring-2 focus:ring-sky-500 dark:focus:ring-sky-600 dark:ring-offset-slate-800 dark:bg-slate-700 dark:border-slate-600 cursor-pointer shrink-0"
      />
      <span className="truncate">{label}</span>
    </label>
  );
}

export default function PermissionTab({ roles, onRefresh, isReadOnly, translate }) {
  const [editingId, setEditingId] = useState(null);
  const [selectedPaths, setSelectedPaths] = useState([]);
  const [initialPaths, setInitialPaths] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [query, setQuery] = useState('');
  const [deleteData, setDeleteData] = useState({ isOpen: false, id: null, name: '' });
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

  const handleSelectAll = () => {
    setSelectedPaths(allIds);
  };

  const handleDeselectAll = () => {
    setSelectedPaths([]);
  };

  const handleSave = async (id) => {
    setIsSaving(true);
    try {
      const finalPaths = selectedPaths.length === allIds.length ? [] : selectedPaths;
      await patchRolePaths(id, finalPaths);
      toastSuccess(translate('common.toast.success') || 'Akses diperbarui');
      await onRefresh();
      setEditingId(null);
    } catch (e) {
      toastError(translate('common.toast.error', { err: e.message }), e);
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteData.id) return;
    setIsSaving(true);
    try {
      await patchRolePaths(deleteData.id, []);
      toastSuccess(translate('common.toast.success'));
      await onRefresh();
      setEditingId(null);
    } catch (e) {
      toastError(translate('common.toast.error', { err: e.message }), e);
    } finally {
      setIsSaving(false);
      setDeleteData({ isOpen: false, id: null, name: '' });
    }
  };

  const handleDeleteClick = (role) => {
    setDeleteData({
      isOpen: true,
      id: role._id || role.id,
      name: capitalizeText(role.name),
    });
  };

  const title = translate('setting.tab.permission.title') || 'Hak Akses';
  const msgParts = translate('common.modal.reset_message', { text: '|||' }).split('|||');

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      <ConfirmModal
        isOpen={deleteData.isOpen}
        onCancel={() => setDeleteData({ isOpen: false, id: null, name: '' })}
        onConfirm={confirmDelete}
        title={translate('common.modal.reset_title', { text: title })}
        message={
          <span>
            {msgParts[0]}
            <strong>{deleteData.name}</strong>
            {msgParts[1]}
          </span>
        }
      />
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

        if (isEditing) {
          return (
            <div
              key={id}
              className="col-span-full bg-white dark:bg-slate-900 border border-sky-400/80 dark:border-sky-500/70 shadow-lg ring-2 ring-sky-500/15 rounded-xl transition-all duration-200 overflow-hidden"
            >
              {/* Header Edit */}
              <div className="px-4 py-3 sm:px-5 sm:py-3.5 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-800/30 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h3 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100">
                    {capitalizeText(role.name)}
                  </h3>
                  <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    {selectedPaths.length === allIds.length
                      ? `${translate('common.all')} ${translate('setting.tab.permission.access')}`
                      : `${selectedPaths.length}/${allIds.length} ${translate('setting.tab.permission.access')}`}
                  </span>
                  {hasUnsavedChanges && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-medium rounded-full bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                      {translate('setting.tab.permission.unsave_changes')}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    disabled={isSaving}
                    isLoading={isSaving}
                    onClick={handleCancel}
                    size="sm"
                    text={translate('common.button.btn_cancel')}
                    className="text-red-600 bg-red-100 hover:bg-red-200 dark:bg-red-700 dark:text-red-300 dark:hover:bg-red-600"
                  />
                  <Button
                    disabled={isSaving || !hasUnsavedChanges}
                    isLoading={isSaving}
                    onClick={() => handleSave(id)}
                    size="sm"
                    text={translate('common.button.btn_save')}
                  />
                </div>
              </div>

              {/* Toolbar Controls */}
              <div className="px-4 py-3 sm:px-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/60 bg-white dark:bg-slate-900">
                <div className="w-full sm:w-72 md:w-80">
                  <SearchBar
                    value={query}
                    onChange={setQuery}
                    placeholder={translate('common.search')}
                    width="w-full"
                    size="sm"
                  />
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-2.5 text-xs">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">
                    {translate('setting.tab.permission.selected_count', {
                      count: selectedPaths.length,
                      total: allIds.length,
                    }) || `${selectedPaths.length} dari ${allIds.length} dipilih`}
                  </span>
                  <div className="h-3.5 w-px bg-slate-200 dark:bg-slate-700" />
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300 font-medium cursor-pointer transition-colors"
                  >
                    {translate('setting.tab.permission.select_all') || 'Pilih Semua'}
                  </button>
                  <span className="text-slate-300 dark:text-slate-600">·</span>
                  <button
                    type="button"
                    onClick={handleDeselectAll}
                    className="text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 font-medium cursor-pointer transition-colors"
                  >
                    {translate('setting.tab.permission.deselect_all') || 'Hapus Semua'}
                  </button>
                </div>
              </div>

              {/* Grouped Permission Items Grid */}
              <div className="p-4 sm:p-5 max-h-[500px] overflow-y-auto space-y-3.5">
                {filteredGroups.length === 0 ? (
                  <div className="py-8 text-center">
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {translate('common.no_data')}
                    </p>
                  </div>
                ) : isFlat ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
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
                  filteredGroups.map((group) => {
                    const groupIds = group.items.map((p) => p.id);
                    const allChecked = groupIds.every((gid) => selectedPaths.includes(gid));
                    const someChecked =
                      !allChecked && groupIds.some((gid) => selectedPaths.includes(gid));
                    const selectedInGroup = groupIds.filter((gid) =>
                      selectedPaths.includes(gid)
                    ).length;

                    return (
                      <div
                        key={group.name}
                        className="border border-slate-200 dark:border-slate-700/80 rounded-lg overflow-hidden bg-white dark:bg-slate-900/60 shadow-xs"
                      >
                        <div className="flex items-center justify-between px-3.5 py-2 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700/80 select-none">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <GroupCheckbox
                              allChecked={allChecked}
                              someChecked={someChecked}
                              onChange={() => handleToggleGroup(group.items, !allChecked)}
                            />
                            <span className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200">
                              {group.name}
                            </span>
                            <span className="px-2 py-0.2 text-[11px] font-medium rounded-full bg-slate-200/70 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                              {selectedInGroup}/{groupIds.length}
                            </span>
                          </label>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 p-3 bg-white dark:bg-slate-900/40">
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
                  })
                )}
              </div>
            </div>
          );
        }

        return (
          <div
            key={id}
            className="rounded-xl border transition-all duration-200 bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800 shadow-sm hover:border-sky-300 dark:hover:border-slate-600 flex flex-col justify-between"
          >
            <div className="p-4 pb-2.5 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-semibold text-slate-800 dark:text-slate-100 truncate">
                  {capitalizeText(role.name)}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={`px-2 py-0.5 text-xs font-medium rounded-full border ${
                      isDefault
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200/70 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/70'
                        : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                    }`}
                  >
                    {isDefault
                      ? `${translate('common.all')} ${translate('setting.tab.permission.access')}`
                      : `${activeCount}/${allIds.length} ${translate('setting.tab.permission.access')}`}
                  </span>
                </div>
              </div>

              {!isReadOnly && (
                <div className="flex items-center gap-1 shrink-0">
                  {!isDefault && (
                    <button
                      onClick={() => handleDeleteClick(role)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
                      title="Reset Akses"
                    >
                      <DeleteIcon />
                    </button>
                  )}
                  <button
                    onClick={() => handleEdit(role)}
                    className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 dark:hover:text-sky-400 dark:hover:bg-sky-950/40 rounded-lg transition-colors cursor-pointer"
                    title="Edit Akses"
                  >
                    <EditIcon />
                  </button>
                </div>
              )}
            </div>

            <div className="px-4 pb-4 pt-1">
              {isDefault ? (
                <p className="text-xs text-slate-400 dark:text-slate-500 italic">
                  {translate('setting.tab.permission.default_hint')}
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {role.paths.slice(0, 5).map((p) => {
                    const label = AVAILABLE_PATHS.find((a) => a.id === p)?.label || p;
                    return (
                      <span
                        key={p}
                        className="px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 rounded-md border border-slate-200 dark:border-slate-700"
                      >
                        {label}
                      </span>
                    );
                  })}
                  {role.paths.length > 5 && (
                    <span className="px-2 py-0.5 text-xs font-medium text-slate-400 self-center">
                      +{role.paths.length - 5} {translate('common.others')}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
