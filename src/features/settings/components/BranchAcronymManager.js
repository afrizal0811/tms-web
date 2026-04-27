'use client';

import ConfirmModal from '@/components/modal/ConfirmModal';
import { updateHubAcronym } from '@/lib/api';
import { toastError, toastSuccess } from '@/lib/toastHelper';
import { useEffect, useRef, useState } from 'react';
import Card from './Card';

export default function BranchAcronymManager({ hubs, onRefresh, isReadOnly, translate }) {
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [deleteConfig, setDeleteConfig] = useState({ isOpen: false, id: null });
  const editRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        event.target.closest('[role="dialog"]') ||
        event.target.closest('.swal2-container') ||
        event.target.closest('.toast')
      ) {
        return;
      }
      if (editRef.current && !editRef.current.contains(event.target)) {
        setEditingId(null);
        setEditValue('');
      }
    };

    if (editingId) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [editingId]);

  const handleEdit = (hub) => {
    if (isReadOnly) return;
    setEditingId(hub._id || hub.id);
    setEditValue(hub.acronym || '');
  };

  const handleSave = async (id, overrideValue = null) => {
    setIsLoading(true);
    try {
      const valueToSave = overrideValue !== null ? overrideValue : editValue.toUpperCase();

      await updateHubAcronym(id, valueToSave);

      toastSuccess(translate('common.toast.success'));
      setEditingId(null);
      await onRefresh();
    } catch (err) {
      toastError(translate('common.toast.error', { err: err.message }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteClick = (id) => {
    if (isReadOnly) return;
    setDeleteConfig({ isOpen: true, id });
  };

  const confirmDeleteAcronym = async () => {
    const targetId = deleteConfig.id;
    setDeleteConfig({ isOpen: false, id: null });

    if (!targetId) return;
    await handleSave(targetId, '');
  };
  const confirmModalText = translate('setting.tab.general.acronym_title');
  const isUnchanged = (old) => (editValue ?? '').trim() === (old ?? '').trim();

  return (
    <Card>
      <ConfirmModal
        isOpen={deleteConfig.isOpen}
        onCancel={() => setDeleteConfig({ isOpen: false, id: null })}
        onConfirm={confirmDeleteAcronym}
        title={translate('setting.tab.modal.confirm_title', { text: confirmModalText })}
        message={translate('setting.tab.modal.confirm_message', {
          text: confirmModalText.toLowerCase(),
        })}
      />

      <div className=" mb-4 border-b border-gray-100 pb-3 ">
        <h2 className="text-lg font-bold text-gray-900 dark:text-slate-200">
          {translate('setting.tab.general.acronym_title')}
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          {translate('setting.tab.general.acronym_subtitle')}
        </p>
      </div>
      <div className="flex flex-col gap-2 overflow-y-auto pr-1 max-h-72">
        {hubs.map((hub) => {
          const hubId = hub._id || hub.id;
          const isEditing = editingId === hubId;
          const hubAcronym = hub.acronym || '';
          const cardColor = hubAcronym
            ? 'bg-slate-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-md dark:shadow-slate-700/40 hover:bg-slate-100 dark:hover:bg-slate-700/10'
            : 'bg-red-200 dark:bg-red-800 border border-red-400/20 hover:bg-red-300 dark:hover:bg-red-700/90';
          return (
            <div
              key={hubId}
              ref={isEditing ? editRef : null}
              className={`flex items-center justify-between p-3 border rounded-md transition-colors group gap-2 overflow-hidden shrink-0 ${cardColor}`}
            >
              <span className="font-semibold text-slate-700 dark:text-slate-200 text-sm truncate flex-1 mr-2">
                {hub.name}
              </span>

              <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                {isEditing ? (
                  <>
                    <input
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="flex-1 min-w-0 w-20 px-2 py-1 bg-slate-50 dark:bg-slate-700 text-sm font-medium text-slate-900 dark:text-slate-100 border border-slate-400 dark:border-slate-600 rounded outline-none uppercase mr-1"
                      autoFocus
                    />
                    <button
                      onClick={() => handleSave(hubId)}
                      disabled={isLoading || isUnchanged(hubAcronym)}
                      className="text-xs font-bold px-2 py-1 bg-green-100 text-green-700 rounded whitespace-nowrap hover:bg-green-200 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed cursor-pointer transition-colors"
                    >
                      {translate('setting.tab.button.btn_save')}
                    </button>
                  </>
                ) : (
                  <>
                    <span className="text-sm font-bold text-sky-700 dark:text-sky-400 mr-2">
                      {hubAcronym || '-'}
                    </span>
                    {!isReadOnly && (
                      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleEdit(hub)}
                          className="text-xs font-bold px-3 py-1.5 bg-sky-100 text-sky-700 rounded whitespace-nowrap hover:bg-sky-200 cursor-pointer transition-colors"
                        >
                          {translate('setting.tab.button.btn_edit')}
                        </button>
                        <button
                          onClick={() => handleDeleteClick(hubId)}
                          disabled={isLoading || !hubAcronym}
                          className="text-xs font-bold px-3 py-1.5 bg-red-100 text-red-700 rounded whitespace-nowrap hover:bg-red-200 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed cursor-pointer transition-colors"
                        >
                          {translate('setting.tab.button.btn_delete')}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
