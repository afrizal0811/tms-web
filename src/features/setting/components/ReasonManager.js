'use client';

import ConfirmModal from '@/components/modal/ConfirmModal';
import { deleteReason, postReason, updateReason } from '@/lib/api';
import { toastError, toastSuccess } from '@/lib/toast';
import { useState } from 'react';
import { PIC_OPTIONS } from '../helper/constants';
import Card from './Card';
import Table from './Table';

export default function ReasonManager({ reasons, onRefresh, isReadOnly, translate }) {
  const [newReason, setNewReason] = useState('');
  const [newPic, setNewPic] = useState('');
  const [deleteConfig, setDeleteConfig] = useState({ isOpen: false, id: null, name: null });

  const handleAddReason = async () => {
    if (!newReason.trim() || !newPic || isReadOnly) return;
    try {
      await postReason(newReason, newPic);
      setNewReason('');
      setNewPic('');
      toastSuccess(translate('common.toast.success'));
      await onRefresh();
    } catch (err) {
      toastError(translate('common.toast.error', { err: err.message }));
    }
  };

  const handleUpdateReason = async (id, editValues) => {
    if (!editValues.reasons.trim() || !editValues.pic || isReadOnly) return;
    try {
      await updateReason(id, editValues.reasons, editValues.pic);
      toastSuccess(translate('common.toast.success'));
      await onRefresh();
    } catch (err) {
      toastError(translate('common.toast.error', { err: err.message }));
      throw err;
    }
  };

  const confirmDeleteReason = async () => {
    const targetId = deleteConfig.id;
    setDeleteConfig({
      isOpen: false,
      id: null,
      name: null,
      reason: '',
    });
    if (!targetId) return;
    try {
      await deleteReason(targetId);
      toastSuccess(translate('common.toast.success'));
      await onRefresh();
    } catch (err) {
      toastError(translate('common.toast.error', { err: err.message }));
    }
  };

  const columns = [
    {
      header: translate('setting.tab.general.reasons_title'),
      field: 'reasons',
      render: (item) => (
        <span className="font-semibold text-slate-700 dark:text-slate-200 text-[10px] md:text-sm">
          {item.reasons}
        </span>
      ),
      renderEdit: (value, onChange, onSave) => (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSave()}
          className="w-full min-w-0 px-2 py-1 text-[10px] md:text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded outline-none"
          autoFocus
        />
      ),
    },
    {
      header: 'PIC',
      field: 'pic',
      headerClassName: 'w-24 sm:w-32 md:w-48',
      render: (item) => (
        <span className="text-[10px] md:text-xs font-medium text-slate-700 dark:text-slate-300">
          {item.pic}
        </span>
      ),
      renderEdit: (value, onChange) => (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full min-w-0 px-1 py-1 text-[10px] md:text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded outline-none cursor-pointer"
        >
          {PIC_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      ),
    },
  ];
  const msgParts = translate('common.modal.confirm_message', { text: '|||' }).split('|||');

  return (
    <Card>
      <ConfirmModal
        isOpen={deleteConfig.isOpen}
        onCancel={() => setDeleteConfig({ isOpen: false, id: null, name: null })}
        onConfirm={confirmDeleteReason}
        title={translate('common.modal.confirm_title', {
          text: translate('setting.tab.general.reasons_title'),
        })}
        message={
          <span>
            {msgParts[0]}
            <strong>{deleteConfig.reason}</strong>
            {msgParts[1]}
          </span>
        }
      />

      <div className="mb-4 border-b border-gray-100 pb-3">
        <h2 className="text-lg font-bold text-gray-900 dark:text-slate-200">
          {translate('setting.tab.general.reasons_title')}
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          {translate('setting.tab.general.reasons_subtitle')}
        </p>
      </div>

      {!isReadOnly && (
        <div className="flex gap-1.5 sm:gap-2 mb-4 w-full">
          <input
            type="text"
            value={newReason}
            onChange={(e) => setNewReason(e.target.value)}
            placeholder={translate('setting.tab.general.add_placeholder')}
            className="flex-1 min-w-0 px-2 sm:px-3 py-2 text-[10px] sm:text-sm text-slate-900 dark:text-slate-100 border border-gray-300 dark:border-slate-700 rounded-md outline-none focus:border-sky-500 dark:focus:border-slate-500 focus:ring-1 focus:ring-sky-500 dark:focus:ring-slate-500 bg-white dark:bg-slate-800"
          />
          <select
            value={newPic}
            onChange={(e) => setNewPic(e.target.value)}
            className="w-[85px] sm:w-28 md:w-48 min-w-0 shrink-0 px-1 sm:px-3 py-2 text-[10px] sm:text-sm text-slate-900 dark:text-slate-100 border border-gray-300 dark:border-slate-700 rounded-md outline-none focus:border-sky-500 dark:focus:border-slate-500 focus:ring-1 focus:ring-sky-500 dark:focus:ring-slate-500 bg-white dark:bg-slate-800 cursor-pointer"
          >
            <option disabled value="">
              {translate('setting.tab.general.select_placeholder')}
            </option>
            {PIC_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
          <button
            onClick={handleAddReason}
            disabled={!newReason.trim() || !newPic}
            className="shrink-0 px-2.5 sm:px-3 py-2 text-[12px] sm:text-sm font-bold text-white bg-sky-600 rounded-md hover:bg-sky-700 disabled:bg-gray-400 cursor-pointer"
          >
            <span className="hidden sm:inline">{translate('common.button.btn_add')}</span>
            <span className="sm:hidden text-sm leading-none">+</span>
          </button>
        </div>
      )}

      <Table
        data={reasons}
        columns={columns}
        isReadOnly={isReadOnly}
        emptyMessage={translate('common.no_data')}
        translate={translate}
        onSave={handleUpdateReason}
        onDelete={(item) => setDeleteConfig({ isOpen: true, id: item.id, reason: item.reasons })}
      />
    </Card>
  );
}
