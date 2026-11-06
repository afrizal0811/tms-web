'use client';

import Button from '@/components/button/Button';
import HighlightText from '@/components/HighlightText';
import InformationButton from '@/components/button/InformationButton';
import SearchBar from '@/components/SearchBar';
import TableData from '@/components/table/TableData';
import Card from '../components/Card';
import { getResults, getTasks, getLocationHistories, getKpiData } from '@/lib/api/mileapp';
import { useDeliveryStatus } from '@/lib/hooks/useDeliveryStatus';
import { getLocalStorage } from '@/lib/localStorageHandler';
import { toastError, toastSuccess } from '@/lib/toast';
import {
  formatDateUniversal,
  formatDurationHHMMSS,
  getBasePlate,
  parseCustomerString,
} from '@/lib/utils';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { downloadDateRangeZip, downloadSingleDateExcel } from '../helper/dataDetail';

function UserAuditCell({ user, timestamp, highlight }) {
  const dateStr = timestamp ? formatDateUniversal(timestamp, 'DD-MM-YYYY HH:mm:ss') : '-';
  return (
    <div className="flex flex-col text-left">
      <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
        <HighlightText text={user || '-'} highlight={highlight} />
      </span>
      <span className="text-[11px] text-slate-400 dark:text-slate-500">{dateStr}</span>
    </div>
  );
}

