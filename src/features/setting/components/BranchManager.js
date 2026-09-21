'use client';

import ConfirmModal from '@/components/modal/ConfirmModal';
import { patchHubs } from '@/lib/api/mileapp';
import { toastError, toastSuccess } from '@/lib/toast';
import { useState } from 'react';
import Card from './Card';
import CustomTable from './CustomTable';

const RenderData = ({ item }) => (
  <div
    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${item ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-900 dark:text-slate-400'}`}
  >
    {item ? 'ON' : 'OFF'}
  </div>
);

const RenderEdit = ({ value, onChange }) => (
  <div className="flex justify-center">
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${value ? 'bg-sky-600' : 'bg-gray-200 dark:bg-slate-700'}`}
    >
      <span
        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${value ? 'translate-x-5' : 'translate-x-0'}`}
      />
    </button>
  </div>
);

export default function BranchManager({ hubs, onRefresh, isReadOnly, translate }) {
  const [deleteConfig, setDeleteConfig] = useState({ isOpen: false, id: null, name: null });

  const handleSaveSettings = async (id, editValues) => {
    try {
      const currentHub = hubs.find((h) => h.id === id || h._id === id) || {};

      const safeAcronym =
        editValues.acronym !== undefined
          ? editValues.acronym
            ? String(editValues.acronym).toUpperCase()
            : ''
          : currentHub.acronym || '';

      const safePendingGR =
        editValues.hasPendingGR !== undefined
          ? Boolean(editValues.hasPendingGR)
          : Boolean(currentHub.hasPendingGR);

      const safePartialRouting =
        editValues.hasPartialRouting !== undefined
          ? Boolean(editValues.hasPartialRouting)
          : Boolean(currentHub.hasPartialRouting);

      const safeVms =
        editValues.hasVms !== undefined ? Boolean(editValues.hasVms) : Boolean(currentHub.hasVms);

      const safeActiveHub =
        editValues.isActive !== undefined
          ? Boolean(editValues.isActive)
          : Boolean(currentHub.isActive);

      await patchHubs(id, {
        acronym: safeAcronym,
        hasPendingGR: safePendingGR,
        hasPartialRouting: safePartialRouting,
        hasVms: safeVms,
        isActive: safeActiveHub,
      });

      toastSuccess(translate('common.toast.success'));
      await onRefresh();
    } catch (e) {
      toastError(translate('common.toast.error', { err: e.message }), e);
    }
  };

  const columns = [
    {
      header: 'Status',
      field: 'isActive',
      align: 'center',
      cellClassName: 'text-center',
      render: (item) => <RenderData item={item.isActive} />,
      renderEdit: (value, onChange) => <RenderEdit value={value} onChange={onChange} />,
    },
    {
      header: translate('common.branch'),
      field: 'name',
      render: (item) => (
        <span className="font-semibold text-slate-700 dark:text-slate-200 text-[10px] md:text-sm">
          {item.name}
        </span>
      ),
    },
    {
      header: translate('setting.tab.general.acronym_title'),
      field: 'acronym',
      render: (item) => (
        <span
          className={`text-[10px] md:text-sm font-bold ${item.acronym ? 'text-sky-700 dark:text-sky-400' : 'text-red-500 dark:text-red-400'}`}
        >
          {item.acronym || '-'}
        </span>
      ),
      renderEdit: (value, onChange) => (
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full min-w-0 px-2 py-1 text-[10px] md:text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded outline-none uppercase"
          autoFocus
        />
      ),
    },
    {
      header: 'Pending GR',
      field: 'hasPendingGR',
      align: 'center',
      cellClassName: 'text-center',
      render: (item) => <RenderData item={item.hasPendingGR} />,
      renderEdit: (value, onChange) => <RenderEdit value={value} onChange={onChange} />,
    },
    // {
    //   header: translate('setting.tab.general.partial_routing_title'),
    //   field: 'hasPartialRouting',
    //   align: 'center',
    //   cellClassName: 'text-center',
    //   render: (item) => <RenderData item={item.hasPartialRouting} />,
    //   renderEdit: (value, onChange) => <RenderEdit value={value} onChange={onChange} />,
    // },
    {
      header: translate('setting.tab.general.vms_data_title'),
      field: 'hasVms',
      align: 'center',
      cellClassName: 'text-center',
      render: (item) => <RenderData item={item.hasVms} />,
      renderEdit: (value, onChange) => <RenderEdit value={value} onChange={onChange} />,
    },
  ];

  const msgParts = translate('common.modal.reset_message', { text: '|||' }).split('|||');

  return (
    <Card>
      <ConfirmModal
        isOpen={deleteConfig.isOpen}
        onCancel={() => setDeleteConfig({ isOpen: false, id: null, name: null })}
        onConfirm={async () => {
          await handleSaveSettings(deleteConfig.id, {
            acronym: '',
            hasPendingGR: false,
            hasPartialRouting: false,
            hasVms: false,
          });
          setDeleteConfig({ isOpen: false, id: null, name: null });
        }}
        title={translate('common.modal.reset_title', {
          text: translate('setting.tab.general.branch_title'),
        })}
        message={
          <span>
            {msgParts[0]}
            <strong>{deleteConfig.name}</strong>
            {msgParts[1]}
          </span>
        }
      />

      <div className="mb-4 border-b border-gray-100 dark:border-slate-800 pb-3">
        <h2 className="text-lg font-bold text-gray-900 dark:text-slate-200">
          {translate('setting.tab.general.branch_title')}
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          {translate('setting.tab.general.branch_subtitle')}
        </p>
      </div>

      <CustomTable
        data={hubs}
        columns={columns}
        isReadOnly={isReadOnly}
        containerHeight="h-[408px]"
        translate={translate}
        onSave={handleSaveSettings}
        onDelete={(item) =>
          setDeleteConfig({ isOpen: true, id: item.id || item._id, name: item.name })
        }
      />
    </Card>
  );
}
