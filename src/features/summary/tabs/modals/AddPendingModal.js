'use client';

import Button from '@/components/button/Button';
import CustomDatePicker from '@/components/CustomDatePicker';
import HighlightText from '@/components/HighlightText';
import Modal from '@/components/modal/Modal';
import SearchBar from '@/components/SearchBar';
import TableData from '@/components/table/TableData';
import Tooltip from '@/components/Tooltip';
import { useLanguage } from '@/context/LanguageContext';
import { DELIVERY_STATUS_KEYS } from '@/lib/deliveryStatus';
import { useDeliveryStatus } from '@/lib/hooks/useDeliveryStatus';
import {
  formatDateUniversal,
  formatLongDate,
  getBasePlate,
  isEmpty,
  normalizeEmail,
  parseApiDateString,
  parseCustomerString,
} from '@/lib/utils';
import { useCallback, useMemo, useState } from 'react';

const getTaskDateStr = (task) => {
  if (task.dateStr && task.dateStr.includes('-')) {
    const parts = task.dateStr.split('-');
    if (parts[0].length === 2 && parts[2]?.length === 4) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    if (parts[0].length === 4) {
      return task.dateStr;
    }
  }
  const rawDate = task.startTime || task.doneTime || task.date || task.createdAt;
  if (!rawDate) return '';
  const dateObj = parseApiDateString(rawDate) || new Date(rawDate);
  if (isNaN(dateObj.getTime())) return '';
  return formatDateUniversal(dateObj, 'YYYY-MM-DD');
};

