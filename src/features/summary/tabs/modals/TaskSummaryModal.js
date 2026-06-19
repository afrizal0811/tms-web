'use client';

import BaseModal from '@/components/BaseModal';
import { useLanguage } from '@/context/LanguageContext';
import { formatLongDate, getBasePlate, parseCustomerString } from '@/lib/utils';
import { useState } from 'react';

export default function TaskSummaryModal({ isOpen, onClose, data, translate }) {
  const { localeCode, t } = useLanguage();
  const [copied, setCopied] = useState(false);

  if (!isOpen || !data) return null;

  const { title, dateObj, tasks, vehicles, routingName } = data;

  const handleCopyRoutingName = async () => {
    if (!routingName) return;
    try {
      await navigator.clipboard.writeText(routingName);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Gagal menyalin teks: ', err);
    }
  };

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
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="max-w-lg"
      title={
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-white">{title}</h3>

            {routingName && (
              <div className="relative flex items-center">
                <button
                  onClick={handleCopyRoutingName}
                  title={translate('common.routing_name') + ': ' + routingName}
                  className="p-1 rounded bg-slate-800/60 hover:bg-slate-700/80 text-slate-400 hover:text-slate-100 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-300 dark:hover:text-white transition-all focus:outline-none shadow-sm border border-slate-700 cursor-pointer"
                  aria-label="Copy Routing Name"
                >
                  {copied ? (
                    <svg
                      className="w-3.5 h-3.5 text-emerald-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
                      />
                    </svg>
                  )}
                </button>
              </div>
            )}
          </div>
          <p className="text-slate-300 text-sm font-normal">
            {formatLongDate(dateObj, localeCode)}
          </p>
        </div>
      }
      bodyClassName="p-0 bg-gray-50 overflow-y-auto"
    >
      {vehicles ? (
        vehicles.length > 0 ? (
          <div className="p-5 dark:bg-slate-800">
            <div className="overflow-x-auto border border-gray-200 rounded-lg dark:bg-slate-800 dark:border-slate-600">
              <table className="min-w-full text-sm text-left">
                <thead className="bg-gray-100 dark:bg-slate-900 text-gray-700 dark:text-slate-100 font-bold border-b border-gray-200 dark:border-slate-600">
                  <tr>
                    <th className="px-4 py-3 text-center">#</th>
                    <th className="px-4 py-3 text-center">{translate('common.license_number')}</th>
                    <th className="px-4 py-3 text-center">{translate('common.driver')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-600">
                  {vehicles.map((item, idx) => (
                    <tr
                      key={idx}
                      className="hover:bg-gray-50 dark:hover:bg-slate-700/10 text-slate-700 dark:text-slate-200 text-center "
                    >
                      <td className="px-4 py-2">{idx + 1}</td>
                      <td className="px-4 py-2">{getBasePlate(item.plate) || '-'}</td>
                      <td className="px-4 py-2">{item.driverName || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
    </BaseModal>
  );
}
