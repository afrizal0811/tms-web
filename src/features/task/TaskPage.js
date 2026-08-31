'use client';

import BodyCard from '@/components/card/BodyCard';
import HeaderCard from '@/components/card/HeaderCard';
import CustomDatePicker from '@/components/CustomDatePicker';
import Dropdown from '@/components/Dropdown';
import HighlightText from '@/components/HighlightText';
import ConfirmModal from '@/components/modal/ConfirmModal';
import TaskModal from '@/components/modal/TaskModal';
import SearchBar from '@/components/SearchBar';
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
  const [limit, setLimit] = useState(50);
  const [page, setPage] = useState(1);
  const [driverData, setDriverData] = useState([]);
  const [hubsData, setHubsData] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  const cacheRef = useRef({ ONE: null, ALL: null, dateKey: '' });

  const statusOptions = [
    { label: 'Semua Status', value: 'ALL' },
    { label: 'Sukses', value: 'SUKSES' },
    { label: 'Terima Sebagian', value: 'TERIMA SEBAGIAN' },
    { label: 'Pending', value: 'PENDING' },
    { label: 'Batal', value: 'BATAL' },
    { label: 'Pending GR', value: 'PENDING GR' },
  ];

  const statusTaskOptions = [
    { label: 'Semua Status', value: 'ALL' },
    { label: 'Done', value: 'DONE' },
    { label: 'Unassigned', value: 'UNASSIGNED' },
    { label: 'Ongoing', value: 'ONGOING' },
    { label: 'Manual Assign', value: 'MANUAL_ASSIGN' },
    { label: 'Different Day', value: 'DIFFERENT_DAY' },
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
      setPage(1);
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
      setPage(1);
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
      };
    });

    if (statusFilter !== 'ALL') {
      result = result.filter(
        (task) => (task.statusDelivery?.[0] || '').toUpperCase() === statusFilter.toUpperCase()
      );
    }

    if (statusTaskFilter !== 'ALL') {
      result = result.filter((task) => {
        if (statusTaskFilter === 'DONE') return !!task.statusDelivery?.[0];
        if (statusTaskFilter === 'UNASSIGNED') return !task.assignee || task.assignee.length === 0;
        if (statusTaskFilter === 'ONGOING') return task.status?.toLowerCase() === 'ongoing';
        if (statusTaskFilter === 'MANUAL_ASSIGN')
          return (
            task.assignee?.length > 0 &&
            (!task.routingResultId || !task.routePlannedOrder || !task.eta || !task.etd)
          );
        if (statusTaskFilter === 'DIFFERENT_DAY') {
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

    result.sort((a, b) => {
      if (isAllHub) {
        const hubCompare = (a._hubName || '').localeCompare(b._hubName || '');
        if (hubCompare !== 0) return hubCompare;
      }
      return (a._driverName || '').localeCompare(b._driverName || '');
    });

    return result;
  }, [tasks, driverMap, hubMap, searchQuery, statusFilter, isAllHub, statusTaskFilter]);

  const paginatedTasks = useMemo(() => {
    if (limit === 'all') return processedData;
    const startIndex = (page - 1) * Number(limit);
    return processedData.slice(startIndex, startIndex + Number(limit));
  }, [processedData, page, limit]);
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

  const totalPages = limit === 'all' ? 1 : Math.ceil(processedData.length / Number(limit));

  const cw = isAllHub
    ? {
        hub: '10%',
        flow: '8%',
        name: '12%',
        id: '8%',
        loc: '8%',
        inv: '12%',
        stat: '8%',
        start: '8%',
        assign: '8%',
        done: '8%',
        assignee: '10%',
      }
    : {
        flow: '8%',
        name: '15%',
        id: '8%',
        loc: '10%',
        inv: '15%',
        stat: '10%',
        start: '8%',
        assign: '8%',
        done: '8%',
        assignee: '10%',
      };

  const renderRow = (task) => {
    const custInfo = task._custInfo;
    const driverName = task._driverName;

    const statusDel = task.statusDelivery?.[0] || '-';
    const tStart = formatUTC7(task.startTime, 'DD/MM/YYYY HH:mm') || '-';
    const tAssigned = formatUTC7(task.assignedTime, 'DD/MM/YYYY HH:mm') || '-';
    const tDone = formatUTC7(task.doneTime, 'DD/MM/YYYY HH:mm') || '-';

    return (
      <div
        key={task._id}
        onClick={() => {
          setSelectedTaskId(task._id);
          setIsTaskModalOpen(true);
        }}
        className="flex w-full hover:bg-gray-50 dark:hover:bg-slate-800 border-b border-gray-200 dark:border-slate-700 cursor-pointer"
        style={{ minWidth: '1200px' }}
      >
        {isAllHub && (
          <div className="p-3 text-xs flex-none break-all" style={{ width: cw.hub }}>
            <HighlightText text={task._hubName} highlight={searchQuery} />
          </div>
        )}
        <div className="p-3 text-xs flex-none break-all" style={{ width: cw.flow }}>
          {task.flow || '-'}
        </div>
        <div className="p-3 text-xs flex-none break-all" style={{ width: cw.name }}>
          <HighlightText text={custInfo.name || '-'} highlight={searchQuery} />
        </div>
        <div className="p-3 text-xs flex-none break-all" style={{ width: cw.id }}>
          <HighlightText text={custInfo.id || '-'} highlight={searchQuery} />
        </div>
        <div className="p-3 text-xs flex-none break-all" style={{ width: cw.loc }}>
          {custInfo.location || '-'}
        </div>
        <div className="p-3 text-xs flex-none break-all" style={{ width: cw.inv }}>
          {custInfo.isTruncated ? (
            <Tooltip tooltipContent={custInfo.invoiceNumber}>
              <span className="cursor-help block">
                <HighlightText text={custInfo.truncateInvoice || '-'} highlight={searchQuery} />
              </span>
            </Tooltip>
          ) : (
            <HighlightText text={custInfo.invoiceNumber || '-'} highlight={searchQuery} />
          )}
        </div>
        <div className="p-3 text-xs flex-none break-all" style={{ width: cw.stat }}>
          {statusDel}
        </div>
        <div className="p-3 text-xs flex-none break-all" style={{ width: cw.assign }}>
          {tAssigned}
        </div>
        <div className="p-3 text-xs flex-none break-all" style={{ width: cw.start }}>
          {tStart}
        </div>
        <div className="p-3 text-xs flex-none break-all" style={{ width: cw.done }}>
          {tDone}
        </div>
        <div className="p-3 text-xs flex-none break-all" style={{ width: cw.assignee }}>
          <HighlightText text={driverName} highlight={searchQuery} />
        </div>
      </div>
    );
  };

  const headerItems = [
    {
      label: 'Date Range',
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
      label: 'Search',
      component: (
        <SearchBar
          disabled={loading}
          onChange={setSearchQuery}
          placeholder="Customer, ID, Inv, Driver"
          value={searchQuery}
        />
      ),
    },
    {
      label: 'Status Delivery',
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
      label: 'Status Task',
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
            label: 'Hub',
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
        title="Task Data"
        subtitle="Data seluruh task yang tersedia"
        items={headerItems}
      />
      <BodyCard isLoading={loading} isEmpty={paginatedTasks.length === 0}>
        <div className="flex flex-col flex-1 h-full min-h-0">
          <div className="flex-1 overflow-auto bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700">
            <div className="min-w-max">
              <div
                className="flex w-full bg-gray-100 dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 sticky top-0 z-10"
                style={{ minWidth: '1200px' }}
              >
                {isAllHub && (
                  <div
                    className="p-3 text-left text-xs font-semibold text-gray-600 uppercase flex-none"
                    style={{ width: cw.hub }}
                  >
                    Hub
                  </div>
                )}
                <div
                  className="p-3 text-left text-xs font-semibold text-gray-600 uppercase flex-none"
                  style={{ width: cw.flow }}
                >
                  Flow
                </div>
                <div
                  className="p-3 text-left text-xs font-semibold text-gray-600 uppercase flex-none"
                  style={{ width: cw.name }}
                >
                  Customer Name
                </div>
                <div
                  className="p-3 text-left text-xs font-semibold text-gray-600 uppercase flex-none"
                  style={{ width: cw.id }}
                >
                  Customer ID
                </div>
                <div
                  className="p-3 text-left text-xs font-semibold text-gray-600 uppercase flex-none"
                  style={{ width: cw.loc }}
                >
                  Location ID
                </div>
                <div
                  className="p-3 text-left text-xs font-semibold text-gray-600 uppercase flex-none"
                  style={{ width: cw.inv }}
                >
                  Invoice Number
                </div>
                <div
                  className="p-3 text-left text-xs font-semibold text-gray-600 uppercase flex-none"
                  style={{ width: cw.stat }}
                >
                  Status
                </div>
                <div
                  className="p-3 text-left text-xs font-semibold text-gray-600 uppercase flex-none"
                  style={{ width: cw.assign }}
                >
                  Assigned Time
                </div>
                <div
                  className="p-3 text-left text-xs font-semibold text-gray-600 uppercase flex-none"
                  style={{ width: cw.start }}
                >
                  Start Time
                </div>
                <div
                  className="p-3 text-left text-xs font-semibold text-gray-600 uppercase flex-none"
                  style={{ width: cw.done }}
                >
                  Done Time
                </div>
                <div
                  className="p-3 text-left text-xs font-semibold text-gray-600 uppercase flex-none"
                  style={{ width: cw.assignee }}
                >
                  Assignee
                </div>
              </div>
              <div className="flex flex-col w-full">{paginatedTasks.map(renderRow)}</div>
            </div>
          </div>

          <div className="p-4 flex justify-between items-center bg-gray-50 dark:bg-slate-900 border-t border-gray-200 dark:border-slate-700 shrink-0">
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              <span>Show:</span>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(e.target.value);
                  setPage(1);
                }}
                className="border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 rounded p-1 outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
                <option value="all">All</option>
              </select>
              <span className="ml-4">Total data: {processedData.length}</span>
            </div>
            {limit !== 'all' && totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded text-sm disabled:opacity-50 disabled:cursor-default cursor-pointer"
                >
                  Prev
                </button>
                <span className="text-sm text-gray-600 dark:text-gray-300 px-2">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded text-sm disabled:opacity-50 disabled:cursor-default cursor-pointer"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
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
      />
    </div>
  );
}
