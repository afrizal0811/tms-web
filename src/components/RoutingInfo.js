'use client';

import Modal from '@/components/Modal';
import CustomTable from '@/components/table/CustomTable';
import { useLanguage } from '@/context/LanguageContext';
import { formatDateUniversal, isEmpty } from '@/lib/utils';
import { useMemo, useState } from 'react';
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

  const tableData = useMemo(() => {
    return validResults.map((item, index) => ({
      ...item,
      no: index + 1,
    }));
  }, [validResults]);

  const columns = [
    {
      key: 'no',
      width: 'w-[10%]',
      sortable: false,
      align: 'center',
      label: '#',
      render: (row) => <div className="text-center w-full">{row.no}</div>,
    },
    {
      key: 'name',
      width: 'w-[40%]',
      sortable: false,
      label: t('common.routing_name'),
      render: (row) => <div className="font-medium text-left w-full">{row.name || '-'}</div>,
    },
    {
      key: 'user',
      width: 'w-[25%]',
      sortable: false,
      label: t('common.created_by'),
      render: (row) => <div className="text-left w-full">{row.user?.name || '-'}</div>,
    },
    {
      key: 'createdTime',
      width: 'w-[25%]',
      sortable: false,
      label: t('common.created_time'),
      render: (row) => (
        <div className=" w-full">
          {row.createdTime ? formatDateUniversal(row.createdTime, 'DD/MM/YYYY HH:mm:ss') : '-'}
        </div>
      ),
    },
  ];

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
        <div className="overflow-hidden border border-gray-200 dark:border-slate-700 rounded-lg mt-2 max-h-[60vh] flex flex-col">
          <CustomTable columns={columns} data={tableData} />
        </div>
      </Modal>
    </>
  );
}
