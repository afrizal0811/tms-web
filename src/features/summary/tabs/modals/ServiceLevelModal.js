'use client';

import CopyButton from '@/components/button/CopyButton';
import Modal from '@/components/modal/Modal';
import TableData from '@/components/table/TableData';
import Tooltip from '@/components/Tooltip';
import { formatUTC7, getBasePlate, normalizeEmail, parseCustomerString } from '@/lib/utils';
import { useMemo, useState } from 'react';

export default function ServiceLevelModal({
  isOpen,
  onClose,
  tasks = [],
  driverData = [],
  title,
  subtitle,
  translate,
}) {
  const [sortConfig, setSortConfig] = useState({ key: 'createdTime', direction: 'asc' });

  const driverMap = useMemo(() => {
    const map = new Map();
    (driverData || []).forEach((d) => {
      const email = normalizeEmail(d.email);
      if (email) {
        map.set(email, {
          name: d.name || '-',
          plat: d.plat || '-',
        });
      }
    });
    return map;
  }, [driverData]);

  const sortedTableData = useMemo(() => {
    if (!tasks || !Array.isArray(tasks)) return [];

    const mapped = tasks.map((t) => {
      const rawEmail =
        t.doneBy ||
        (t.assignedTo && t.assignedTo.email) ||
        (Array.isArray(t.assignee) ? t.assignee[0] : t.assignee);
      const email = normalizeEmail(rawEmail);
      const dInfo = email ? driverMap.get(email) : null;

      const plat = getBasePlate(dInfo?.plat) || '-';
      const driver = dInfo?.name || rawEmail || '-';

      const parsedCustomer = parseCustomerString(t.customerOrder || '');
      const invoiceNumberDisplay = parsedCustomer.isTruncated
        ? parsedCustomer.truncateInvoice
        : parsedCustomer.invoiceNumber || '-';
      const fullInvoiceTooltip = parsedCustomer.invoiceNumber || '';
      const customerName = parsedCustomer.name || t.customerName || '-';

      const createdTime = t.createdTime ? formatUTC7(t.createdTime, 'DD/MM/YYYY HH:mm') : '-';
      const doneTime = t.doneTime ? formatUTC7(t.doneTime, 'DD/MM/YYYY HH:mm') : '-';

      return {
        plat,
        driver,
        invoiceNumber: invoiceNumberDisplay,
        fullInvoiceTooltip,
        customerName,
        createdTime,
        doneTime,
        rawCreatedTime: t.createdTime,
        rawDoneTime: t.doneTime,
        isTruncated: parsedCustomer.isTruncated,
      };
    });

    const sorted = [...mapped];
    if (sortConfig?.key && sortConfig.key !== 'no') {
      const { key, direction } = sortConfig;
      sorted.sort((a, b) => {
        let valA = a[key] ?? '';
        let valB = b[key] ?? '';
        if (key === 'createdTime') {
          valA = a.rawCreatedTime ? new Date(a.rawCreatedTime).getTime() : 0;
          valB = b.rawCreatedTime ? new Date(b.rawCreatedTime).getTime() : 0;
        } else if (key === 'doneTime') {
          valA = a.rawDoneTime ? new Date(a.rawDoneTime).getTime() : 0;
          valB = b.rawDoneTime ? new Date(b.rawDoneTime).getTime() : 0;
        }
        const cmp =
          typeof valA === 'string' && typeof valB === 'string'
            ? valA.localeCompare(valB)
            : valA < valB
              ? -1
              : valA > valB
                ? 1
                : 0;
        return direction === 'asc' ? cmp : -cmp;
      });
    }

    const withNo = sorted.map((row, index) => ({
      ...row,
      no: index + 1,
    }));

    if (sortConfig?.key === 'no' && sortConfig.direction === 'desc') {
      withNo.reverse();
    }

    return withNo;
  }, [tasks, driverMap, sortConfig]);

  if (!isOpen) return null;

  const columns = [
    {
      key: 'no',
      width: 'w-[60px]',
      align: 'center',
      sortable: true,
      label: 'No.',
      render: (row) => <div className="text-center">{row.no}</div>,
    },
    {
      key: 'plat',
      width: 'w-[130px]',
      align: 'center',
      sortable: true,
      label: translate('common.license_number'),
      render: (row) => <div className="text-center font-medium">{row.plat}</div>,
    },
    {
      key: 'driver',
      width: 'w-[160px]',
      align: 'left',
      sortable: true,
      label: translate('common.driver'),
      render: (row) => <div className="text-left font-medium">{row.driver}</div>,
    },
    {
      key: 'invoiceNumber',
      width: 'w-[180px]',
      align: 'center',
      sortable: true,
      label: translate('common.invoice_number'),
      render: (row) => (
        <div className="flex items-center justify-center gap-1">
          <Tooltip tooltipContent={row.isTruncated ? row.fullInvoiceTooltip : ''}>
            <span className={`font-mono text-xs ${row.isTruncated ? 'cursor-help' : ''}`}>
              {row.invoiceNumber}
            </span>
          </Tooltip>
          {row.fullInvoiceTooltip && <CopyButton text={row.fullInvoiceTooltip} />}
        </div>
      ),
    },
    {
      key: 'customerName',
      width: 'w-[250px]',
      align: 'left',
      sortable: true,
      label: translate('common.customer_name'),
      render: (row) => <div className="text-left truncate max-w-[250px]">{row.customerName}</div>,
    },
    {
      key: 'createdTime',
      width: 'w-[140px]',
      align: 'center',
      sortable: true,
      label: translate('common.created_time'),
      render: (row) => <div className="text-center text-xs">{row.createdTime}</div>,
    },
    {
      key: 'doneTime',
      width: 'w-[140px]',
      align: 'center',
      sortable: true,
      label: translate('common.done_time'),
      render: (row) => <div className="text-center text-xs">{row.doneTime}</div>,
    },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} subtitle={subtitle} maxWidth="max-w-6xl">
      <div className="p-0">
        <div className="overflow-hidden border border-gray-200 dark:border-slate-700 rounded-lg flex flex-col">
          <TableData
            columns={columns}
            data={sortedTableData}
            externalSortConfig={sortConfig}
            onExternalSort={setSortConfig}
          />
        </div>
      </div>
    </Modal>
  );
}
