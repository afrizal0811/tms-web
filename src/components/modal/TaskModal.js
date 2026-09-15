'use client';

import Accordion from '@/components/Accordion';
import Spinner from '@/components/Spinner';
import TableData from '@/components/table/TableData';
import { useLanguage } from '@/context/LanguageContext';
import { getResult, getTask, getUsers } from '@/lib/api/mileapp';
import { useSuperadmin } from '@/lib/hooks/useSuperadmin';
import { toastError } from '@/lib/toast';
import {
  formatDateUniversal,
  formatUTC7,
  getBasePlate,
  isEmpty,
  parseCustomerString,
  ProperCaseText,
} from '@/lib/utils';
import { useEffect, useState } from 'react';
import CopyButton from '../button/CopyButton';
import JsonTree from '../JsonTree';
import Map from '../Map';
import Tooltip from '../Tooltip';
import Modal from './Modal';

const Field = ({
  label,
  value,
  tooltip,
  isCopy,
  copyValue,
  isTruncated,
  onValueClick,
  needEmpty = false,
}) => (
  <div className="mb-3">
    <div className="text-xs text-gray-500 dark:text-slate-400">{label}</div>
    <Tooltip tooltipContent={tooltip}>
      <div
        className={`text-sm font-medium text-slate-800 dark:text-slate-200 ${onValueClick ? ' cursor-pointer underline decoration-dotted decoration-2 underline-offset-5' : ''} ${isCopy && 'flex items-center gap-1'} ${isTruncated && 'truncate'}`}
        onClick={onValueClick}
      >
        {!needEmpty && isEmpty(value) ? '-' : String(value)}{' '}
        {!isEmpty(value) && isCopy && <CopyButton text={copyValue || value} />}
      </div>
    </Tooltip>
  </div>
);

