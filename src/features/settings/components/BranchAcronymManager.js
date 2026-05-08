'use client';

import ConfirmModal from '@/components/modal/ConfirmModal';
import { updateHubAcronym } from '@/lib/api';
import { toastError, toastSuccess } from '@/lib/toastHelper';
import { useState } from 'react';
import Card from './Card';
import Table from './Table';

export default function BranchAcronymManager({ hubs, onRefresh, isReadOnly, translate }) {
  const [deleteConfig, setDeleteConfig] = useState({ isOpen: false, id: null });

  const handleSaveAcronym = async (id, overrideValue) => {
    try {
      await updateHubAcronym(id, overrideValue.toUpperCase());
      toastSuccess(translate('common.toast.success'));
      await onRefresh();
    } catch (err) {
      toastError(translate('common.toast.error', { err: err.message }));
      throw err;
    }
  };

  const confirmDeleteAcronym = async () => {
    const targetId = deleteConfig.id;
    setDeleteConfig({ isOpen: false, id: null });
    if (!targetId) return;
    await handleSaveAcronym(targetId, '');
  };

  const columns = [
    {
      header: 'Cabang',
      field: 'name',
      render: (item) => (
        <span className="font-semibold text-slate-700 dark:text-slate-200 text-[10px] md:text-sm">
          {item.name}
        </span>
      ),
    },
    {
      header: 'Akronim',
      field: 'acronym',
      headerClassName: 'w-24 md:w-32',
      render: (item) => (
        <span
          className={`text-[10px] md:text-sm font-bold ${item.acronym ? 'text-sky-700 dark:text-sky-400' : 'text-red-500 dark:text-red-400'}`}
        >
          {item.acronym || '-'}
        </span>
      ),
      renderEdit: (value, onChange, onSave) => (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSave()}
          className="w-16 md:w-20 px-2 py-1 text-[10px] md:text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded outline-none uppercase"
          autoFocus
        />
      ),
    },
  ];

  const confirmModalText = translate('setting.tab.general.acronym_title');

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

      <div className="mb-4 border-b border-gray-100 pb-3">
        <h2 className="text-lg font-bold text-gray-900 dark:text-slate-200">
          {translate('setting.tab.general.acronym_title')}
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          {translate('setting.tab.general.acronym_subtitle')}
        </p>
      </div>

      <Table
        data={hubs}
        columns={columns}
        isReadOnly={isReadOnly}
        containerHeight="h-[408px]"
        translate={translate}
        rowClassName={(item) =>
          item.acronym
            ? 'hover:bg-gray-50 dark:hover:bg-slate-700/50'
            : 'bg-red-50/50 dark:bg-red-900/10 hover:bg-red-50 dark:hover:bg-red-900/20'
        }
        disableDelete={(item) => !item.acronym}
        onSave={async (id, editValues) => await handleSaveAcronym(id, editValues.acronym)}
        onDelete={(item) => setDeleteConfig({ isOpen: true, id: item._id || item.id })}
      />
    </Card>
  );
}
