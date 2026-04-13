'use client';

import { toastError, toastSuccess } from '@/lib/toastHelper';
import { updateHubAcronym } from '@/lib/api';
import { useEffect, useRef, useState } from 'react';

export default function BranchAcronymManager({ hubs, onRefresh, isReadOnly, translate }) {
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
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

  const handleDelete = (id) => {
    if (isReadOnly) return;
    handleSave(id, '');
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex flex-col w-full">
      <h2 className="text-lg font-bold text-slate-800 mb-4 border-b border-gray-100 pb-3">
        {translate('setting.tab.general.acronym_title')}
      </h2>
      <div className="flex flex-col gap-2 overflow-y-auto pr-1 max-h-72">
        {hubs.map((hub) => {
          const hubId = hub._id || hub.id;
          const isEditing = editingId === hubId;

          return (
            <div
              key={hubId}
              ref={isEditing ? editRef : null}
              className="flex items-center justify-between p-3 border border-gray-200 rounded-md bg-slate-50 hover:bg-white transition-colors group gap-2 overflow-hidden shrink-0"
            >
              <span
                className="font-semibold text-slate-700 text-sm truncate flex-1 mr-2"
                title={hub.name}
              >
                {hub.name}
              </span>

              <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                {isEditing ? (
                  <>
                    <input
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="flex-1 min-w-0 w-20 px-2 py-1 border border-sky-400 rounded outline-none text-sm font-medium mr-1 uppercase"
                      autoFocus
                      onKeyDown={(e) => e.key === 'Enter' && handleSave(hubId)}
                    />
                    <button
                      onClick={() => handleSave(hubId)}
                      disabled={isLoading}
                      className="text-xs bg-green-100 text-green-700 hover:bg-green-200 font-bold px-2 py-1 rounded cursor-pointer disabled:opacity-50"
                    >
                      {translate('setting.tab.general.btn_save')}
                    </button>
                  </>
                ) : (
                  <>
                    <span className="text-sm font-bold text-sky-700 mr-2">{hub.acronym || ''}</span>
                    {!isReadOnly && (
                      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleEdit(hub)}
                          className="text-xs bg-sky-100 text-sky-700 hover:bg-sky-200 font-bold px-3 py-1.5 rounded cursor-pointer transition-colors whitespace-nowrap"
                        >
                          {translate('setting.tab.general.btn_edit')}
                        </button>
                        <button
                          onClick={() => handleDelete(hubId)}
                          disabled={isLoading || !hub.acronym}
                          className="text-xs bg-red-100 text-red-700 hover:bg-red-200 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed font-bold px-3 py-1.5 rounded cursor-pointer transition-colors whitespace-nowrap"
                        >
                          {translate('setting.tab.general.btn_delete')}
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
    </div>
  );
}
