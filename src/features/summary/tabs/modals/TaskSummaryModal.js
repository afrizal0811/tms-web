'use client';

import Modal from '@/components/Modal';
import { useLanguage } from '@/context/LanguageContext';
import { formatLongDate, getBasePlate, parseCustomerString } from '@/lib/utils';

export default function TaskSummaryModal({ isOpen, onClose, data, translate }) {
  const { localeCode } = useLanguage();

  if (!isOpen || !data) return null;

  const { title, dateObj, tasks, vehicles } = data;

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
    </Modal>
  );
}
