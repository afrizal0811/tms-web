'use client';

import Modal from '@/components/Modal';
import { useLanguage } from '@/context/LanguageContext';
import { formatDateUniversal, isEmpty } from '@/lib/utils';
import { useState } from 'react';
export default function RoutingInfo({ resultsData }) {
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useLanguage();
  const validResults = resultsData
    .filter((r) => r.dispatchStatus && String(r.dispatchStatus).toLowerCase() === 'done')
    .sort((a, b) => {
      const timeA = a.createdTime ? new Date(a.createdTime).getTime() : 0;
      const timeB = b.createdTime ? new Date(b.createdTime).getTime() : 0;
      return timeA - timeB;
    });
  const isResultDataEmpty = isEmpty(resultsData) || isEmpty(validResults);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1.5 text-xs font-medium text-sky-600 hover:text-sky-700 disabled:text-red-400 transition-colors bg-transparent border-none p-0 cursor-pointer outline-none mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
        disabled={isResultDataEmpty}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          className="w-4 h-4"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
          />
        </svg>
        <span className="italic">{t('routing_info.title')}</span>
      </button>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={t('routing_info.title')}
        maxWidth="max-w-3xl"
      >
        <div className="overflow-x-auto border border-gray-200 dark:border-slate-700 rounded-lg mt-2">
          <table className="min-w-full text-sm text-left">
            <thead className="bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-200 font-bold border-b border-gray-200 dark:border-slate-700">
              <tr>
                <th className="px-4 py-3 text-center">#</th>
                <th className="px-4 py-3">{t('common.routing_name')}</th>
                <th className="px-4 py-3">{t('common.created_by')}</th>
                <th className="px-4 py-3 text-center">{t('common.created_time')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-700 bg-white dark:bg-slate-900">
              {validResults.map((item, idx) => (
                <tr
                  key={item._id || idx}
                  className="hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <td className="px-4 py-2 text-center text-slate-700 dark:text-slate-300">
                    {idx + 1}
                  </td>
                  <td className="px-4 py-2 font-medium text-slate-800 dark:text-slate-200">
                    {item.name || '-'}
                  </td>
                  <td className="px-4 py-2 text-slate-700 dark:text-slate-300">
                    {item.user?.name || '-'}
                  </td>
                  <td className="px-4 py-2 text-center text-slate-700 dark:text-slate-300">
                    {item.createdTime
                      ? formatDateUniversal(item.createdTime, 'DD/MM/YYYY HH:mm:ss')
                      : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Modal>
    </>
  );
}
