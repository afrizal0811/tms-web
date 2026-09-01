// File: src/features/delivery/modal/BunListModal.js
'use client';

import Button from '@/components/Button';
import Modal from '@/components/Modal';
import SearchBar from '@/components/SearchBar';
import CustomTable from '@/components/table/TableData';
import { useState } from 'react';

export default function BunListModal({ isOpen, onClose, bunSoList, onDownload, t }) {
  const [bunSearch, setBunSearch] = useState('');
  const [checkedBunSo, setCheckedBunSo] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: 'vehicle', direction: 'asc' });

  const handleClose = () => {
    setBunSearch('');
    setCheckedBunSo([]);
    onClose();
  };

  const filteredBunList = bunSoList.filter(
    (b) =>
      b.so.toLowerCase().includes(bunSearch.toLowerCase()) ||
      b.customer.toLowerCase().includes(bunSearch.toLowerCase()) ||
      (b.vehicle && b.vehicle.toLowerCase().includes(bunSearch.toLowerCase())) ||
      (b.items && b.items.some((item) => item.toLowerCase().includes(bunSearch.toLowerCase())))
  );

  const handleDownload = () => {
    const allBuns = bunSoList.map((b) => b.so);
    const excludeList = allBuns.filter((so) => !checkedBunSo.includes(so));
    onDownload(excludeList);
    handleClose();
  };

  const searchPlaceholder = `${t('common.license_number')}, ${t('common.customer_name')}, ${t('common.invoice_number')}, ${t('common.items')}`;

  const columns = [
    {
      key: 'checkbox',
      width: 'w-10',
      sortable: false,
      label: (
        <div className="flex justify-center w-full">
          <input
            type="checkbox"
            className="cursor-pointer"
            onChange={(e) => {
              if (e.target.checked) setCheckedBunSo(filteredBunList.map((b) => b.so));
              else setCheckedBunSo([]);
            }}
            checked={
              filteredBunList.length > 0 && checkedBunSo.length === filteredBunList.length
            }
          />
        </div>
      ),
      render: (row) => (
        <div className="flex justify-center w-full">
          <input
            type="checkbox"
            className="cursor-pointer"
            checked={checkedBunSo.includes(row.so)}
            onChange={(e) => {
              if (e.target.checked) setCheckedBunSo((prev) => [...prev, row.so]);
              else setCheckedBunSo((prev) => prev.filter((so) => so !== row.so));
            }}
          />
        </div>
      ),
    },
    {
      key: 'vehicle',
      width: 'w-[15%]',
      sortable: true,
      label: t('common.license_number'),
      render: (row) => (
        <div className="text-xs align-top text-slate-500 dark:text-slate-300 w-full">
          {row.vehicle}
        </div>
      ),
    },
    {
      key: 'so',
      width: 'w-[20%]',
      sortable: true,
      label: t('common.invoice_number'),
      render: (row) => (
        <div className="font-medium align-top whitespace-nowrap text-slate-500 dark:text-slate-300 w-full">
          {row.so}
        </div>
      ),
    },
    {
      key: 'customer',
      width: 'w-[20%]',
      sortable: true,
      label: t('common.customer_name'),
      render: (row) => (
        <div className="align-top text-slate-500 dark:text-slate-300 w-full">
          {row.customer}
        </div>
      ),
    },
    {
      key: 'items',
      width: 'w-[45%]',
      sortable: false,
      label: t('common.items'),
      render: (row) => (
        <div className="text-xs text-slate-500 dark:text-slate-300 align-top w-full">
          <ul className="list-outside list-disc pl-3">
            {row.items.map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
        </div>
      ),
    },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={t('delivery.modal.bun_list')}
      subtitle={t('delivery.modal.bun_list_desc')}
      maxWidth="max-w-5xl lg:max-w-6xl"
      footer={
        <div className="flex justify-end w-full">
          <Button onClick={handleDownload} text={t('common.download')} width="w-full sm:w-auto" />
        </div>
      }
    >
      <div className="flex flex-col gap-3">
        <SearchBar
          value={bunSearch}
          onChange={setBunSearch}
          placeholder={`${t('common.search')} ${searchPlaceholder.toLocaleLowerCase()}`}
          width="w-full"
          className="px-1 py-0.5"
          isTooltip={false}
        />

        <div className="flex justify-between items-center px-1 -my-2">
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {checkedBunSo.length > 0 ? (
              <>
                {t('common.select')}:{' '}
                <span className="font-bold text-sky-500">{checkedBunSo.length}</span>/
                <span className="font-bold text-slate-600 dark:text-slate-300">
                  {filteredBunList.length}
                </span>
              </>
            ) : (
              <>
                Total:{' '}
                <span className="font-bold text-slate-600 dark:text-slate-300">
                  {filteredBunList.length}
                </span>
              </>
            )}
          </span>
        </div>

        <div className="max-h-[60vh] overflow-hidden border border-gray-200 dark:border-slate-700 rounded-lg flex flex-col">
          <CustomTable
            columns={columns}
            data={filteredBunList}
            externalSortConfig={sortConfig}
            onExternalSort={setSortConfig}
          />
        </div>
      </div>
    </Modal>
  );
}
