'use client';

import BodyCard from '@/components/card/BodyCard';
import HeaderCard from '@/components/card/HeaderCard';
import CustomDatePicker from '@/components/CustomDatePicker';
import Dropdown from '@/components/Dropdown';
import HighlightText from '@/components/HighlightText';
import ConfirmModal from '@/components/modal/ConfirmModal';
import TaskModal from '@/components/modal/TaskModal';
import SearchBar from '@/components/SearchBar';
import CustomTable from '@/components/table/CustomTable';
import ToggleButton from '@/components/ToggleButton';
import Tooltip from '@/components/Tooltip';
import { useLanguage } from '@/context/LanguageContext';
import { getHubs, getTasks } from '@/lib/api';
import { getDriverData } from '@/lib/driverData';
import { useSuperadmin } from '@/lib/hooks/useSuperadmin';
import { getLocalStorage } from '@/lib/localStorageHandler';
import { formatUTC7, normalizeEmail, parseCustomerString, toApiDateString } from '@/lib/utils';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export default function TaskPage() {
  const { t } = useLanguage();
  const { isSuperadmin } = useSuperadmin();
  const { storedLocation: hubId } = getLocalStorage();

  const [dateRange, setDateRange] = useState([new Date(), new Date()]);
  const [startDate, endDate] = dateRange;
  const [searchQuery, setSearchQuery] = useState('');
  const [tempDateRange, setTempDateRange] = useState([new Date(), new Date()]);
  const [tempStart, tempEnd] = tempDateRange;
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [statusTaskFilter, setStatusTaskFilter] = useState('ALL');
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [isAllHub, setIsAllHub] = useState(false);
  const [driverData, setDriverData] = useState([]);
  const [hubsData, setHubsData] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState({ key: '_startFmt', direction: 'asc' });

  const cacheRef = useRef({ ONE: null, ALL: null, dateKey: '' });

  const statusOptions = [
    { label: t('common.all'), value: t('common.all') },
    { label: t('common.status.success'), value: t('common.status.success') },
    { label: t('common.status.partial'), value: t('common.status.partial') },
    { label: t('common.status.pending'), value: t('common.status.pending') },
    { label: t('common.status.cancel'), value: t('common.status.cancel') },
    { label: t('common.status.pending_gr'), value: t('common.status.pending_gr') },
  ];

  const statusTaskOptions = [
    { label: t('common.all'), value: t('common.all') },
    { label: t('common.status.done'), value: t('common.status.done') },
    { label: t('common.status.unassigned'), value: t('common.status.unassigned') },
    { label: t('common.status.ongoing'), value: t('common.status.ongoing') },
    { label: t('common.status.manual_assign'), value: t('common.status.manual_assign') },
    { label: t('common.status.diff_day'), value: t('common.status.diff_day') },
  ];

  useEffect(() => {
    const fetchDriverData = async () => {
      const data = await getDriverData();
      setDriverData(data);
    };
    fetchDriverData();
  }, []);

  useEffect(() => {
    if (isSuperadmin) {
      const fetchHubs = async () => {
        try {
          const res = await getHubs();
          const data = Array.isArray(res) ? res : [];
          setHubsData(data);
        } catch (err) {
          console.error(err);
        }
      };
      fetchHubs();
    }
  }, [isSuperadmin, hubId]);

  const fetchTasksData = useCallback(async () => {
    if (!startDate || !endDate) return;

    const localStart = new Date(startDate);
    localStart.setHours(0, 0, 0, 0);
    const localEnd = new Date(endDate);
    localEnd.setHours(23, 59, 59, 999);

    const currentKey = `${localStart.getTime()}-${localEnd.getTime()}`;
    const mode = isAllHub ? 'ALL' : 'ONE';

    if (cacheRef.current.dateKey !== currentKey) {
      cacheRef.current = { ONE: null, ALL: null, dateKey: currentKey };
    } else if (cacheRef.current[mode]) {
      setTasks(cacheRef.current[mode]);
      return;
    }

    setLoading(true);
    try {
      const targetHub = isSuperadmin && isAllHub ? undefined : hubId;

      const res = await getTasks({
        hubId: targetHub,
        timeFrom: toApiDateString(localStart),
        timeTo: toApiDateString(localEnd),
        status: 'DONE,UNASSIGNED,ONGOING',
        timeBy: 'startTime',
      });

      const dataArray = Array.isArray(res) ? res : res?.data || [];

      cacheRef.current[mode] = dataArray;
      setTasks(dataArray);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, isAllHub, hubId, isSuperadmin]);

  useEffect(() => {
    fetchTasksData();
  }, [fetchTasksData]);

  const driverMap = useMemo(() => {
    const map = new Map();
    driverData.forEach((driver) => {
      if (driver.email) {
        map.set(normalizeEmail(driver.email), { name: driver.name });
      }
    });
    return map;
  }, [driverData]);

  const hubMap = useMemo(() => {
    const map = new Map();
    hubsData.forEach((hub) => {
      map.set(hub._id, hub.name);
    });
    return map;
  }, [hubsData]);

  const processedData = useMemo(() => {
    let result = tasks.map((task) => {
      const custInfo = parseCustomerString(task.customerOrder);
      const assigneeEmail = task.assignee?.[0];
      const driver = driverMap.get(normalizeEmail(assigneeEmail)) || {
        name: assigneeEmail || '-',
      };
      const hubName = hubMap.get(task.hubId) || '-';

      return {
        ...task,
        _custInfo: custInfo,
        _driverName: driver.name,
        _hubName: hubName,
        _custName: custInfo.name || '-',
        _custId: custInfo.id || '-',
        _custLocation: custInfo.location || '-',
        _invoiceNumber: custInfo.invoiceNumber || '-',
        _truncateInvoice: custInfo.truncateInvoice || '-',
        _isTruncated: custInfo.isTruncated,
        _statusDel: task.statusDelivery?.[0] || '-',
        _startFmt: formatUTC7(task.startTime, 'DD/MM/YYYY HH:mm') || '-',
        _assignFmt: formatUTC7(task.assignedTime, 'DD/MM/YYYY HH:mm') || '-',
        _doneFmt: formatUTC7(task.doneTime, 'DD/MM/YYYY HH:mm') || '-',
      };
    });

    if (statusFilter !== 'ALL') {
      result = result.filter(
        (task) => (task.statusDelivery?.[0] || '').toUpperCase() === statusFilter.toUpperCase()
      );
    }

    if (statusTaskFilter !== 'ALL') {
      result = result.filter((task) => {
        if (statusTaskFilter === t('common.status.done')) return !!task.statusDelivery?.[0];
        if (statusTaskFilter === t('common.status.unassigned'))
          return !task.assignee || task.assignee.length === 0;
        if (statusTaskFilter === t('common.status.ongoing'))
          return task.status?.toLowerCase() === 'ongoing';
        if (statusTaskFilter === t('common.status.manual_assign'))
          return (
            task.assignee?.length > 0 &&
            (!task.routingResultId || !task.routePlannedOrder || !task.eta || !task.etd)
          );
        if (statusTaskFilter === t('common.status.diff_day')) {
          const startFormat = formatUTC7(task.startTime, 'DD/MM/YYYY');
          const doneFormat = formatUTC7(task.doneTime, 'DD/MM/YYYY');
          return startFormat && doneFormat && startFormat !== doneFormat;
        }
        return true;
      });
    }
    const q = searchQuery.toLowerCase();
    if (q) {
      result = result.filter((task) => {
        const strToSearch =
          `${task._hubName} ${task._custInfo.name} ${task._custInfo.id} ${task._custInfo.invoiceNumber} ${task._driverName}`.toLowerCase();
        return strToSearch.includes(q);
      });
    }

    return result;
  }, [tasks, driverMap, hubMap, searchQuery, statusFilter, statusTaskFilter, t]);

  const handleApplyDate = () => {
    if (!tempStart) return;
    const validEnd = tempEnd || tempStart;
    const diffDays = Math.ceil(Math.abs(validEnd - tempStart) / (1000 * 60 * 60 * 24));

    if (diffDays > 14) {
      setShowWarningModal(true);
    } else {
      setDateRange([tempStart, validEnd]);
    }
  };

  const cw = isAllHub
    ? {
        hub: 'w-[10%]',
        flow: 'w-[8%]',
        name: 'w-[12%]',
        id: 'w-[8%]',
        loc: 'w-[8%]',
        inv: 'w-[12%]',
        stat: 'w-[8%]',
        start: 'w-[8%]',
        assign: 'w-[8%]',
        done: 'w-[8%]',
        assignee: 'w-[10%]',
      }
    : {
        flow: 'w-[8%]',
        name: 'w-[15%]',
        id: 'w-[8%]',
        loc: 'w-[10%]',
        inv: 'w-[15%]',
        stat: 'w-[10%]',
        start: 'w-[8%]',
        assign: 'w-[8%]',
        done: 'w-[8%]',
        assignee: 'w-[10%]',
      };

  const columns = [
    ...(isAllHub
      ? [
          {
            key: '_hubName',
            label: t('common.branch'),
            width: cw.hub,
            sortable: true,
            render: (row) => <HighlightText text={row._hubName} highlight={searchQuery} />,
          },
        ]
      : []),
    {
      key: 'flow',
      label: t('common.flow'),
      width: cw.flow,
      sortable: true,
      render: (row) => row.flow || '-',
    },
    {
      key: '_custName',
      label: t('common.customer_name'),
      width: cw.name,
      sortable: true,
      render: (row) => <HighlightText text={row._custName} highlight={searchQuery} />,
    },
    {
      key: '_custId',
      label: t('common.customer_id'),
      width: cw.id,
      sortable: true,
      render: (row) => <HighlightText text={row._custId} highlight={searchQuery} />,
    },
    {
      key: '_custLocation',
      label: t('common.location_id'),
      width: cw.loc,
      sortable: true,
    },
    {
      key: '_invoiceNumber',
      label: t('common.invoice_number'),
      width: cw.inv,
      sortable: true,
      render: (row) =>
        row._isTruncated ? (
          <Tooltip tooltipContent={row._invoiceNumber}>
            <span className="cursor-help block">
              <HighlightText text={row._truncateInvoice || '-'} highlight={searchQuery} />
            </span>
          </Tooltip>
        ) : (
          <HighlightText text={row._invoiceNumber || '-'} highlight={searchQuery} />
        ),
    },
    {
      key: '_statusDel',
      label: t('common.status.delivery_status'),
      width: cw.stat,
      sortable: true,
    },
    {
      key: '_assignFmt',
      label: t('common.assigned_time'),
      width: cw.assign,
      sortable: true,
    },
    {
      key: '_startFmt',
      label: t('common.start_time'),
      width: cw.start,
      sortable: true,
    },
    {
      key: '_doneFmt',
      label: t('common.done_time'),
      width: cw.done,
      sortable: true,
    },
    {
      key: '_driverName',
      label: t('common.driver'),
      width: cw.assignee,
      sortable: true,
      render: (row) => <HighlightText text={row._driverName} highlight={searchQuery} />,
    },
  ];

  const searchPlaceholder = `${t('common.customer_name')}, ${t('common.customer_id')}, ${t('common.invoice_number')} ${t('common.driver')} ${isAllHub ? `, ${t('common.branch')}` : ''}`;

  const headerItems = [
    {
      label: t('common.range_delivery'),
      component: (
        <CustomDatePicker
          disabled={loading}
          endDate={tempEnd}
          onChange={(update) => setTempDateRange(update)}
          selectsRange={true}
          startDate={tempStart}
          useCustomRangeFormat={true}
          showApplyButton={true}
          onApply={handleApplyDate}
        />
      ),
    },
    {
      label: t('common.search'),
      component: (
        <SearchBar
          disabled={loading}
          onChange={setSearchQuery}
          placeholder={t('common.search')}
          tooltip={searchPlaceholder}
          value={searchQuery}
        />
      ),
    },
    {
      label: t('common.status.delivery_status'),
      component: (
        <Dropdown
          className="w-full xl:w-40!"
          disabled={loading}
          onChange={setStatusFilter}
          options={statusOptions}
          value={statusFilter}
        />
      ),
    },
    {
      label: t('common.status.task_status'),
      component: (
        <Dropdown
          className="w-full xl:w-40!"
          disabled={loading}
          onChange={setStatusTaskFilter}
          options={statusTaskOptions}
          value={statusTaskFilter}
        />
      ),
    },
    ...(isSuperadmin
      ? [
          {
            label: t('common.branch'),
            component: (
              <ToggleButton
                className="w-full xl:w-40!"
                disabled={loading}
                onChange={(val) => setIsAllHub(val === 'ALL')}
                options={[
                  { label: 'One', value: 'ONE' },
                  { label: 'All', value: 'ALL' },
                ]}
                value={isAllHub ? 'ALL' : 'ONE'}
              />
            ),
          },
        ]
      : []),
  ];

  return (
    <div className="w-full px-4 sm:px-6 h-[calc(100vh-100px)] flex flex-col">
      <HeaderCard
        title={t('task_detail.title')}
        subtitle={
          <>
            <span className="font-semibold text-sky-600">
              {t('task_detail.subtitle_highlight')}{' '}
            </span>
            {t('task_detail.subtitle')}
          </>
        }
        items={headerItems}
      />
      <BodyCard isLoading={false} isEmpty={false}>
        <CustomTable
          columns={columns}
          data={processedData}
          externalSortConfig={sortConfig}
          onExternalSort={setSortConfig}
          isLoading={loading}
          paginate={true}
          onRowClick={(row) => {
            setSelectedTaskId(row._id);
            setIsTaskModalOpen(true);
          }}
        />
      </BodyCard>
      <ConfirmModal
        isOpen={showWarningModal}
        title={t('common.modal.data_load_title')}
        message={t('common.modal.data_load_message', { days: 14 })}
        onConfirm={() => {
          setShowWarningModal(false);
          setDateRange([tempStart, tempEnd || tempStart]);
        }}
        onCancel={() => setShowWarningModal(false)}
      />

      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        taskId={selectedTaskId}
        driverData={driverData}
        translate={t}
      />
    </div>
  );
}