function AddSuccessTaskModalContent({
  isOpen,
  onClose,
  allTasks = [],
  dateRange = [null, null],
  driverData = [],
  pendingDetails = [],
  translate,
  selectedTasksMap,
  setSelectedTasksMap,
  selectedDate: externalSelectedDate,
  setSelectedDate: setExternalSelectedDate,
  onProceed,
}) {
  const { normalizeStatus } = useDeliveryStatus();
  const { localeCode } = useLanguage();

  const [internalSelectedDate, setInternalSelectedDate] = useState(() =>
    dateRange && dateRange[0] ? new Date(dateRange[0]) : new Date()
  );
  const selectedDate =
    externalSelectedDate !== undefined ? externalSelectedDate : internalSelectedDate;
  const setSelectedDate = setExternalSelectedDate || setInternalSelectedDate;

  const [searchQuery, setSearchQuery] = useState('');
  const [internalSelectedTasksMap, setInternalSelectedTasksMap] = useState(() => new Map());
  const activeSelectedMap =
    selectedTasksMap !== undefined ? selectedTasksMap : internalSelectedTasksMap;
  const setActiveSelectedMap = setSelectedTasksMap || setInternalSelectedTasksMap;

  const driverMap = useMemo(() => {
    const map = new Map();
    if (driverData && Array.isArray(driverData)) {
      driverData.forEach((d) => {
        const plat = d.plat || '';
        if (!plat || isEmpty(plat.trim()) || plat.toUpperCase().includes('DEMO')) return;
        const email = normalizeEmail(d.email);
        if (email && !map.has(email)) {
          map.set(email, { name: d.name, plat: getBasePlate(plat) });
        }
      });
    }
    return map;
  }, [driverData]);

  // Filter tasks that are currently Success on the selectedDate
  const availableSuccessTasks = useMemo(() => {
    if (!allTasks || !Array.isArray(allTasks) || !selectedDate) return [];

    const targetDateStr = formatDateUniversal(selectedDate, 'YYYY-MM-DD');

    return allTasks
      .filter((task) => {
        const taskDate = getTaskDateStr(task);
        if (taskDate !== targetDateStr) return false;

        const taskId = String(task._id || task.id || task.taskId);
        const pd = (pendingDetails || []).find((p) => String(p.taskId) === taskId);
        const rawStatus = task.statusDelivery
          ? Array.isArray(task.statusDelivery)
            ? task.statusDelivery[0]
            : task.statusDelivery
          : task.status;
        const effectiveStatus =
          pd?.new_status || (rawStatus ? String(rawStatus).split(',')[0].trim() : '');

        return normalizeStatus(effectiveStatus) === DELIVERY_STATUS_KEYS.SUCCESS;
      })
      .map((task) => {
        let emailRaw = '';
        if (task.assignee) {
          emailRaw =
            typeof task.assignee === 'string' ? task.assignee.split(',')[0] : task.assignee;
        }
        const email = normalizeEmail(emailRaw);
        const driverInfo = driverMap.get(email);
        const driverName =
          driverInfo?.name || task.driverName || task.assigneeName || emailRaw || '-';
        const {
          name: customerName,
          invoiceNumber,
          truncateInvoice,
          isTruncated,
        } = parseCustomerString(task.customerOrder || task.customerName);

        const dObj =
          parseApiDateString(task.startTime || task.doneTime) ||
          new Date(task.startTime || task.doneTime);
        const dateStr = !isNaN(dObj.getTime())
          ? formatDateUniversal(dObj, 'DD-MM-YYYY')
          : formatDateUniversal(selectedDate, 'DD-MM-YYYY');

        return {
          ...task,
          flow: task.flow || '-',
          driverName,
          customerName: customerName || '-',
          customer: customerName || '-',
          invoiceNumber: invoiceNumber || task.content || '-',
          truncateInvoice: truncateInvoice || invoiceNumber || task.content || '-',
          isTruncated: Boolean(isTruncated),
          status: DELIVERY_STATUS_KEYS.SUCCESS,
          originalStatus: DELIVERY_STATUS_KEYS.SUCCESS,
          dateStr,
          isSuccessConversion: true,
        };
      });
  }, [allTasks, selectedDate, pendingDetails, normalizeStatus, driverMap]);

  // Apply search query and sort by driver name ascending
  const displayedTasks = useMemo(() => {
    let list = availableSuccessTasks;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((t) => {
        const cust = (t.customerName || '').toLowerCase();
        const inv = (t.invoiceNumber || '').toLowerCase();
        return cust.includes(q) || inv.includes(q);
      });
    }

    return [...list].sort((a, b) => (a.driverName || '').localeCompare(b.driverName || ''));
  }, [availableSuccessTasks, searchQuery]);

  const handleToggleSelect = useCallback(
    (task) => {
      setActiveSelectedMap((prev) => {
        const next = new Map(prev);
        if (next.has(task._id)) {
          next.delete(task._id);
        } else {
          next.set(task._id, task);
        }
        return next;
      });
    },
    [setActiveSelectedMap]
  );

  const isAllDisplayedSelected =
    displayedTasks.length > 0 && displayedTasks.every((t) => activeSelectedMap.has(t._id));

  const handleToggleSelectAll = useCallback(() => {
    setActiveSelectedMap((prev) => {
      const next = new Map(prev);
      if (isAllDisplayedSelected) {
        displayedTasks.forEach((t) => next.delete(t._id));
      } else {
        displayedTasks.forEach((t) => next.set(t._id, t));
      }
      return next;
    });
  }, [isAllDisplayedSelected, displayedTasks, setActiveSelectedMap]);

  const handleProceed = () => {
    const selected = Array.from(activeSelectedMap.values());
    if (selected.length === 0) return;
    onProceed(selected);
  };

  const selectedCountOnCurrentDate = useMemo(() => {
    return displayedTasks.filter((t) => activeSelectedMap.has(t._id)).length;
  }, [displayedTasks, activeSelectedMap]);

  const columns = useMemo(
    () => [
      {
        key: 'checkbox',
        label: (
          <input
            type="checkbox"
            checked={isAllDisplayedSelected}
            onChange={handleToggleSelectAll}
            disabled={displayedTasks.length === 0}
            className="rounded border-gray-300 text-sky-600 focus:ring-sky-500 cursor-pointer"
          />
        ),
        align: 'center',
        render: (row) => {
          const isChecked = activeSelectedMap.has(row._id);
          return (
            <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
              <input
                type="checkbox"
                checked={isChecked}
                onChange={() => handleToggleSelect(row)}
                className="rounded border-gray-300 text-sky-600 focus:ring-sky-500 cursor-pointer"
              />
            </div>
          );
        },
      },
      {
        key: 'flow',
        label: translate('common.flow'),
        render: (row) => <HighlightText text={row.flow || '-'} highlight={searchQuery} />,
      },
      {
        key: 'driverName',
        width: 'w-[10%]',
        label: translate('common.driver'),
        render: (row) => (
          <span className="font-medium text-slate-800 dark:text-slate-200">
            <HighlightText text={row.driverName || '-'} highlight={searchQuery} />
          </span>
        ),
      },
      {
        key: 'invoiceNumber',
        width: 'w-[40%]',
        align: 'left',
        label: translate('common.invoice_number'),
        render: (row) => {
          const textVal = row.truncateInvoice || row.invoiceNumber || '-';
          return row.isTruncated ? (
            <Tooltip tooltipContent={row.invoiceNumber}>
              <span className="cursor-help">
                <HighlightText text={textVal} highlight={searchQuery} />
              </span>
            </Tooltip>
          ) : (
            <HighlightText text={textVal} highlight={searchQuery} />
          );
        },
      },
      {
        key: 'customerName',
        width: 'w-[40%]',
        align: 'left',
        label: translate('common.customer_name'),
        render: (row) => <HighlightText text={row.customerName || '-'} highlight={searchQuery} />,
      },
    ],
    [
      isAllDisplayedSelected,
      handleToggleSelectAll,
      displayedTasks.length,
      activeSelectedMap,
      handleToggleSelect,
      translate,
      searchQuery,
    ]
  );

  const footer = (
    <div className="flex items-center justify-between w-full">
      <div className="text-xs font-medium text-slate-600 dark:text-slate-300">
        {selectedCountOnCurrentDate}/{displayedTasks.length} {translate('common.task') || 'Task'}
      </div>
      <div className="flex items-center gap-2">
        <Button
          text={translate('common.button.btn_process') || 'Proses'}
          onClick={handleProceed}
          disabled={activeSelectedMap.size === 0}
          size="md"
        />
      </div>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={translate('summary.tabs.pending_reasons.modal_success_title')}
      subtitle={selectedDate ? formatLongDate(selectedDate, localeCode) : translate('common.all')}
      maxWidth="max-w-3xl"
      maxHeight="max-h-[85vh]"
      footer={footer}
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="w-full sm:w-auto">
            <CustomDatePicker
              selectsRange={false}
              selected={selectedDate}
              onChange={(date) => {
                setSelectedDate(date);
                setSearchQuery('');
              }}
              minDate={dateRange ? dateRange[0] : null}
              maxDate={dateRange ? dateRange[1] : null}
              disableSunday={false}
              className="w-full sm:w-[220px]"
            />
          </div>
          <div className="w-full sm:w-[280px]">
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder={translate('common.search') || 'Cari invoice/customer...'}
              width="w-full"
              size="md"
            />
          </div>
        </div>

        {/* Table */}
        <div className="border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden max-h-[50vh] flex flex-col">
          <TableData
            columns={columns}
            data={displayedTasks}
            onRowClick={(row) => handleToggleSelect(row)}
            rowClassName={(row) =>
              activeSelectedMap.has(row._id)
                ? 'bg-sky-50 dark:bg-slate-700/50'
                : 'hover:bg-gray-50 dark:hover:bg-slate-700/30'
            }
            paginate={false}
          />
        </div>
      </div>
    </Modal>
  );
}

export default function AddSuccessTaskModal(props) {
  if (!props.isOpen) return null;
  return <AddSuccessTaskModalContent {...props} />;
}
