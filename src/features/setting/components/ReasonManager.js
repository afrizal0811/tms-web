'use client';

import Button from '@/components/button/Button';
import Dropdown from '@/components/dropdown/Dropdown';
import ConfirmModal from '@/components/modal/ConfirmModal';
import { deleteReason, postReason, updateReason } from '@/lib/api/mileapp';
import { toastError, toastSuccess } from '@/lib/toast';
import { useState } from 'react';
import { CAT_OPTIONS, PIC_OPTIONS } from '../helper/constants';
import Card from './Card';
import CustomTable from './CustomTable';

export default function ReasonManager({ reasons, onRefresh, isReadOnly, translate }) {
  const [newReason, setNewReason] = useState('');
  const [newPic, setNewPic] = useState('');
  const [newCat, setNewCat] = useState('');
  const [deleteConfig, setDeleteConfig] = useState({ isOpen: false, id: null, name: null });

  const handleAddReason = async () => {
    if (!newReason.trim() || !newPic || !newCat || isReadOnly) return;
    try {
      await postReason(newReason, newPic, newCat);
      setNewReason('');
      setNewPic('');
      setNewCat('');
      toastSuccess(translate('common.toast.success'));
      await onRefresh();
    } catch (e) {
      toastError(translate('common.toast.error', { err: e.message }), e);
    }
  };

  const handleUpdateReason = async (id, editValues) => {
    if (!editValues.reasons.trim() || !editValues.pic || !editValues.category || isReadOnly) return;
    try {
      await updateReason(id, editValues.reasons, editValues.pic, editValues.category);
      toastSuccess(translate('common.toast.success'));
      await onRefresh();
    } catch (e) {
      toastError(translate('common.toast.error', { err: e.message }), e);
      throw e;
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
    } catch (e) {
      toastError(translate('common.toast.error', { err: e.message }), e);
    }
  };

  const columns = [
    {
      header: translate('setting.tab.general.category'),
      field: 'category',
      headerClassName: 'w-24 sm:w-32 md:w-48',
      render: (item) => (
        <span className="text-[10px] md:text-xs font-medium text-slate-700 dark:text-slate-300">
          {item.category}
        </span>
      ),
      renderEdit: (value, onChange) => (
        <Dropdown
          options={CAT_OPTIONS.map((opt) => ({ label: opt, value: opt }))}
          value={value}
          onChange={onChange}
          getLabel={(val) => val || '-'}
          size="sm"
          className="w-full min-w-0"
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
        <Dropdown
          options={PIC_OPTIONS.map((opt) => ({ label: opt, value: opt }))}
          value={value}
          onChange={onChange}
          getLabel={(val) => val || '-'}
          size="sm"
          className="w-full min-w-0"
        />
      ),
    },
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
  ];
  const msgParts = translate('common.modal.delete_message', { text: '|||' }).split('|||');

  return (
    <Card>
      <ConfirmModal
        isOpen={deleteConfig.isOpen}
        onCancel={() => setDeleteConfig({ isOpen: false, id: null, name: null })}
        onConfirm={confirmDeleteReason}
        title={translate('common.modal.delete_title', {
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
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-2 mb-4 w-full">
          <input
            type="text"
            value={newReason}
            onChange={(e) => setNewReason(e.target.value)}
            placeholder={translate('setting.tab.general.add_placeholder')}
            className="col-span-1 sm:col-span-2 md:col-span-5 min-w-0 w-full px-3 py-2 text-xs sm:text-sm text-slate-900 dark:text-slate-100 border border-gray-300 dark:border-slate-700 rounded-md outline-none focus:border-sky-500 dark:focus:border-slate-500 focus:ring-1 focus:ring-sky-500 dark:focus:ring-slate-500 bg-white dark:bg-slate-800"
          />
          <div className="col-span-1 sm:col-span-1 md:col-span-3 min-w-0 w-full">
            <Dropdown
              options={CAT_OPTIONS.map((opt) => ({ label: opt, value: opt }))}
              value={newCat}
              onChange={setNewCat}
              getLabel={(val) => val || translate('setting.tab.general.select_category')}
              size="md"
              className="w-full min-w-0"
            />
          </div>
          <div className="col-span-1 sm:col-span-1 md:col-span-3 min-w-0 w-full">
            <Dropdown
              options={PIC_OPTIONS.map((opt) => ({ label: opt, value: opt }))}
              value={newPic}
              onChange={setNewPic}
              getLabel={(val) => val || translate('setting.tab.general.select_pic')}
              size="md"
              className="w-full min-w-0"
            />
          </div>
          <div className="col-span-1 sm:col-span-2 md:col-span-1 min-w-0 w-full">
            <Button
              onClick={handleAddReason}
              disabled={!newReason.trim() || !newPic || !newCat}
              size="md"
              text={translate('common.button.btn_add')}
              width="w-full h-full"
            />
          </div>
        </div>
      )}

      <CustomTable
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
