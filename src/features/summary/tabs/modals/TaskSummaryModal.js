'use client';

import Modal from '@/components/Modal';
import CustomTable from '@/components/table/CustomTable';
import { useLanguage } from '@/context/LanguageContext';
import { formatLongDate, getBasePlate, parseCustomerString } from '@/lib/utils';
import { useMemo, useState } from 'react';

export default function TaskSummaryModal({ isOpen, onClose, data, translate }) {
  const { localeCode } = useLanguage();
  const [sortConfig, setSortConfig] = useState({ key: 'driverName', direction: 'asc' });

  const vehicleEntries = useMemo(() => {
    if (!data || !data.vehicles) return [];
    return data.vehicles.map((item, index) => ({
      ...item,
      no: index + 1,
    }));
  }, [data]);

  if (!isOpen || !data) return null;

  const { title, dateObj, tasks, vehicles } = data;

  const vehicleColumns = [
    {
      key: 'no',
      width: 'w-[15%]',
      sortable: false,
      label: '#',
      align: 'center',
      render: (row) => <div className="text-center w-full">{row.no}</div>,
    },
    {
      key: 'plate',
      width: 'w-[40%]',
      sortable: true,
      align: 'center',
      label: translate('common.license_number'),
      render: (row) => <div className="text-center w-full">{getBasePlate(row.plate) || '-'}</div>,
    },
    {
      key: 'driverName',
      width: 'w-[45%]',
      sortable: true,
      align: 'center',
      label: translate('common.driver'),
      render: (row) => <div className="text-center w-full">{row.driverName || '-'}</div>,
    },
  ];

  const emptyDataContent = (
    <div className="p-8 text-center text-gray-500 flex flex-col items-center justify-center">
      <svg
        className="w-12 h-12 text-gray-300 mb-3"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
        ></path>
      </svg>
      <span className="font-medium">{translate('common.no_data')}</span>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="max-w-lg"
      title={title}
      subtitle={formatLongDate(dateObj, localeCode)}
      bodyClassName="p-0 bg-gray-50 overflow-y-auto"
    >
      {vehicles ? (
        vehicles.length > 0 ? (
          <div className="p-5 dark:bg-slate-800">
            <div className="overflow-hidden border border-gray-200 rounded-lg dark:bg-slate-800 dark:border-slate-600 flex flex-col max-h-[60vh]">
              <CustomTable
                columns={vehicleColumns}
                data={vehicleEntries}
                externalSortConfig={sortConfig}
                onExternalSort={setSortConfig}
              />
            </div>
          </div>
        ) : (
          emptyDataContent
        )
      ) : tasks && tasks.length > 0 ? (
        <div className="divide-y divide-gray-200 dark:divide-slate-600">
          {tasks.map((task, idx) => {
            const flow = task.flow;
            const customerData = parseCustomerString(task.customerOrder || '');
            const invoice = customerData.invoiceNumber || task.content || '-';
            const finalCustomerName = customerData.name || task.customerName;
            const pickupCustomerName = `${task.title} (${finalCustomerName})`;

            return (
              <div
                key={idx}
                className="px-6 py-4 bg-white hover:bg-gray-50 dark:bg-slate-800 dark:hover:bg-slate-800 transition-colors"
              >
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    {task.flow} <span className="text-slate-300 dark:text-slate-500 mx-1">|</span>{' '}
                    {invoice}
                  </span>
                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-tight">
                    {flow === 'Pickup' ? pickupCustomerName : finalCustomerName}
                  </span>
                  {(task.isWrongGR || task.isNoRouting) && (
                    <div className="mt-1 flex flex-col gap-1.5 items-start">
                      {task.isWrongGR && (
                        <div className="text-[11px] font-medium text-red-600 flex items-center gap-1">
                          ⚠️ <span>{translate('summary.tabs.task_summary.warning')}</span>
                        </div>
                      )}
                      {task.isNoRouting && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-500 text-white shadow-sm border border-slate-600">
                          {translate('summary.tabs.task_summary.no_routing')}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        emptyDataContent
      )}
    </Modal>
  );
}