export default function TaskModal({ isOpen, onClose, taskId, driverData = [], allTasks = [] }) {
  const [loading, setLoading] = useState(false);
  const [taskData, setTaskData] = useState(null);
  const [activeTab, setActiveTab] = useState('Data');
  const [createdBy, setCreatedBy] = useState(null);
  const [updatedBy, setUpdatedBy] = useState(null);
  const [resultData, setResultData] = useState(null);

  const { t: translate, isIndonesian } = useLanguage();
  const { isSuperadmin } = useSuperadmin();

  useEffect(() => {
    if (!isOpen || !taskId || taskId === '-') {
      setTaskData(null);
      setResultData(null);
      setActiveTab('Data');
      return;
    }

    const loadData = async () => {
      setLoading(true);
      try {
        const response = await getTask(taskId);
        const task = response?.task || response;
        setTaskData(task);

        const [createdRes, updatedRes, resultRes] = await Promise.allSettled([
          task?.createdBy ? getUsers(task.hubId, task.createdBy) : Promise.resolve(null),
          task?.updatedBy ? getUsers(task.hubId, task.updatedBy) : Promise.resolve(null),
          task?.routingResultId ? getResult(task.routingResultId) : Promise.resolve(null),
        ]);

        setCreatedBy(
          createdRes.status === 'fulfilled' && createdRes.value && !createdRes.value.data
            ? createdRes.value[0]?.name
            : task?.createdBy
        );
        setUpdatedBy(
          updatedRes.status === 'fulfilled' && updatedRes.value && !updatedRes.value.data
            ? updatedRes.value[0]?.name
            : task?.updatedBy
        );
        setResultData(
          resultRes.status === 'fulfilled' && resultRes.value && resultRes.value?.data
            ? resultRes.value?.data || resultRes.value
            : null
        );
      } catch (err) {
        toastError(translate('common.toast.error', { err: err.message }));
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [isOpen, taskId, translate]);

  const renderDate = (val) => {
    if (!val) return '-';
    return formatUTC7(val, 'DD/MM/YYYY HH:mm');
  };

  const renderCoordinate = (val) => {
    if (!val) return '-';
    const [lat, lng] = val.split(',').map((coord) => Number(coord).toFixed(7));
    return `${lat}, ${lng}`;
  };
  const renderFloatData = (val) => {
    if (!val) return 0;
    return Number(val).toFixed(2);
  };

  const getSubtitle = () => {
    if (!taskData) return '';
    const status = taskData.status || '-';
    const statusDelivery = taskData.statusDelivery?.[0];
    const subtitleText = statusDelivery ? `${status} | ${statusDelivery}` : status;
    return subtitleText.toUpperCase();
  };

  const getActionStyle = (action) => {
    const act = (action || '').toLowerCase();
    switch (act) {
      case 'create':
        return 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400';
      case 'patch':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400';
      case 'put':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400';
      case 'assign':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400';
      case 'unassign':
        return 'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-400';
      case 'complete':
        return 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-400';
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
    }
  };

  const extractPutDifferences = (historiesList) => {
    if (!historiesList || historiesList.length === 0) return [];

    const sorted = [...historiesList].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    const isObjOrArray = (val) => val !== null && typeof val === 'object';
    let currentState = {};
    const differences = [];

    sorted.forEach((history) => {
      const isPut = history.action && history.action.toLowerCase() === 'put';
      const cData = history.changeData || {};

      if (isPut) {
        const diffsForThisPut = [];

        Object.keys(cData).forEach((key) => {
          const newVal = cData[key];
          const oldVal = currentState[key];

          if (isObjOrArray(newVal) && isObjOrArray(oldVal)) {
            if (JSON.stringify(newVal) !== JSON.stringify(oldVal)) {
              diffsForThisPut.push({ key, oldVal, newVal });
            }
          } else if (newVal !== oldVal) {
            diffsForThisPut.push({ key, oldVal, newVal });
          }
        });

        differences.push({ id: history._id || history.createdAt, diffs: diffsForThisPut });
      }

      currentState = { ...currentState, ...cData };
    });

    return differences;
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex justify-center items-center p-10 min-h-[300px]">
          <Spinner />
        </div>
      );
    }

    if (!taskData) {
      return <div className="p-4 text-center text-gray-500">{translate('common.no_data')}</div>;
    }

    const custInfo = parseCustomerString(taskData.customerOrder);
    const assigneeEmail = taskData.assignee?.[0];
    const driver =
      driverData.find(
        (d) => String(d.email).toLowerCase() === String(assigneeEmail).toLowerCase()
      ) || {};

    const maxVehicle = driver.type || taskData?.maksimumVehicleType || '-';
    const assigneeName = driver.name || assigneeEmail || '-';
    const licenseNumber = getBasePlate(driver.plat) || '-';

    const products = taskData.listProduct || [];
    const uniqueProducts = new Set(products.map((p) => p.title)).size;
    const totalItems = products.reduce((acc, p) => acc + (Number(p.qtyProcessed) || 0), 0);

    const histories = [...(taskData.histories || [])].sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    const putDiffs = extractPutDifferences(taskData.histories || []);

    const hasMap = !!taskData.doneCoordinate;
    const goToMapTab = hasMap ? () => setActiveTab(translate('task_detail.modal.map')) : undefined;
    const tabs = [
      'Data',
      translate('common.routing'),
      translate('task_detail.modal.list_product'),
      translate('task_detail.modal.history'),
      ...(hasMap ? [translate('task_detail.modal.map')] : []),
      ...(isSuperadmin
        ? [`JSON ${translate('common.task')}`, `JSON ${translate('common.routing')}`]
        : []),
    ];

    const productColumns = [
      {
        key: 'caption',
        sortable: true,
        label: translate('common.invoice_number'),
        render: (row) => row.caption || '-',
      },
      {
        key: 'title',
        sortable: true,
        label: translate('common.items'),
        render: (row) => (
          <div className="max-w-xs truncate" title={row.title}>
            {row.title || '-'}
          </div>
        ),
      },
      {
        key: 'qtyProcessed',
        sortable: true,
        label: translate('common.quantity'),
        render: (row) => row.qtyProcessed ?? '-',
      },
      {
        key: 'content',
        sortable: true,
        label: 'UOM',
        render: (row) => row.content || '-',
      },
      {
        key: 'volume',
        sortable: true,
        label: translate('common.volume'),
        render: (row) => renderFloatData(row.volume) ?? '-',
      },
      {
        key: 'weight',
        sortable: true,
        label: translate('common.weight'),
        render: (row) => renderFloatData(row.weight) ?? '-',
      },
    ];
    const isAutomation =
      taskData.createdFrom.toLowerCase() === 'automation' ||
      taskData.createdBy.toLowerCase() === 'system';
    const CorrectCord =
      {
        YA: isIndonesian ? 'Ya' : 'Yes',
        TIDAK: isIndonesian ? 'Tidak' : 'No',
      }[taskData.gpsSesuai?.[0]] ?? '-';
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 border border-gray-200 dark:border-slate-700 rounded-lg bg-gray-50 dark:bg-slate-900/50">
          <Field
            label={translate('common.customer_name')}
            value={custInfo.fullCustomerName}
            isCopy={true}
          />
          <Field
            label={translate('common.address')}
            value={taskData.address}
            isTruncated={true}
            tooltip={taskData.address}
          />
          <Field
            label={translate('common.invoice_number')}
            value={custInfo.truncateInvoice || custInfo.invoiceNumber}
            tooltip={custInfo.isTruncated ? custInfo.invoiceNumber : null}
            isCopy={true}
            copyValue={custInfo.invoiceNumber}
          />
          <Field label={translate('common.storage_type')} value={taskData.typeStorage} />
          <Field label={translate('common.vehicle_type')} value={maxVehicle} />
          <Field
            label={translate('common.updated_by')}
            value={driver.name || updatedBy || taskData.updatedBy}
            tooltip={taskData.updatedBy}
            isCopy={true}
            copyValue={taskData.updatedBy}
          />
          <Field label={translate('common.updated_at')} value={renderDate(taskData.updatedTime)} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border border-gray-200 dark:border-slate-700 rounded-lg p-4 bg-white dark:bg-slate-800">
            <h3 className="font-bold text-sky-600 dark:text-sky-400 border-b border-gray-200 dark:border-slate-700 pb-2 mb-4">
              {translate('task_detail.modal.creation')}
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <Field
                label={translate('common.created_by')}
                value={createdBy}
                tooltip={isAutomation ? null : taskData.createdBy}
                isCopy={isAutomation ? false : true}
                copyValue={isAutomation ? null : taskData.createdBy}
              />
              <Field
                label={translate('common.created_time')}
                value={renderDate(taskData.createdTime)}
              />
              <Field label={translate('common.created_from')} value={taskData.createdFrom} />
              <Field
                label={translate('common.start_time')}
                value={renderDate(taskData.startTime)}
              />
            </div>
          </div>
          <div className="border border-gray-200 dark:border-slate-700 rounded-lg p-4 bg-white dark:bg-slate-800">
            <h3 className="font-bold text-sky-600 dark:text-sky-400 border-b border-gray-200 dark:border-slate-700 pb-2 mb-4">
              {translate('task_detail.modal.assigment')}
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <Field
                label={translate('common.driver')}
                value={assigneeName}
                tooltip={assigneeName === assigneeEmail ? null : assigneeEmail}
                isCopy={true}
                copyValue={assigneeEmail}
              />
              <Field label={translate('common.license_number')} value={licenseNumber} />
              <Field
                label={translate('common.assigned_time')}
                value={renderDate(taskData.assignedTime)}
              />
              <Field label={translate('common.done_time')} value={renderDate(taskData.doneTime)} />
            </div>
          </div>
        </div>
        <Accordion title={translate('common.more')} defaultOpen={false}>
          <div className="flex overflow-x-auto space-x-6 border-b border-gray-200 dark:border-slate-700 mb-4 px-2">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-2 whitespace-nowrap text-sm font-medium transition-colors outline-none ${
                  activeTab === tab
                    ? 'border-b-2 border-sky-500 text-sky-600 dark:text-sky-400'
                    : 'text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="p-2 min-h-[200px]">
            {activeTab === 'Data' &&
              (() => {
                let arrivalSource, departureSource;
                const isGrOrPickup =
                  taskData.flow.toUpperCase().includes('GR') ||
                  taskData.flow.toUpperCase().includes('PICKUP');
                if (isGrOrPickup) {
                  arrivalSource = taskData.page1DoneTime;
                  departureSource = taskData.doneTime;
                } else {
                  arrivalSource = taskData.klikJikaSudahSampai || taskData.klikJikaAndaSudahSampai;
                  departureSource = taskData.page3DoneTime;
                }
                const arrObj = renderDate(arrivalSource);
                const depObj = renderDate(departureSource);
                let actualVisitMins = 0;
                if (arrivalSource && departureSource) {
                  const tArr = new Date(arrObj);
                  const tDep = new Date(depObj);
                  tArr.setSeconds(0, 0);
                  tDep.setSeconds(0, 0);
                  const diff = tDep.getTime() - tArr.getTime();
                  if (diff > 0) {
                    actualVisitMins = Math.floor(diff / (1000 * 60));
                  } else if (diff === 0) {
                    actualVisitMins = 0;
                  } else {
                    actualVisitMins = 0;
                  }
                } else actualVisitMins = '-';
                let actualSeq = '-';
                const statusDelivery = taskData.statusDelivery?.[0] || '-';

                if (!isEmpty(statusDelivery))
                  actualSeq =
                    [...allTasks]
                      .filter((t) => t.assignee?.[0] === taskData.assignee?.[0])
                      .sort((a, b) => {
                        const getDep = (x) => {
                          const flow = (x.flow || '').toUpperCase();
                          return flow.includes('GR') || flow.includes('PICKUP')
                            ? x.doneTime
                            : x.page3DoneTime;
                        };
                        return (
                          new Date(getDep(a) || 0).getTime() - new Date(getDep(b) || 0).getTime()
                        );
                      })
                      .findIndex((t) => t._id === taskData._id) + 1;

                return (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Field label={translate('common.task_id')} value={taskData._id} isCopy={true} />
                    <Field label={translate('common.open_time')} value={taskData.openTime} />
                    <Field label={translate('common.close_time')} value={taskData.closeTime} />
                    <Field
                      label={translate('common.volume')}
                      value={renderFloatData(taskData.volumeCbm)}
                      needEmpty={true}
                    />
                    <Field
                      label={translate('common.weight')}
                      value={renderFloatData(taskData.weightKg)}
                      needEmpty={true}
                    />
                    <Field
                      label={translate('common.actual_arrival')}
                      value={renderDate(arrivalSource)}
                    />
                    <Field
                      label={translate('common.actual_departure')}
                      value={renderDate(departureSource)}
                    />
                    <Field
                      label={`${translate('common.visit_actual')} (${translate('common.minute')})`}
                      value={actualVisitMins}
                      needEmpty={true}
                    />
                    <Field
                      label={translate('common.actual_seq')}
                      value={actualSeq > 0 ? actualSeq : '-'}
                    />
                    <Field
                      label={translate('task_detail.modal.expected_coord')}
                      value={renderCoordinate(taskData.longlat)}
                      isCopy={true}
                      onValueClick={goToMapTab}
                    />
                    <Field
                      label={translate('task_detail.modal.done_coord')}
                      value={renderCoordinate(taskData.doneCoordinate)}
                      isCopy={true}
                      onValueClick={goToMapTab}
                    />
                    <Field
                      label={translate('task_detail.modal.correct_coord')}
                      value={CorrectCord}
                    />
                    {(CorrectCord === 'Tidak' || CorrectCord === 'No') && (
                      <Field
                        label={translate('task_detail.modal.new_coord')}
                        value={renderCoordinate(taskData.klikLokasiClient)}
                        isCopy={true}
                        onValueClick={goToMapTab}
                      />
                    )}
                    {taskData.alasan && (
                      <Field
                        label={translate('task_detail.modal.reason')}
                        value={taskData.alasan}
                        isTruncated={true}
                      />
                    )}
                    <Field
                      label={translate('common.travel_distance_actual')}
                      value={renderFloatData(taskData.travelDistance / 1000)}
                    />
                    <Field
                      label={translate('common.travel_duration_actual')}
                      value={renderFloatData(taskData?.travelDuration / 60)}
                    />
                  </div>
                );
              })()}

            {activeTab === translate('task_detail.modal.map') &&
              hasMap &&
              (() => {
                const parseCoord = (coordStr) => {
                  if (!coordStr) return null;
                  const [lat, lng] = coordStr.split(',').map(Number);
                  if (isNaN(lat) || isNaN(lng)) return null;
                  return [lat, lng];
                };
                const expectedCoord = parseCoord(taskData.longlat);
                const doneCoord = parseCoord(taskData.doneCoordinate);
                const newCoord = parseCoord(taskData.klikLokasiClient);
                const mapBounds = [expectedCoord, doneCoord, newCoord].filter(Boolean);

                return (
                  <div className="w-full h-[50vh] relative z-0 border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden">
                    <Map
                      bounds={mapBounds}
                      onMapReady={(map) => {
                        map.dragging.disable();
                        setTimeout(() => {
                          map.setMinZoom(map.getZoom());
                        }, 500);
                      }}
                    >
                      {(rl, L, icons) => (
                        <>
                          {expectedCoord && (
                            <rl.Marker
                              position={expectedCoord}
                              icon={icons.circle('E', 'bg-blue-500', 'text-xs')}
                            >
                              <rl.Tooltip direction="top" offset={[0, -10]}>
                                {translate('task_detail.modal.expected_coord')}
                              </rl.Tooltip>
                            </rl.Marker>
                          )}
                          {doneCoord && (
                            <rl.Marker
                              position={doneCoord}
                              icon={icons.circle(
                                isIndonesian ? 'S' : 'D',
                                'bg-green-500',
                                'text-xs'
                              )}
                            >
                              <rl.Tooltip direction="top" offset={[0, -10]}>
                                {translate('task_detail.modal.done_coord')}
                              </rl.Tooltip>
                            </rl.Marker>
                          )}
                          {newCoord && (
                            <rl.Marker
                              position={newCoord}
                              icon={icons.circle(
                                isIndonesian ? 'B' : 'N',
                                'bg-orange-500',
                                'text-xs'
                              )}
                            >
                              <rl.Tooltip direction="top" offset={[0, -10]}>
                                {translate('task_detail.modal.new_coord')}
                              </rl.Tooltip>
                            </rl.Marker>
                          )}
                        </>
                      )}
                    </Map>
                  </div>
                );
              })()}

            {activeTab === translate('common.routing') &&
              (() => {
                let rTravelTime = 0;
                let rWaitingTime = 0;
                let rVisitTime = 0;
                const rName = resultData?.name || '-';

                if (resultData?.result?.routing && assigneeEmail) {
                  const vehicleMatch = resultData.result.routing.find(
                    (v) => String(v.assignee).toLowerCase() === String(assigneeEmail).toLowerCase()
                  );
                  if (vehicleMatch && vehicleMatch.trips) {
                    const targetVisitId = `taskId-${taskData._id}`;
                    const tripMatch = vehicleMatch.trips.find((t) => t.visitId === targetVisitId);
                    if (tripMatch) {
                      rTravelTime = tripMatch.travelTime;
                      rWaitingTime = tripMatch.waitingTime;
                      rVisitTime = tripMatch.visitTime;
                    }
                  }
                }

                return (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Field
                      label={translate('common.routing_id')}
                      value={taskData.routingResultId}
                      isCopy={true}
                      isTruncated={true}
                    />
                    <Field
                      label={translate('common.routing_name')}
                      value={rName}
                      isCopy={true}
                      isTruncated={true}
                    />
                    <Field label={translate('common.eta')} value={taskData.eta} />
                    <Field label={translate('common.etd')} value={taskData.etd} />
                    <Field
                      label={`${translate('common.visit_plan')} (${translate('common.minute')})`}
                      value={rVisitTime}
                    />
                    <Field label={translate('common.ro_seq')} value={taskData.routePlannedOrder} />
                    <Field
                      label={translate('common.travel_distance_plan')}
                      value={renderFloatData(taskData.distance / 1000)}
                      needEmpty={true}
                    />
                    <Field
                      label={translate('common.travel_duration_plan')}
                      value={renderFloatData(rTravelTime / 60)}
                      needEmpty={true}
                    />
                    <Field
                      label={translate('task_detail.modal.waiting_time')}
                      value={renderFloatData(rWaitingTime / 60)}
                      needEmpty={true}
                    />
                  </div>
                );
              })()}

            {activeTab === translate('task_detail.modal.list_product') && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-2">
                  <Field
                    label={translate('task_detail.modal.total_product')}
                    value={uniqueProducts}
                  />
                  <Field label={translate('task_detail.modal.total_item')} value={totalItems} />
                </div>
                <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-slate-700 flex flex-col max-h-[60vh]">
                  <TableData
                    columns={productColumns}
                    data={products}
                    emptyMessage={translate('common.no_data')}
                  />
                </div>
              </div>
            )}

            {activeTab === translate('task_detail.modal.history') && (
              <div className="py-2 max-h-[60vh] overflow-y-auto pr-2">
                {histories.length > 0 ? (
                  <div className="border-l-2 border-sky-300 dark:border-sky-700 ml-4 space-y-6">
                    {histories.map((h, i) => (
                      <div key={i} className="relative pl-6">
                        <div className="absolute -left-[9px] top-1.5 h-4 w-4 rounded-full bg-sky-500 ring-4 ring-white dark:ring-slate-800" />
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-1">
                          <span
                            className={`text-[11px] px-2 py-0.5 rounded-md font-bold capitalize w-fit tracking-wide ${getActionStyle(h.action)}`}
                          >
                            {h.action || '-'}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-slate-400 mt-1 sm:mt-0">
                            {renderDate(h.createdAt)}
                          </span>
                        </div>
                        <div className="text-xs font-medium text-sky-600 dark:text-sky-400 mb-1">
                          {h.changedBy || '-'}
                        </div>
                        <div className="text-sm text-slate-600 dark:text-slate-300 wrap-break-words">
                          {h.notes || '-'}
                          {h.action &&
                            h.action.toLowerCase() === 'put' &&
                            (() => {
                              const diffMatch = putDiffs.find(
                                (d) => d.id === (h._id || h.createdAt)
                              );
                              if (diffMatch && diffMatch.diffs.length > 0) {
                                const formatVal = (v) => {
                                  if (typeof v === 'object') return JSON.stringify(v);
                                  const str = String(v);
                                  if (/^\d{4}-\d{2}-\d{2}T/.test(str)) {
                                    return formatDateUniversal(str, 'DD-MM-YYYY HH:mm');
                                  }
                                  return str;
                                };
                                return (
                                  <details className="mt-1.5 group">
                                    <summary className="text-[11px] text-sky-600 dark:text-sky-400 cursor-pointer select-none font-medium hover:underline outline-none w-fit">
                                      {translate('task_detail.modal.view_changes')} (
                                      {diffMatch.diffs.length})
                                    </summary>
                                    <div className="mt-1.5 pl-2.5 border-l-2 border-slate-200 dark:border-slate-700 space-y-1.5 max-h-[150px] overflow-y-auto">
                                      {diffMatch.diffs.map((d, idx) => (
                                        <div
                                          key={idx}
                                          className="text-[10px] font-mono bg-slate-100 dark:bg-slate-900/60 p-1.5 rounded"
                                        >
                                          <div className="font-bold text-slate-700 dark:text-slate-300 mb-0.5">
                                            {ProperCaseText(d.key)}
                                          </div>
                                          <div
                                            className="text-red-500 dark:text-red-400 truncate"
                                            title={formatVal(d.oldVal)}
                                          >
                                            - {formatVal(d.oldVal)}
                                          </div>
                                          <div
                                            className="text-emerald-600 dark:text-emerald-400 truncate"
                                            title={formatVal(d.newVal)}
                                          >
                                            + {formatVal(d.newVal)}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </details>
                                );
                              }
                              return null;
                            })()}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-sm text-gray-500 p-4">
                    {translate('common.no_data')}
                  </div>
                )}
              </div>
            )}

            {activeTab === `JSON ${translate('common.task')}` && (
              <div className="relative bg-slate-950 border border-slate-800 rounded-lg p-4 max-h-[60vh] overflow-y-auto">
                <div className="absolute top-2 right-2 z-10 bg-slate-900/80 rounded-md">
                  <CopyButton
                    text={JSON.stringify(taskData, null, 2)}
                    className="text-white hover:text-sky-300"
                  />
                </div>
                <div className="text-[13px] font-mono leading-relaxed">
                  <JsonTree data={taskData} label={null} isLast={true} defaultOpen={true} />
                </div>
              </div>
            )}
            {activeTab === `JSON ${translate('common.routing')}` && (
              <div className="relative bg-slate-950 border border-slate-800 rounded-lg p-4 max-h-[60vh] overflow-y-auto">
                <div className="absolute top-2 right-2 z-10 bg-slate-900/80 rounded-md">
                  <CopyButton
                    text={JSON.stringify(resultData, null, 2)}
                    className="text-white hover:text-sky-300"
                  />
                </div>
                <div className="text-[13px] font-mono leading-relaxed">
                  <JsonTree data={resultData} label={null} isLast={true} expandAll={true} />
                </div>
              </div>
            )}
          </div>
        </Accordion>
      </div>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={translate('task_detail.modal.title')}
      subtitle={getSubtitle()}
      maxWidth="max-w-5xl lg:max-w-6xl"
      bodyClassName="p-6 overflow-y-auto"
    >
      {renderContent()}
    </Modal>
  );
}
