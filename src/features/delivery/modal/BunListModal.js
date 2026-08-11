// File: src/features/delivery/modal/BunListModal.js
'use client';

import BaseModal from '@/components/BaseModal';
import Button from '@/components/Button';
import SearchBar from '@/components/SearchBar';
import { useState } from 'react';

export default function BunListModal({ isOpen, onClose, bunSoList, onDownload, t }) {
  const [bunSearch, setBunSearch] = useState('');
  const [checkedBunSo, setCheckedBunSo] = useState([]);

  const handleClose = () => {
    setBunSearch('');
    setCheckedBunSo([]);
    onClose();
  };

  const filteredBunList = bunSoList.filter(
    (b) =>
      b.so.toLowerCase().includes(bunSearch.toLowerCase()) ||
      b.customer.toLowerCase().includes(bunSearch.toLowerCase())
  );

  const handleDownload = () => {
    const allBuns = bunSoList.map((b) => b.so);
    const excludeList = allBuns.filter((so) => !checkedBunSo.includes(so));
    onDownload(excludeList);
    handleClose();
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={handleClose}
      title={
        <div className="flex flex-col gap-0.5">
          <span>{t('delivery.modal.bun_list')}</span>
          <span className="text-sm font-normal text-slate-600 dark:text-slate-400">
            {t('delivery.modal.bun_list_desc')}
          </span>
        </div>
      }
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
          placeholder={t('delivery.search_placeholder')}
          width="w-full"
          className="px-1 py-0.5"
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

        <div className="max-h-[60vh] overflow-auto border border-gray-200 dark:border-slate-700 rounded-lg">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 dark:bg-slate-900 sticky top-0">
              <tr>
                <th className="p-3 w-10 text-center">
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
                </th>
                <th className="p-3">{t('common.license_number')}</th>
                <th className="p-3">{t('common.so_number')}</th>
                <th className="p-3">{t('common.customer_name')}</th>
                <th className="p-3">{t('common.items')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
              {filteredBunList.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-slate-500 italic">
                    {t('common.no_data')}
                  </td>
                </tr>
              ) : (
                filteredBunList.map((b, i) => (
                  <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                    <td className="p-3 text-center align-top">
                      <input
                        type="checkbox"
                        className="cursor-pointer"
                        checked={checkedBunSo.includes(b.so)}
                        onChange={(e) => {
                          if (e.target.checked) setCheckedBunSo((prev) => [...prev, b.so]);
                          else setCheckedBunSo((prev) => prev.filter((so) => so !== b.so));
                        }}
                      />
                    </td>
                    <td className="p-3 text-xs align-top text-slate-500 dark:text-slate-300">
                      {b.vehicle}
                    </td>
                    <td className="p-3 font-medium align-top whitespace-nowrap text-slate-500 dark:text-slate-300">
                      {b.so}
                    </td>
                    <td className="p-3 align-top text-slate-500 dark:text-slate-300">
                      {b.customer}
                    </td>
                    <td className="p-3 text-xs text-slate-500 dark:text-slate-300 align-top">
                      <ul className="list-outside list-disc pl-3">
                        {b.items.map((item, idx) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </BaseModal>
  );
}
