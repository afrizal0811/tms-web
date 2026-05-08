'use client';

import Spinner from '@/components/Spinner';
import { useEffect, useRef, useState } from 'react';

const EditIcon = () => (
  <svg
    className="w-3.5 h-3.5 md:w-4 md:h-4"
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
    className="w-3.5 h-3.5 md:w-4 md:h-4"
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

const SaveIcon = () => (
  <svg
    className="w-3.5 h-3.5 md:w-4 md:h-4"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

export default function EditableTable({
  data,
  columns,
  isReadOnly,
  onSave,
  onDelete,
  isLoading,
  emptyMessage = 'Tidak ada data',
  keyField = 'id',
  containerHeight = 'h-[352px]',
  rowClassName,
  disableDelete,
  translate,
}) {
  const [editId, setEditId] = useState(null);
  const [editValues, setEditValues] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const editRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        event.target.closest('[role="dialog"]') ||
        event.target.closest('.swal2-container') ||
        event.target.closest('.toast')
      )
        return;
      if (editRef.current && !editRef.current.contains(event.target)) {
        setEditId(null);
      }
    };
    if (editId) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [editId]);

  const handleEditClick = (item) => {
    const id = item[keyField] || item._id;
    setEditId(id);
    const initialValues = {};
    columns.forEach((col) => {
      if (col.field) initialValues[col.field] = item[col.field] || '';
    });
    setEditValues(initialValues);
  };

  const handleValueChange = (field, value) => {
    setEditValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveClick = async (item) => {
    setIsSaving(true);
    try {
      const id = item[keyField] || item._id;
      await onSave(id, editValues, item);
      setEditId(null);
    } catch (e) {
      // Parent component (misal: memunculkan toastError) yang akan handle logikanya
    } finally {
      setIsSaving(false);
    }
  };

  const isUnchanged = (item) => {
    return columns.every((col) => {
      if (!col.field || !col.renderEdit) return true;
      return String(editValues[col.field] || '').trim() === String(item[col.field] || '').trim();
    });
  };

  return (
    <div
      className={`overflow-y-auto ${containerHeight} border border-gray-200 dark:border-slate-700 rounded-lg`}
    >
      {isLoading ? (
        <div className="py-8 flex justify-center items-center h-full">
          <Spinner />
        </div>
      ) : (
        <table className="min-w-full text-left border-collapse whitespace-nowrap">
          <thead className="sticky top-0 bg-gray-100 dark:bg-slate-900 z-10 border-b border-gray-200 dark:border-slate-700">
            <tr>
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  className={`px-4 py-3 text-[10px] md:text-xs font-bold text-slate-600 dark:text-slate-400 ${col.headerClassName || ''}`}
                >
                  {col.header}
                </th>
              ))}
              {!isReadOnly && (
                <th className="px-4 py-3 text-[10px] md:text-xs font-bold text-slate-600 dark:text-slate-400 w-20 text-center">
                  Aksi
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-slate-700 bg-white dark:bg-slate-800">
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (isReadOnly ? 0 : 1)}
                  className="text-center text-slate-500 text-sm py-4 italic"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((item, idx) => {
                const id = item[keyField] || item._id;
                const isEditing = editId === id;
                const trClass = rowClassName
                  ? rowClassName(item)
                  : 'hover:bg-gray-50 dark:hover:bg-slate-700/50';

                return (
                  <tr
                    key={id || idx}
                    ref={isEditing ? editRef : null}
                    className={`group transition-colors ${trClass}`}
                  >
                    {columns.map((col, cIdx) => (
                      <td key={cIdx} className={`px-4 py-2 ${col.cellClassName || ''}`}>
                        {isEditing && col.renderEdit
                          ? col.renderEdit(
                              editValues[col.field] ?? '',
                              (val) => handleValueChange(col.field, val),
                              () => handleSaveClick(item),
                              item
                            )
                          : col.render(item)}
                      </td>
                    ))}
                    {!isReadOnly && (
                      <td className="px-4 py-2 text-center">
                        <div className="flex items-center justify-center gap-1.5 md:gap-2">
                          {isEditing ? (
                            <button
                              onClick={() => handleSaveClick(item)}
                              disabled={isSaving || isUnchanged(item)}
                              className="p-1.5 bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/40 dark:text-green-400 dark:hover:bg-green-900/60 rounded transition-colors disabled:opacity-50 cursor-pointer"
                              title={translate('common.button.btn_save')}
                            >
                              <SaveIcon />
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={() => handleEditClick(item)}
                                className="p-1.5 bg-sky-100 text-sky-700 hover:bg-sky-200 dark:bg-sky-900/40 dark:text-sky-400 dark:hover:bg-sky-900/60 rounded transition-colors opacity-100 md:opacity-0 group-hover:opacity-100 cursor-pointer"
                                title={translate('setting.tab.button.btn_edit')}
                              >
                                <EditIcon />
                              </button>
                              <button
                                onClick={() => onDelete(item)}
                                disabled={disableDelete ? disableDelete(item) : false}
                                className="p-1.5 bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/40 dark:text-red-400 dark:hover:bg-red-900/60 rounded transition-colors opacity-100 md:opacity-0 group-hover:opacity-100 disabled:opacity-50 cursor-pointer"
                                title={translate('common.button.btn_delete')}
                              >
                                <DeleteIcon />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
