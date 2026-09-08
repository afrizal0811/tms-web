'use client';

import Button from '@/components/button/Button';
import Dropdown from '@/components/dropdown/Dropdown';
import Modal from '@/components/modal/Modal';
import TableData from '@/components/table/TableData';
import { capitalizeText } from '@/lib/utils';

export default function SyncModal({
  isOpen,
  mismatchedData,
  onMismatchedChange,
  onSave,
  mcEasyDrivers,
  isDriverLoading,
  isSaving,
  translate,
}) {
  return (
    <Modal
      isOpen={isOpen}
      noClose={true}
      title={translate('common.warning')}
      subtitle={translate('setting.tab.modal.sync_subtitle')}
      maxWidth="max-w-6xl"
      footer={
        <div className="flex justify-end gap-3">
          <Button
            onClick={onSave}
            isLoading={isSaving}
            disabled={!mismatchedData.some((m) => m.isUpdated)}
            text={translate('common.button.btn_save')}
            width="w-auto"
          />
        </div>
      }
    >
      <div className="h-[60vh]">
        <TableData
          subHeaders={true}
          columns={[
            { label: 'No.', key: 'no', align: 'center', width: 'w-12', render: (_, i) => i + 1 },
            {
              label: 'MileApp',
              subColumns: [
                {
                  label: translate('common.driver'),
                  key: 'maNameClean',
                  render: (row) => <span>{capitalizeText(row.maNameClean)}</span>,
                },
                { label: translate('common.license_number'), key: 'maPlat' },
              ],
            },
            {
              label: 'McEasy',
              subColumns: [
                {
                  label: translate('common.driver'),
                  key: 'mcName',
                  render: (row) => {
                    const isMismatch = row.mcName?.toLowerCase() !== row.maNameClean?.toLowerCase();
                    if (!isMismatch) return <span>{row.mcName}</span>;
                    return (
                      <div className="min-w-36">
                        <Dropdown
                          options={mcEasyDrivers}
                          value={
                            row.updatedDriverId !== undefined
                              ? row.updatedDriverId
                              : row.vmsDriverId || null
                          }
                          onChange={(val) => onMismatchedChange(row.id, 'updatedDriverId', val)}
                          isAutocomplete={true}
                          disabled={isDriverLoading}
                          getLabel={(val) =>
                            mcEasyDrivers.find((opt) => opt.value === val)?.label || row.mcName
                          }
                          size="sm"
                        />
                      </div>
                    );
                  },
                },
                {
                  label: translate('common.license_number'),
                  key: 'mcPlat',
                  render: (row) => {
                    const isMismatch =
                      row.mcPlat?.replace(/\s+/g, '')?.toUpperCase() !==
                      row.maPlatBase?.replace(/\s+/g, '')?.toUpperCase();
                    if (!isMismatch) return <span>{row.mcPlat}</span>;
                    return (
                      <input
                        type="text"
                        className="w-full min-w-28 px-2 py-1.5 text-xs border border-red-300 dark:border-red-500/50 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-sky-500"
                        placeholder={row.mcPlat}
                        value={row.updatedPlat !== undefined ? row.updatedPlat : ''}
                        onChange={(e) => onMismatchedChange(row.id, 'updatedPlat', e.target.value)}
                      />
                    );
                  },
                },
              ],
            },
          ]}
          data={mismatchedData.map((m, i) => ({ ...m, _id: i }))}
        />
      </div>
    </Modal>
  );
}
