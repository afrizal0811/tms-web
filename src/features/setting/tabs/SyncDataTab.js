'use client';

import Button from '@/components/button/Button';
import Dropdown from '@/components/dropdown/Dropdown';
import Modal from '@/components/modal/Modal';
import TableData from '@/components/table/TableData';
import { getMceasyData, patchDriverMceasy, postDrivers, postHubs, postRoles } from '@/lib/api';
import { getDriverData } from '@/lib/driverData';
import { getLocalStorage } from '@/lib/localStorageHandler';
import { toastError, toastSuccess } from '@/lib/toast';
import { capitalizeText } from '@/lib/utils';
import { useCallback, useEffect, useState } from 'react';
import Card from '../components/Card';

export default function SyncDataTab({ lastUpdated, onRefresh, isReadOnly, translate }) {
  const [syncLoading, setSyncLoading] = useState({});
  const [modalOpen, setModalOpen] = useState(false);
  const [mismatchedData, setMismatchedData] = useState([]);
  const [matchedData, setMatchedData] = useState([]);
  const [mcEasyDrivers, setMcEasyDrivers] = useState([]);
  const [isDriverLoading, setIsDriverLoading] = useState(false);

  const { storedLocation: activeHubId, storedLocationName } = getLocalStorage();

  const fetchMcEasyDrivers = useCallback(async () => {
    setIsDriverLoading(true);
    try {
      const [res, mileappData] = await Promise.all([
        getMceasyData('/users', {
          'position-name': 'Driver',
          show: 10000,
          'is-active': true,
          'order-by': 'fullname:asc',
        }),
        getDriverData(activeHubId),
      ]);

      const validEmails = new Set(
        mileappData.map((m) => m.email?.toLowerCase().trim()).filter(Boolean)
      );

      const rawUsers = res.data || res;
      const filteredDrivers = rawUsers.filter(
        (driver) => driver.email && validEmails.has(driver.email.toLowerCase().trim())
      );

      const seenLabels = new Set();
      const options = [];

      filteredDrivers.forEach((d) => {
        let label = d.fullname;
        if (seenLabels.has(label)) label = `${label} (${d.email})`;
        seenLabels.add(label);
        options.push({ label, value: d.userId });
      });

      options.unshift({ label: 'Kosongkan', value: null });
      setMcEasyDrivers(options);
    } catch (e) {
      toastError(translate('common.toast.error', { err: e.message }));
    } finally {
      setIsDriverLoading(false);
    }
  }, [activeHubId, translate]);

  useEffect(() => {
    if (modalOpen) fetchMcEasyDrivers();
  }, [modalOpen, fetchMcEasyDrivers]);

  const handleMismatchedChange = (id, key, value) => {
    setMismatchedData((prev) =>
      prev.map((m) => (m.id === id ? { ...m, [key]: value, isUpdated: true } : m))
    );
  };

  const handleSaveMismatches = async () => {
    setSyncLoading({ drivers: true });
    try {
      const updates = mismatchedData.filter((m) => m.isUpdated);
      for (const update of updates) {
        if (!update.mcVehicleId) continue;

        const payload = new URLSearchParams();
        if (update.updatedDriverId !== undefined)
          payload.append('driver1Id', update.updatedDriverId || '');
        if (update.updatedPlat) payload.append('licensePlate', update.updatedPlat);

        const res = await fetch(
          `/api/mceasy?endpoint=${encodeURIComponent(`/vehicles/${update.mcVehicleId}`)}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: payload.toString(),
          }
        );

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          let errMsg = errData.detail || errData.message || `Gagal update kendaraan`;
          if (typeof errMsg === 'string') {
            errMsg = errMsg.replace(/Error:\s*\\?"?|\\?"?$/g, '').trim();
          }
          throw new Error(`[${update.mcPlat}] ${errMsg}`);
        }
      }

      await postDrivers([activeHubId]);
      if (matchedData.length > 0) {
        await patchDriverMceasy(activeHubId, storedLocationName, matchedData);
      }

      setModalOpen(false);
      toastSuccess(translate('common.toast.success'));
      await onRefresh();
    } catch (e) {
      toastError(translate('common.toast.error', { err: e.message }));
    } finally {
      setSyncLoading({ drivers: false });
    }
  };

  const executeSync = async (type) => {
    if (isReadOnly) return;
    setSyncLoading({ [type]: true });
    try {
      if (type === 'hubs') await postHubs();
      else if (type === 'roles') await postRoles();
      else if (type === 'drivers') {
        const result = await patchDriverMceasy(activeHubId, storedLocationName);

        if (!result.success && result.mismatched?.length > 0) {
          setMismatchedData(result.mismatched);
          setMatchedData(result.matched || []);
          setModalOpen(true);
          setSyncLoading({ [type]: false });
          return;
        }

        await postDrivers([activeHubId]);
        if (result.matched?.length > 0) {
          await patchDriverMceasy(activeHubId, storedLocationName, result.matched);
        }
      }

      toastSuccess(translate('common.toast.success'));
      await onRefresh();
    } catch (error) {
      toastError(translate('common.toast.error', { err: error.message }));
    } finally {
      setSyncLoading({ [type]: false });
    }
  };

  const syncData = [
    {
      type: 'hubs',
      label: translate('setting.tab.sync_data.hubs'),
    },
    {
      type: 'roles',
      label: translate('setting.tab.sync_data.roles'),
    },
    {
      type: `drivers`,
      label: `${translate('setting.tab.sync_data.driver_vehicles')} (${storedLocationName})`,
    },
  ];

  const renderSyncButton = (type, label) => {
    return (
      <div
        className={`flex h-full flex-col justify-between p-5 bg-slate-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-md dark:shadow-slate-700/40 transition-colors ${
          isReadOnly ? '' : 'min-h-40'
        }`}
      >
        <div className="text-center md:text-left">
          <span className="font-bold text-slate-800 dark:text-slate-200">{label}</span>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
            {translate('setting.last_updated')} <br />
            <span className="font-medium text-slate-600 dark:text-slate-500">
              {lastUpdated[type]}
            </span>
          </div>
        </div>
        {!isReadOnly && (
          <button
            onClick={() => executeSync(type)}
            disabled={syncLoading[type]}
            className="w-full mt-4 py-2.5 bg-slate-50 dark:bg-sky-100 text-sm font-medium text-slate-700 dark:text-sky-600 border border-slate-300 hover:border-sky-400 dark:hover:border-sky-600 disabled:border-slate-200 rounded-md shadow-none hover:bg-slate-100 dark:hover:bg-sky-200 hover:text-sky-700 dark:hover:text-sky-700 transition-all cursor-pointer disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed "
          >
            {syncLoading[type]
              ? translate('setting.sync_loading')
              : translate('setting.tab.button.btn_sync')}
          </button>
        )}
      </div>
    );
  };
  return (
    <div className="w-full">
      <Card>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 border-b border-gray-100 pb-4 gap-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-slate-200">
              {translate('setting.tab.sync_data.sync_title')}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {translate('setting.tab.sync_data.subtitle')}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {syncData.map((item, index) => (
            <div key={index} className="col-span-1">
              {renderSyncButton(item.type, item.label)}
            </div>
          ))}
        </div>
      </Card>

      <Modal
        isOpen={modalOpen}
        noClose={true}
        title="Perbedaan Data Kendaraan"
        subtitle="Ditemukan ketidaksesuaian data antara MileApp dan McEasy. Silahkan perbaiki data pada source of truth (MileApp) terlebih dahulu."
        maxWidth="max-w-6xl"
        footer={
          <div className="flex justify-end gap-3">
            <Button
              onClick={handleSaveMismatches}
              isLoading={syncLoading.drivers}
              disabled={!mismatchedData.some((m) => m.isUpdated)}
              text="Save & Lanjutkan Update"
              width="w-auto"
            />
          </div>
        }
      >
        <div className="h-[60vh]">
          <TableData
            subHeaders={true}
            columns={[
              { label: 'No.', key: 'no', align: 'center', width: 'w-12', render: (_, i) => i + 1 },
              {
                label: 'MileApp',
                subColumns: [
                  {
                    label: 'Driver',
                    key: 'maNameClean',
                    render: (row) => <span>{capitalizeText(row.maNameClean)}</span>,
                  },
                  { label: 'Plat', key: 'maPlat' },
                ],
              },
              {
                label: 'McEasy',
                subColumns: [
                  {
                    label: 'Driver',
                    key: 'mcName',
                    render: (row) => {
                      const isMismatch =
                        row.mcName?.toLowerCase() !== row.maNameClean?.toLowerCase();
                      if (!isMismatch) return <span>{row.mcName}</span>;
                      return (
                        <div className="min-w-40">
                          <Dropdown
                            options={mcEasyDrivers}
                            value={
                              row.updatedDriverId !== undefined
                                ? row.updatedDriverId
                                : row.vmsDriverId || null
                            }
                            onChange={(val) =>
                              handleMismatchedChange(row.id, 'updatedDriverId', val)
                            }
                            isAutocomplete={true}
                            disabled={isDriverLoading}
                            getLabel={(val) =>
                              mcEasyDrivers.find((opt) => opt.value === val)?.label || row.mcName
                            }
                          />
                        </div>
                      );
                    },
                  },
                  {
                    label: 'Plat',
                    key: 'mcPlat',
                    render: (row) => {
                      const isMismatch =
                        row.mcPlat?.replace(/\s+/g, '')?.toUpperCase() !==
                        row.maPlatBase?.replace(/\s+/g, '')?.toUpperCase();
                      if (!isMismatch) return <span>{row.mcPlat}</span>;
                      return (
                        <input
                          type="text"
                          className="w-full min-w-32 px-3 py-2 text-sm border border-red-300 dark:border-red-500/50 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-sky-500"
                          placeholder={row.mcPlat}
                          value={row.updatedPlat !== undefined ? row.updatedPlat : ''}
                          onChange={(e) =>
                            handleMismatchedChange(row.id, 'updatedPlat', e.target.value)
                          }
                        />
                      );
                    },
                  },
                ],
              },
            ]}
            data={mismatchedData.map((m, i) => ({ ...m, _id: i }))}
          />
        </div>
      </Modal>
    </div>
  );
}