export default function DatabaseTab({ hubId, hubName = '', dateRange = [], translate }) {
  const { formatStatus, getStatusClass } = useDeliveryStatus();

  const datesList = useMemo(() => {
    if (!dateRange || !dateRange[0]) return [];
    const list = [];
    const curr = new Date(dateRange[0]);
    curr.setHours(0, 0, 0, 0);
    const end = new Date(dateRange[1] || dateRange[0]);
    end.setHours(0, 0, 0, 0);
    while (curr <= end) {
      list.push(formatDateUniversal(curr, 'YYYY-MM-DD'));
      curr.setDate(curr.getDate() + 1);
    }
    return list;
  }, [dateRange]);

  const [currentDateIndex, setCurrentDateIndex] = useState(0);
  const [activeSubTab, setActiveSubTab] = useState('routing');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const [currentData, setCurrentData] = useState({
    routing: [],
    tasks: [],
    locations: [],
    kpi: null,
  });

  const cacheRef = useRef({});
  const selectedDate = datesList[currentDateIndex] || datesList[0] || '';

  const hubAcronym = useMemo(() => {
    const { storedLocationAcronym, storedLocationName } = getLocalStorage();
    return storedLocationAcronym || hubName || storedLocationName || '';
  }, [hubName]);

  const fetchDateData = useCallback(
    async (dateStr) => {
      if (!dateStr) return { routing: [], tasks: [], locations: [], kpi: null };
      if (cacheRef.current[dateStr]) {
        return cacheRef.current[dateStr];
      }

      const [rRes, tRes, lRes, kRes] = await Promise.all([
        getResults({ dateFrom: dateStr, dateTo: dateStr, hubId }).catch(() => []),
        getTasks({ deliveryDate: dateStr, hubId, isShowAll: true }).catch(() => []),
        getLocationHistories({ dateFrom: dateStr, dateTo: dateStr, hubId }).catch(() => []),
        getKpiData({ date: dateStr, hubId }).catch(() => null),
      ]);

      const routing = Array.isArray(rRes) ? rRes : [];
      const rawTasks = Array.isArray(tRes) ? tRes : [];
      const tasks = rawTasks
        .map((t) => {
          const cust = parseCustomerString(t.customerOrder || t.customer_order);
          return {
            ...t,
            customerName: cust.name || cust.fullCustomerName || t.customerName || '',
            truncateInvoice: cust.truncateInvoice || cust.invoiceNumber || t.orderId || '',
            statusDelivery: t.statusDelivery || t.status_delivery || t.status || '',
            driverName: t.driverName || t.driver_name || '',
          };
        })
        .sort((a, b) => (a.driverName || '').localeCompare(b.driverName || ''));

      const rawLocations = Array.isArray(lRes) ? lRes : [];
      const locations = rawLocations
        .map((l) => ({
          ...l,
          driverName: l.driver_name || l.driverName || '',
        }))
        .sort((a, b) => a.driverName.localeCompare(b.driverName));
      const kpi = Array.isArray(kRes) ? kRes[0] || null : kRes || null;

      const result = { routing, tasks, locations, kpi };
      cacheRef.current[dateStr] = result;
      return result;
    },
    [hubId]
  );

  const loadActiveDate = useCallback(
    async (dateStr) => {
      if (!dateStr) return;
      setIsLoading(true);
      try {
        const data = await fetchDateData(dateStr);
        setCurrentData(data);
      } catch (err) {
        toastError(err.message, err);
      } finally {
        setIsLoading(false);
      }
    },
    [fetchDateData]
  );

  useEffect(() => {
    if (selectedDate) {
      setSearchQuery('');
      loadActiveDate(selectedDate);
    }
  }, [selectedDate, loadActiveDate]);

  const hasNoData = useMemo(() => {
    return (
      currentData.routing.length === 0 &&
      currentData.tasks.length === 0 &&
      currentData.locations.length === 0 &&
      !currentData.kpi
    );
  }, [currentData]);

  const handleExportZip = async () => {
    if (datesList.length === 0 || hasNoData) return;
    setIsExporting(true);
    try {
      await downloadDateRangeZip({
        datesList,
        fetchDateData,
        hubAcronym,
      });
      toastSuccess(translate('common.toast.success'));
    } catch (err) {
      toastError(err.message, err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCurrent = () => {
    if (!selectedDate || hasNoData) return;
    try {
      downloadSingleDateExcel({
        dateStr: selectedDate,
        data: currentData,
        hubAcronym,
      });
      toastSuccess(translate('common.toast.success'));
    } catch (err) {
      toastError(err.message, err);
    }
  };

  const routingColumns = useMemo(
    () => [
      {
        label: '#',
        key: 'no',
        align: 'center',
        width: 'w-12',
        render: (_, i) => (
          <div className="flex justify-center text-center">
            <span className="text-xs text-slate-500 dark:text-slate-400">{i + 1}</span>
          </div>
        ),
      },
      {
        label: translate('common.routing_name'),
        key: 'name',
        sortable: true,
        width: 'w-[36%]',
        render: (row) => (
          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 break-words">
            <HighlightText text={row.name || '-'} highlight={searchQuery} />
          </span>
        ),
      },
      {
        label: translate('common.total_task'),
        key: 'taskCount',
        align: 'center',
        sortable: true,
        width: 'w-[14%]',
        render: (row) => (
          <div className="flex justify-center text-center">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {row.taskCount ?? 0}
            </span>
          </div>
        ),
      },
      {
        label: translate('common.dropped_task'),
        key: 'dropped',
        align: 'center',
        sortable: true,
        width: 'w-[12%]',
        render: (row) => (
          <div className="flex justify-center text-center">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
              {row.dropped ?? 0}
            </span>
          </div>
        ),
      },
      {
        label: translate('common.created_by'),
        key: 'createdBy',
        width: 'w-[19%]',
        render: (row) => {
          const ru = row.route_user || row.routeUser;
          return (
            <UserAuditCell
              user={ru?.created_by || row.createdBy}
              timestamp={ru?.created_at || row.createdAt}
              highlight={searchQuery}
            />
          );
        },
      },
      {
        label: translate('common.sync_by'),
        key: 'syncBy',
        width: 'w-[19%]',
        render: (row) => {
          const su = row.sync_user || row.syncUser;
          return (
            <UserAuditCell
              user={su?.updated_by || su?.created_by || row.updatedBy}
              timestamp={su?.updated_at || su?.created_at || row.updatedAt}
              highlight={searchQuery}
            />
          );
        },
      },
    ],
    [translate, searchQuery]
  );

  const taskColumns = useMemo(
    () => [
      {
        label: '#',
        key: 'no',
        align: 'center',
        width: 'w-12',
        render: (_, i) => (
          <div className="flex justify-center text-center">
            <span className="text-xs text-slate-500 dark:text-slate-400">{i + 1}</span>
          </div>
        ),
      },
      {
        label: translate('common.flow'),
        key: 'flow',
        align: 'center',
        sortable: true,
        width: 'w-16',
        render: (row) => (
          <div className="flex justify-center text-center">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              <HighlightText text={row.flow || '-'} highlight={searchQuery} />
            </span>
          </div>
        ),
      },
      {
        label: translate('common.customer'),
        key: 'customerName',
        sortable: true,
        width: 'w-[22%]',
        render: (row) => (
          <div className="flex flex-col text-left">
            <span
              className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate max-w-xs"
              title={row.customerName || '-'}
            >
              <HighlightText text={row.customerName || '-'} highlight={searchQuery} />
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              <HighlightText
                text={row.truncateInvoice || row.orderId || '-'}
                highlight={searchQuery}
              />
            </span>
          </div>
        ),
      },
      {
        label: translate('common.address'),
        key: 'address',
        width: 'w-[18%]',
        render: (row) => (
          <span
            className="text-xs text-slate-700 dark:text-slate-300 line-clamp-2"
            title={row.address}
          >
            <HighlightText text={row.address || '-'} highlight={searchQuery} />
          </span>
        ),
      },
      {
        label: translate('common.status.delivery_status'),
        key: 'statusDelivery',
        align: 'center',
        sortable: true,
        width: 'w-[12%]',
        render: (row) => {
          const st = row.statusDelivery || '-';
          const badgeClass = getStatusClass(st);
          return (
            <div className="flex justify-center text-center">
              <span
                className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide uppercase ${badgeClass}`}
              >
                <HighlightText text={formatStatus(st)} highlight={searchQuery} />
              </span>
            </div>
          );
        },
      },
      {
        label: translate('common.driver'),
        key: 'driverName',
        sortable: true,
        width: 'w-[14%]',
        render: (row) => (
          <div className="flex flex-col text-left">
            <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
              <HighlightText text={row.driverName || '-'} highlight={searchQuery} />
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              <HighlightText text={getBasePlate(row.plat) || '-'} highlight={searchQuery} />
            </span>
          </div>
        ),
      },
      {
        label: translate('common.created_by') || 'Dibuat Oleh',
        key: 'createdBy',
        width: 'w-[9%]',
        render: (row) => {
          const tu = row.task_user || row.taskUser;
          return (
            <UserAuditCell
              user={tu?.created_by || row.createdBy}
              timestamp={tu?.created_at || row.createdAt}
              highlight={searchQuery}
            />
          );
        },
      },
      {
        label: translate('common.updated_by') || 'Diperbarui Oleh',
        key: 'updatedBy',
        width: 'w-[9%]',
        render: (row) => {
          const tu = row.task_user || row.taskUser;
          return (
            <UserAuditCell
              user={tu?.updated_by || row.updatedBy}
              timestamp={tu?.updated_at || row.updatedAt}
              highlight={searchQuery}
            />
          );
        },
      },
      {
        label: translate('common.sync_by'),
        key: 'syncBy',
        width: 'w-[9%]',
        render: (row) => {
          const su = row.sync_user || row.syncUser;
          return (
            <UserAuditCell
              user={su?.updated_by || su?.created_by}
              timestamp={su?.updated_at || su?.created_at}
              highlight={searchQuery}
            />
          );
        },
      },
    ],
    [formatStatus, getStatusClass, translate, searchQuery]
  );

  const locationColumns = useMemo(
    () => [
      {
        label: '#',
        key: 'no',
        align: 'center',
        width: 'w-12',
        render: (_, i) => (
          <div className="flex justify-center text-center">
            <span className="text-xs text-slate-500 dark:text-slate-400">{i + 1}</span>
          </div>
        ),
      },
      {
        label: translate('common.driver'),
        key: 'driverName',
        sortable: true,
        width: 'w-[24%]',
        render: (row) => (
          <div className="flex flex-col text-left">
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              <HighlightText
                text={row.driver_name || row.driverName || '-'}
                highlight={searchQuery}
              />
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              <HighlightText text={row.email || '-'} highlight={searchQuery} />
            </span>
          </div>
        ),
      },
      {
        label: translate('common.start_time'),
        key: 'start_time',
        sortable: true,
        align: 'center',
        width: 'w-[18%]',
        render: (row) => {
          const val = row.start_time || row.startTime;
          return (
            <div className="flex justify-center text-center">
              <span className="text-xs text-slate-700 dark:text-slate-300">
                {val ? formatDateUniversal(val, 'DD-MM-YYYY HH:mm:ss') : '-'}
              </span>
            </div>
          );
        },
      },
      {
        label: translate('common.finish_time'),
        key: 'finish_time',
        sortable: true,
        align: 'center',
        width: 'w-[18%]',
        render: (row) => {
          const finish = row.finish || {};
          const val = finish.finishTime || row.finish_time || row.finishTime;
          return (
            <div className="flex justify-center text-center">
              <span className="text-xs text-slate-700 dark:text-slate-300">
                {val ? formatDateUniversal(val, 'DD-MM-YYYY HH:mm:ss') : '-'}
              </span>
            </div>
          );
        },
      },
      {
        label: translate('common.duration'),
        key: 'duration',
        align: 'center',
        width: 'w-[12%]',
        render: (row) => {
          const finish = row.finish || {};
          const dur = finish.totalDuration ?? row.total_duration ?? row.totalDuration;
          return (
            <div className="flex justify-center text-center">
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                {dur != null && dur !== '' ? formatDurationHHMMSS(dur) : '-'}
              </span>
            </div>
          );
        },
      },
      {
        label: translate('common.distance'),
        key: 'distance',
        align: 'center',
        width: 'w-[12%]',
        render: (row) => {
          const finish = row.finish || {};
          const dist = finish.totalDistance ?? row.total_distance ?? row.totalDistance;
          return (
            <div className="flex justify-center text-center">
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                {dist != null && dist !== '' ? `${Number(dist).toFixed(2)}` : '-'}
              </span>
            </div>
          );
        },
      },
      {
        label: translate('common.sync_by'),
        key: 'syncBy',
        width: 'w-[16%]',
        render: (row) => {
          const su = row.sync_user || row.syncUser;
          return (
            <UserAuditCell
              user={su?.updated_by || su?.created_by || row.updatedBy}
              timestamp={su?.updated_at || su?.created_at || row.updatedAt}
              highlight={searchQuery}
            />
          );
        },
      },
    ],
    [translate, searchQuery]
  );

  const filteredRouting = useMemo(() => {
    if (!searchQuery.trim()) return currentData.routing;
    const q = searchQuery.toLowerCase().trim();
    return currentData.routing.filter(
      (r) =>
        (r.name || '').toLowerCase().includes(q) ||
        (r.createdBy || '').toLowerCase().includes(q) ||
        (r.updatedBy || '').toLowerCase().includes(q)
    );
  }, [currentData.routing, searchQuery]);

  const filteredTasks = useMemo(() => {
    if (!searchQuery.trim()) return currentData.tasks;
    const q = searchQuery.toLowerCase().trim();
    return currentData.tasks.filter(
      (t) =>
        (t.flow || '').toLowerCase().includes(q) ||
        (t.customerOrder || t.customer_order || '').toLowerCase().includes(q) ||
        (t.customerName || '').toLowerCase().includes(q) ||
        (t.truncateInvoice || t.orderId || '').toLowerCase().includes(q) ||
        (t.address || '').toLowerCase().includes(q) ||
        (t.statusDelivery || '').toLowerCase().includes(q) ||
        (t.driverName || '').toLowerCase().includes(q) ||
        (t.plat || '').toLowerCase().includes(q)
    );
  }, [currentData.tasks, searchQuery]);

  const filteredLocations = useMemo(() => {
    if (!searchQuery.trim()) return currentData.locations;
    const q = searchQuery.toLowerCase().trim();
    return currentData.locations.filter(
      (l) =>
        (l.driver_name || l.driverName || '').toLowerCase().includes(q) ||
        (l.email || '').toLowerCase().includes(q)
    );
  }, [currentData.locations, searchQuery]);

  const subTabs = [
    { key: 'routing', label: translate('common.routing'), count: currentData.routing.length },
    { key: 'task', label: translate('common.task'), count: currentData.tasks.length },
    {
      key: 'location',
      label: translate('common.driver_location'),
      count: currentData.locations.length,
    },
    {
      key: 'kpi',
      label: (
        <span className="inline-flex items-center gap-1.5">
          <span>KPI</span>
          {Boolean(
            currentData.kpi && (currentData.kpi.created_by || currentData.kpi.updated_by)
          ) && (
            <InformationButton
              infoText={
                <div className="flex flex-col gap-1 text-left min-w-[190px]">
                  <div>
                    <span className="text-slate-400 font-semibold">
                      {translate('common.created_by')}:{' '}
                    </span>
                    <span className="font-medium text-white">
                      {`${currentData.kpi.created_by || '-'} (${formatDateUniversal(currentData.kpi.created_time, 'DD/MM/YY HH:mm:ss')})`}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold">
                      {translate('common.updated_by')}:{' '}
                    </span>
                    <span className="font-medium text-white">
                      {`${currentData.kpi.updated_by || '-'} (${formatDateUniversal(currentData.kpi.updated_time, 'DD/MM/YY HH:mm:ss')})`}
                    </span>
                  </div>
                </div>
              }
              size="3.5"
            />
          )}
        </span>
      ),
    },
  ];

  const renderKpiCards = () => {
    const kpi = currentData.kpi;
    if (!kpi) {
      return (
        <div className="p-4 text-center text-xs text-gray-500 flex justify-center items-center h-full min-h-[300px]">
          {translate('common.no_data')}
        </div>
      );
    }

    const groups = [
      {
        title: translate('common.vehicle'),
        items: [
          { label: 'Dry', val: kpi.truck_dry ?? 0 },
          { label: 'Frozen', val: kpi.truck_frz ?? 0 },
          { label: 'Total', val: kpi.total_truck ?? 0, bold: true },
        ],
      },
      {
        title: translate('common.task'),
        items: [
          { label: 'Dry', val: kpi.task_dry ?? 0 },
          { label: 'Frozen', val: kpi.task_frz ?? 0 },
          { label: 'Total', val: (kpi.task_dry ?? 0) + (kpi.task_frz ?? 0), bold: true },
        ],
      },
      {
        title: 'Pending',
        items: [
          { label: 'Dry', val: kpi.pending_dry ?? 0 },
          { label: 'Frozen', val: kpi.pending_frz ?? 0 },
          { label: translate('common.routing'), val: kpi.pending_routing ?? 0 },
          { label: translate('common.driver'), val: kpi.pending_driver ?? 0 },
          { label: 'Sales', val: kpi.pending_sales ?? 0 },
          { label: translate('common.customer'), val: kpi.pending_customer ?? 0 },
          { label: translate('common.others'), val: kpi.pending_other ?? 0 },
        ],
      },
      {
        title: translate('common.duration'),
        items: [
          {
            label: `${translate('common.estimate')} (Dry)`,
            val: kpi.est_hour_dry ?? 0,
          },
          {
            label: `${translate('common.actual')} (Dry)`,
            val: kpi.act_hour_dry ?? 0,
          },
          {
            label: `${translate('common.estimate')} (Frozen)`,
            val: kpi.est_hour_frz ?? 0,
          },
          {
            label: `${translate('common.actual')} (Frozen)`,
            val: kpi.act_hour_frz ?? 0,
          },
        ],
      },
      {
        title: translate('common.distance'),
        items: [
          {
            label: `${translate('common.estimate')} (Dry)`,
            val: kpi.est_dist_dry ?? 0,
          },
          {
            label: `${translate('common.actual')} (Dry)`,
            val: kpi.act_dist_dry ?? 0,
          },
          {
            label: `${translate('common.estimate')} (Frozen)`,
            val: kpi.est_dist_frz ?? 0,
          },
          {
            label: `${translate('common.actual')} (Frozen)`,
            val: kpi.act_dist_frz ?? 0,
          },
        ],
      },
      {
        title: translate('common.capacity'),
        items: [
          {
            label: 'Dry (kg)',
            val: `${kpi.total_kg_dry ?? 0} / ${kpi.capacity_kg_dry ?? 0}`,
          },
          {
            label: 'Dry (cbm)',
            val: `${kpi.total_cbm_dry ?? 0} / ${kpi.capacity_cbm_dry ?? 0}`,
          },
          {
            label: 'Frozen (kg)',
            val: `${kpi.total_kg_frz ?? 0} / ${kpi.capacity_kg_frz ?? 0}`,
          },
          {
            label: 'Frozen (cbm)',
            val: `${kpi.total_cbm_frz ?? 0} / ${kpi.capacity_cbm_frz ?? 0}`,
          },
        ],
      },
    ];

    return (
      <div className="flex-1 overflow-y-auto pr-1">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((g) => (
            <div
              key={g.title}
              className="p-4 rounded-xl border border-gray-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 flex flex-col gap-2.5 shadow-xs overflow-hidden"
            >
              <div className="flex items-center justify-between border-b border-gray-200 dark:border-slate-800 pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 truncate">
                  {g.title}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                {g.items.map((it) => (
                  <div
                    key={it.label}
                    className="flex items-baseline text-xs py-1 px-1.5 rounded hover:bg-white dark:hover:bg-slate-800/60 transition-colors w-full min-w-0"
                  >
                    <span className="text-slate-600 dark:text-slate-400 shrink-0 truncate max-w-[65%]">
                      {it.label}
                    </span>
                    <span className="flex-1 mx-2 border-b border-dotted border-gray-300 dark:border-slate-700 min-w-2"></span>
                    <span
                      className={`shrink-0 font-semibold text-right tabular-nums ${
                        it.bold
                          ? 'text-sky-600 dark:text-sky-400 font-bold'
                          : 'text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      {it.val}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderActiveTable = () => {
    switch (activeSubTab) {
      case 'routing':
        return (
          <TableData
            columns={routingColumns}
            data={filteredRouting}
            isLoading={isLoading}
            paginate={true}
          />
        );
      case 'task':
        return (
          <TableData
            columns={taskColumns}
            data={filteredTasks}
            isLoading={isLoading}
            paginate={true}
          />
        );
      case 'location':
        return (
          <TableData
            columns={locationColumns}
            data={filteredLocations}
            isLoading={isLoading}
            paginate={true}
          />
        );
      case 'kpi':
        return renderKpiCards();
      default:
        return null;
    }
  };

  return (
    <div className="w-full flex flex-col h-full gap-4">
      <Card className="flex flex-col min-h-[620px] max-h-[620px] p-0!">
        <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3 p-4 border-b border-gray-100 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 overflow-x-auto p-1 bg-slate-100 dark:bg-slate-800/80 rounded-lg border border-gray-200 dark:border-slate-700 max-w-full">
              {subTabs.map((st) => (
                <button
                  key={st.key}
                  type="button"
                  onClick={() => setActiveSubTab(st.key)}
                  className={`inline-flex items-center justify-center h-8 px-3 rounded-md text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer shrink-0 leading-none ${
                    activeSubTab === st.key
                      ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {st.label} {st.count ? `(${st.count})` : ''}
                </button>
              ))}
            </div>
            {datesList.length > 1 && (
              <div className="flex items-center gap-2 h-10 px-2 bg-slate-100 dark:bg-slate-800/80 rounded-lg border border-gray-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setCurrentDateIndex((prev) => Math.max(0, prev - 1))}
                  disabled={currentDateIndex === 0}
                  className="inline-flex items-center justify-center h-7 px-2 text-xs font-bold rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  &lt;
                </button>

                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 px-1 whitespace-nowrap">
                  {formatDateUniversal(selectedDate, 'DD/MM/YY')}
                </span>

                <button
                  type="button"
                  onClick={() =>
                    setCurrentDateIndex((prev) => Math.min(datesList.length - 1, prev + 1))
                  }
                  disabled={currentDateIndex >= datesList.length - 1}
                  className="inline-flex items-center justify-center h-7 px-2 text-xs font-bold rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  &gt;
                </button>
              </div>
            )}
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            {activeSubTab !== 'kpi' && (
              <div className="w-full ">
                <SearchBar
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder={translate('common.search')}
                  size="sm"
                />
              </div>
            )}
            <Button
              type={datesList.length > 1 ? 'split' : 'button'}
              onClick={handleExportZip}
              isLoading={isExporting}
              disabled={isExporting || hasNoData}
              width="w-full sm:w-auto"
              size="sm"
              text={translate('common.download')}
              options={[
                {
                  id: 'current',
                  label: `${translate('common.download')} (${formatDateUniversal(selectedDate, 'DD/MM/YY')})`,
                  onClick: handleExportCurrent,
                  disabled: isExporting || hasNoData,
                },
              ]}
            />
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col min-h-0">{renderActiveTable()}</div>
      </Card>
    </div>
  );
}
