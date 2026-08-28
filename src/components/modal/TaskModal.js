'use client';

import Accordion from '@/components/Accordion';
import Spinner from '@/components/Spinner';
import Td from '@/components/table/Td';
import Th from '@/components/table/Th';
import { getResult, getTask, getUser } from '@/lib/api';
import { formatUTC7, getBasePlate, isEmpty, parseCustomerString } from '@/lib/utils';
import { useEffect, useState } from 'react';
import Modal from '../Modal';
import Tooltip from '../Tooltip';

const Field = ({ label, value, tooltip }) => (
  <div className="mb-3">
    <div className="text-xs text-gray-500 dark:text-slate-400">{label}</div>
    <Tooltip tooltipContent={tooltip}>
      <div className="text-sm font-medium text-slate-800 dark:text-slate-200">
        {isEmpty(value) ? '-' : String(value)}
      </div>
    </Tooltip>
  </div>
);

export default function TaskModal({ isOpen, onClose, taskId, driverData = [] }) {
  const [loading, setLoading] = useState(false);
  const [taskData, setTaskData] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('Data');
  const [createdBy, setCreatedBy] = useState(null);
  const [updatedBy, setUpdatedBy] = useState(null);
  const [resultData, setResultData] = useState(null);

  useEffect(() => {
    if (!isOpen || !taskId || taskId === '-') {
      setTaskData(null);
      setResultData(null);
      setActiveTab('Data');
      return;
    }

    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await getTask(taskId);
        const task = response?.task || response;
        setTaskData(task);

        const [createdRes, updatedRes, resultRes] = await Promise.allSettled([
          task?.createdBy ? getUser(task.createdBy) : Promise.resolve(null),
          task?.updatedBy ? getUser(task.updatedBy) : Promise.resolve(null),
          task?.routingResultId ? getResult(task.routingResultId) : Promise.resolve(null),
        ]);

        setCreatedBy(
          createdRes.status === 'fulfilled' && createdRes.value ? createdRes.value[0]?.name : null
        );
        setUpdatedBy(
          updatedRes.status === 'fulfilled' && updatedRes.value ? updatedRes.value[0]?.name : null
        );
        setResultData(
          resultRes.status === 'fulfilled' && resultRes.value
            ? resultRes.value?.data || resultRes.value
            : null
        );
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [isOpen, taskId]);

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
    if (!val) return '-';
    return Number(val).toFixed(2);
  };

  const getSubtitle = () => {
    if (!taskData) return '';
    const status = taskData.status || '-';
    const statusDelivery = taskData.statusDelivery?.[0];
    const subtitleText = statusDelivery ? `${status} | ${statusDelivery}` : status;
    return subtitleText.toUpperCase();
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex justify-center items-center p-10 min-h-[300px]">
          <Spinner />
        </div>
      );
    }

    if (error) {
      return <div className="text-red-500 p-4 text-center">{error}</div>;
    }

    if (!taskData) {
      return <div className="p-4 text-center text-gray-500">Data tidak ditemukan.</div>;
    }

    const custInfo = parseCustomerString(taskData.customerOrder);
    const assigneeEmail = taskData.assignee?.[0];
    const driver =
      driverData.find(
        (d) => String(d.email).toLowerCase() === String(assigneeEmail).toLowerCase()
      ) || {};

    const maxVehicle = driver.type || taskData?.maksimumVehicleType || '-';
    const assigneeName = driver.name || '-';
    const licenseNumber = getBasePlate(driver.plat) || '-';

    const products = taskData.listProduct || [];
    const uniqueProducts = new Set(products.map((p) => p.title)).size;
    const totalItems = products.reduce((acc, p) => acc + (Number(p.qtyProcessed) || 0), 0);

    const histories = [...(taskData.histories || [])].sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    const tabs = ['Data', 'Routing', 'List Product', 'History', 'Other'];

    return (
      <div className="space-y-6">
        {/* Section 1 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 border border-gray-200 dark:border-slate-700 rounded-lg bg-gray-50 dark:bg-slate-900/50">
          <Field label="Customer Name" value={custInfo.fullCustomerName} />
          <Field label="Address" value={taskData.address} />
          <Field
            label="Invoice Number"
            value={custInfo.truncateInvoice || custInfo.invoiceNumber}
            tooltip={custInfo.isTruncated ? custInfo.invoiceNumber : null}
          />
          <Field label="Type Storage" value={taskData.typeStorage} />
          <Field label="Maximum Vehicle" value={maxVehicle} />
          <Field
            label="Updated By"
            value={driver.name || updatedBy || taskData.updatedBy}
            tooltip={taskData.updatedBy}
          />
          <Field label="Updated Time" value={renderDate(taskData.updatedTime)} />
        </div>

        {/* Section 2 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border border-gray-200 dark:border-slate-700 rounded-lg p-4 bg-white dark:bg-slate-800">
            <h3 className="font-bold text-sky-600 dark:text-sky-400 border-b border-gray-200 dark:border-slate-700 pb-2 mb-4">
              Creation
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Created By" value={createdBy} tooltip={taskData.createdBy} />
              <Field label="Created Time" value={renderDate(taskData.createdTime)} />
              <Field label="Created From" value={taskData.createdFrom} />
              <Field label="Start Time" value={renderDate(taskData.startTime)} />
            </div>
          </div>
          <div className="border border-gray-200 dark:border-slate-700 rounded-lg p-4 bg-white dark:bg-slate-800">
            <h3 className="font-bold text-sky-600 dark:text-sky-400 border-b border-gray-200 dark:border-slate-700 pb-2 mb-4">
              Assignment
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Assignee" value={assigneeName} tooltip={taskData.assignee} />
              <Field label="License Number" value={licenseNumber} />
              <Field label="Assigned Time" value={renderDate(taskData.assignedTime)} />
              <Field label="Done Time" value={renderDate(taskData.doneTime)} />
            </div>
          </div>
        </div>

        {/* Section 3 */}
        <Accordion title="Mode Details" defaultOpen={false}>
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
            {activeTab === 'Data' && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Field label="Waktu Tiba" value={renderDate(taskData.klikJikaSudahSampai)} />
                <Field label="Open Time" value={taskData.openTime} />
                <Field label="Close Time" value={taskData.closeTime} />
                <Field label="Visit Time" value={taskData.visitTime} />
                <Field label="Volume" value={renderFloatData(taskData.volumeCbm)} />
                <Field label="Weight" value={renderFloatData(taskData.weightKg)} />
                <Field label="Expected Coordinate" value={renderCoordinate(taskData.longlat)} />
                <Field label="Done Coordinate" value={renderCoordinate(taskData.doneCoordinate)} />
                <Field label="GPS Sesuai" value={taskData.gpsSesuai?.join(', ')} />
                <Field label="Lokasi Baru" value={renderCoordinate(taskData.klikLokasiClient)} />
                <Field label="Total SO" value={taskData.totalSo} />
                <Field label="Priority" value={taskData.priority} />
              </div>
            )}

            {activeTab === 'Routing' &&
              (() => {
                let rTravelTime = '-';
                let rWaitingTime = '-';
                let rVisitTime = '-';
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
                    <Field label="Routing Name" value={rName} />
                    <Field label="Route Planned Order" value={taskData.routePlannedOrder} />
                    <Field label="ETA" value={taskData.eta} />
                    <Field label="ETD" value={taskData.etd} />
                    <Field label="Distance" value={taskData.distance} />
                    <Field label="Visit Time" value={rVisitTime} />
                    <Field label="Travel Time" value={rTravelTime} />
                    <Field label="Waiting Time" value={rWaitingTime} />
                  </div>
                );
              })()}

            {activeTab === 'List Product' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-2">
                  <Field label="Total Produk" value={uniqueProducts} />
                  <Field label="Total Barang" value={totalItems} />
                </div>
                <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-slate-700">
                  <table className="min-w-full">
                    <thead className="bg-gray-50 dark:bg-slate-900/50">
                      <tr>
                        <Th className="p-3 text-left text-xs font-semibold text-gray-600 uppercase">
                          Invoice Number
                        </Th>
                        <Th className="p-3 text-left text-xs font-semibold text-gray-600 uppercase">
                          Item
                        </Th>
                        <Th className="p-3 text-left text-xs font-semibold text-gray-600 uppercase">
                          Quantity
                        </Th>
                        <Th className="p-3 text-left text-xs font-semibold text-gray-600 uppercase">
                          UOM
                        </Th>
                        <Th className="p-3 text-left text-xs font-semibold text-gray-600 uppercase">
                          Volume
                        </Th>
                        <Th className="p-3 text-left text-xs font-semibold text-gray-600 uppercase">
                          Weight
                        </Th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {products.length > 0 ? (
                        products.map((p, i) => (
                          <tr key={i} className="hover:bg-gray-50 dark:hover:bg-slate-800">
                            <Td className="p-3 text-xs">{p.caption || '-'}</Td>
                            <Td className="p-3 text-xs max-w-xs truncate" title={p.title}>
                              {p.title || '-'}
                            </Td>
                            <Td className="p-3 text-xs">{p.qtyProcessed ?? '-'}</Td>
                            <Td className="p-3 text-xs">{p.content || '-'}</Td>
                            <Td className="p-3 text-xs">{p.volume ?? '-'}</Td>
                            <Td className="p-3 text-xs">{p.weight ?? '-'}</Td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <Td colSpan={6} className="p-4 text-center text-xs text-gray-500">
                            Tidak ada produk.
                          </Td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'History' && (
              <div className="py-2">
                {histories.length > 0 ? (
                  <div className="border-l-2 border-sky-300 dark:border-sky-700 ml-4 space-y-6">
                    {histories.map((h, i) => (
                      <div key={i} className="relative pl-6">
                        <div className="absolute -left-[9px] top-1.5 h-4 w-4 rounded-full bg-sky-500 ring-4 ring-white dark:ring-slate-800" />
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-1">
                          <span className="text-sm font-bold text-slate-800 dark:text-slate-100 capitalize">
                            {h.action || '-'}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-slate-400">
                            {renderDate(h.createdAt)}
                          </span>
                        </div>
                        <div className="text-xs font-medium text-sky-600 dark:text-sky-400 mb-1">
                          By: {h.changedBy || '-'}
                        </div>
                        <div className="text-sm text-slate-600 dark:text-slate-300 wrap-break-words">
                          {h.notes || '-'}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-sm text-gray-500 p-4">Tidak ada history.</div>
                )}
              </div>
            )}

            {activeTab === 'Other' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Field label="Task ID" value={taskData._id} />
                <Field label="Route ID" value={taskData.routingResultId} />
                <Field label="Travel Distance" value={renderFloatData(taskData.travelDistance)} />
                <Field label="Travel Duration" value={renderFloatData(taskData.travelDuration)} />
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
      title="Detail Task"
      subtitle={getSubtitle()}
      maxWidth="max-w-5xl lg:max-w-6xl"
      bodyClassName="p-6 overflow-y-auto"
    >
      {renderContent()}
    </Modal>
  );
}
