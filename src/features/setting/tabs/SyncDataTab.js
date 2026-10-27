'use client';

import Button from '@/components/button/Button';
import CustomDatePicker from '@/components/CustomDatePicker';
import { getUsers as getMceasyUsers, patchVehicle as patchMceasyVehicle } from '@/lib/api/mceasy';
import {
  getDrivers,
  patchDriverMceasy,
  postDrivers,
  postHubs,
  postRoles,
  syncRoutingResults,
} from '@/lib/api/mileapp';
import { getLocalStorage } from '@/lib/localStorageHandler';
import { toastError, toastSuccess } from '@/lib/toast';
import { useCallback, useEffect, useState } from 'react';
import Card from '../components/Card';
import SyncModal from '../components/SyncModal';

export default function SyncDataTab({
  hubs,
  lastUpdated,
  updatedBy = {},
  onRefresh,
  isReadOnly,
  translate,
}) {
  const [syncLoading, setSyncLoading] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [mismatchedData, setMismatchedData] = useState([]);
  const [matchedData, setMatchedData] = useState([]);
  const [mcEasyDrivers, setMcEasyDrivers] = useState([]);
  const [isDriverLoading, setIsDriverLoading] = useState(false);
  const [syncScope, setSyncScope] = useState({ mode: 'active' });
  const [routingDateRange, setRoutingDateRange] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return [d, d];
  });
  const [isSyncingRouting, setIsSyncingRouting] = useState(false);
  const [syncRoutingProgress, setSyncRoutingProgress] = useState('');

  const { storedLocation: activeHubId, storedLocationName } = getLocalStorage();

  const allHubs = hubs?.allHub || [];
  const activeHub = hubs?.activeHub || allHubs.find((h) => String(h._id) === String(activeHubId));
  const activeHasVms = Boolean(activeHub?.hasVms);

  const fetchMcEasyDrivers = useCallback(async () => {
    setIsDriverLoading(true);
    try {
      const [res, mileappData] = await Promise.all([
        getMceasyUsers({ 'position-name': 'Driver' }),
        getDrivers(syncScope.mode === 'global' ? 'all' : activeHubId),
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

      options.unshift({ label: translate('setting.tab.modal.blank_driver'), value: '-' });
      setMcEasyDrivers(options);
    } catch (e) {
      toastError(translate('common.toast.error', { err: e.message }), e);
    } finally {
      setIsDriverLoading(false);
    }
  }, [activeHubId, syncScope.mode, translate]);

  useEffect(() => {
    if (modalOpen) fetchMcEasyDrivers();
  }, [modalOpen, fetchMcEasyDrivers]);

  const handleMismatchedChange = (id, key, value) => {
    setMismatchedData((prev) =>
      prev.map((m) => (m.id === id ? { ...m, [key]: value, isUpdated: true } : m))
    );
  };

  const handleSaveMismatches = async () => {
    setSyncLoading(syncScope.mode === 'global' ? 'drivers-global' : 'drivers-active');
    try {
      const updates = mismatchedData.filter((m) => m.isUpdated);

      // Kumpulkan ID driver yang akan dipasangkan
      const targetDriverIds = new Set(
        updates
          .map((u) => u.updatedDriverId)
          .filter((id) => id && id !== '-')
          .map((id) => String(id))
      );

      // Kumpulkan ID kendaraan yang perlu dilepas (unassign) driver-nya terlebih dahulu
      // agar tidak terkena validasi "Driver is already assigned in another vehicle" dari McEasy
      const vehiclesToClear = new Set();
      updates.forEach((u) => {
        if (u.mcVehicleId && u.updatedDriverId !== undefined) {
          vehiclesToClear.add(u.mcVehicleId);
        }
      });
      mismatchedData.forEach((m) => {
        if (m.mcVehicleId && m.vmsDriverId && targetDriverIds.has(String(m.vmsDriverId))) {
          vehiclesToClear.add(m.mcVehicleId);
        }
      });

      // Tahap 1: Lepaskan driver sementara menggunakan '-' (format McEasy untuk unassign)
      for (const vehicleId of vehiclesToClear) {
        try {
          const clearPayload = new URLSearchParams();
          clearPayload.append('driver1Id', '-');
          await patchMceasyVehicle(vehicleId, clearPayload.toString());
        } catch (clearErr) {
          console.warn(
            `[Unassign Driver] Gagal melepas driver pada vehicle ${vehicleId}:`,
            clearErr.message
          );
        }
      }

      // Tahap 2: Pasang driver baru dan/atau perbarui plat nomor
      const seenVehicleIds = new Set();
      for (const update of updates) {
        if (!update.mcVehicleId || seenVehicleIds.has(update.mcVehicleId)) continue;
        seenVehicleIds.add(update.mcVehicleId);

        const payload = new URLSearchParams();
        if (update.updatedDriverId !== undefined) {
          payload.append(
            'driver1Id',
            update.updatedDriverId && update.updatedDriverId !== '-' ? update.updatedDriverId : '-'
          );
        }
        if (update.updatedPlat) {
          payload.append('licensePlate', update.updatedPlat);
        }

        try {
          await patchMceasyVehicle(update.mcVehicleId, payload.toString());
        } catch (err) {
          throw new Error(`[${update.mcPlat}] ${err.message}`);
        }
      }

      const resolvedMatches = updates.map((u) => ({
        id: u.id,
        imei: u.imei,
        vms_id: u.mcVehicleId,
        vms_driver_id:
          u.updatedDriverId !== undefined && u.updatedDriverId !== '-'
            ? u.updatedDriverId
            : u.vmsDriverId,
      }));

      const allMatchesToSave = [...matchedData, ...resolvedMatches];
      if (allMatchesToSave.length > 0) {
        await patchDriverMceasy(null, null, allMatchesToSave);
      }

      setModalOpen(false);
      toastSuccess(translate('common.toast.success'));
      await onRefresh();
      window.location.reload();
    } catch (e) {
      toastError(translate('common.toast.error', { err: e.message }), e);
    } finally {
      setSyncLoading(null);
    }
  };

  const handleBypass = async () => {
    setSyncLoading(syncScope.mode === 'global' ? 'drivers-global' : 'drivers-active');
    try {
      if (matchedData.length > 0) {
        await patchDriverMceasy(null, null, matchedData);
      }

      setModalOpen(false);
      toastSuccess(translate('common.toast.success'));
      await onRefresh();
      window.location.reload();
    } catch (e) {
      toastError(translate('common.toast.error', { err: e.message }), e);
    } finally {
      setSyncLoading(null);
    }
  };

  const executeDriverSyncActive = async () => {
    if (isReadOnly) return;
    setSyncLoading('drivers-active');
    const cleanActiveHubName = (storedLocationName || '').replace(/^Hub\s+/i, '').trim();
    setSyncScope({ mode: 'active', hubId: activeHubId, hubName: cleanActiveHubName });
    try {
      await postDrivers([activeHubId]);

      if (activeHasVms) {
        const result = await patchDriverMceasy(activeHubId, storedLocationName);

        if (!result.success && result.mismatched?.length > 0) {
          const dedupedMismatches = [];
          for (const m of result.mismatched) {
            const existing = dedupedMismatches.find(
              (x) =>
                x.id === m.id ||
                (x.mcVehicleId && x.mcVehicleId === m.mcVehicleId) ||
                (x.maPlatBase && m.maPlatBase && x.maPlatBase === m.maPlatBase)
            );
            if (!existing) {
              dedupedMismatches.push({
                ...m,
                hubName: cleanActiveHubName,
                hubId: activeHubId,
              });
            }
          }

          setMismatchedData(dedupedMismatches);
          setMatchedData(result.matched || []);
          setModalOpen(true);
          setSyncLoading(null);
          return;
        }

        if (result.matched?.length > 0) {
          await patchDriverMceasy(null, null, result.matched);
        }
      }

      toastSuccess(translate('common.toast.success'));
      await onRefresh();
      window.location.reload();
    } catch (e) {
      toastError(translate('common.toast.error', { err: e.message }), e);
    } finally {
      setSyncLoading(null);
    }
  };

  const executeDriverSyncGlobal = async () => {
    if (isReadOnly) return;
    setSyncLoading('drivers-global');
    setSyncScope({ mode: 'global' });
    try {
      // 1. Sync data drivers & vehicles dari MileApp untuk seluruh cabang
      await postDrivers([]);

      // 2. Sync data VMS McEasy untuk cabang yang mengaktifkan VMS
      const vmsHubs = allHubs.filter((h) => h.hasVms);
      const allMismatches = [];
      const allMatches = [];

      for (const hub of vmsHubs) {
        const hubNameClean = (hub.name || '').replace(/^Hub\s+/i, '').trim();
        try {
          const result = await patchDriverMceasy(hub._id, hubNameClean);
          if (result.mismatched?.length > 0) {
            for (const m of result.mismatched) {
              const existing = allMismatches.find(
                (x) =>
                  x.id === m.id ||
                  (x.mcVehicleId && x.mcVehicleId === m.mcVehicleId) ||
                  (x.maPlatBase && m.maPlatBase && x.maPlatBase === m.maPlatBase)
              );
              if (existing) {
                const currentHubs = (existing.hubName || '')
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean);
                if (!currentHubs.includes(hubNameClean)) {
                  currentHubs.push(hubNameClean);
                  existing.hubName = currentHubs.join(', ');
                }
              } else {
                allMismatches.push({
                  ...m,
                  hubName: hubNameClean,
                  hubId: hub._id,
                });
              }
            }
          }
          if (result.matched?.length > 0) {
            for (const match of result.matched) {
              const alreadyMatched = allMatches.some(
                (x) => x.id === match.id || (x.vms_id && x.vms_id === match.vms_id)
              );
              if (!alreadyMatched) {
                allMatches.push(match);
              }
            }
          }
        } catch (err) {
          console.warn(`[VMS Sync] Hub ${hub.name} dilewati karena error:`, err.message);
        }
      }

      // Filter matches that might be present in mismatches
      const filteredMatches = allMatches.filter(
        (match) =>
          !allMismatches.some(
            (m) => m.id === match.id || (m.mcVehicleId && m.mcVehicleId === match.vms_id)
          )
      );

      // 3. Tangani mismatch jika ada
      if (allMismatches.length > 0) {
        setMismatchedData(allMismatches);
        setMatchedData(filteredMatches);
        setModalOpen(true);
        setSyncLoading(null);
        return;
      }

      // 4. Update data yang cocok
      if (filteredMatches.length > 0) {
        await patchDriverMceasy(null, null, filteredMatches);
      }

      toastSuccess(translate('common.toast.success'));
      await onRefresh();
      window.location.reload();
    } catch (e) {
      toastError(translate('common.toast.error', { err: e.message }), e);
    } finally {
      setSyncLoading(null);
    }
  };

  const executeSync = async (type) => {
    if (isReadOnly) return;
    setSyncLoading(type);
    try {
      if (type === 'hubs') await postHubs();
      else if (type === 'roles') await postRoles();

      toastSuccess(translate('common.toast.success'));
      await onRefresh();
      window.location.reload();
    } catch (e) {
      toastError(translate('common.toast.error', { err: e.message }), e);
    } finally {
      setSyncLoading(null);
    }
  };

  const driverGlobalOptions = [
    {
      id: 'global',
      label: `${translate('common.all')} ${translate('common.branch')}`,
      onClick: executeDriverSyncGlobal,
    },
  ];

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
      type: 'drivers',
      label: translate('setting.tab.sync_data.driver_vehicles'),
    },
  ];

  const renderCardContent = (type, label) => {
    if (type === 'drivers') {
      const isDriverLoadingActive = syncLoading === 'drivers-active';
      const isDriverLoadingGlobal = syncLoading === 'drivers-global';
      const isDriverSyncing = isDriverLoadingActive || isDriverLoadingGlobal;

      return (
        <div
          className={`flex h-full flex-col justify-between p-5 bg-slate-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-md dark:shadow-slate-700/40 transition-colors ${
            isReadOnly ? '' : 'min-h-40'
          }`}
        >
          <div className="text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2 flex-wrap">
              <span className="font-bold text-slate-800 dark:text-slate-200">{label}</span>
              {activeHasVms ? (
                <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 border border-sky-200/80 dark:border-sky-800/80">
                  VMS
                </span>
              ) : (
                <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-slate-200/70 text-slate-600 dark:bg-slate-700 dark:text-slate-400">
                  Non-VMS
                </span>
              )}
            </div>

            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {translate('setting.last_updated')} <br />
              <span className="font-medium text-slate-600 dark:text-slate-500">
                {lastUpdated[type]}
              </span>
            </div>

            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {translate('setting.updated_by')} <br />
              <span className="font-medium text-slate-600 dark:text-slate-500">
                {updatedBy[type] || '-'}
              </span>
            </div>
          </div>

          {!isReadOnly && (
            <div className="mt-4">
              <Button
                type="split"
                onClick={executeDriverSyncActive}
                options={driverGlobalOptions}
                isLoading={isDriverSyncing}
                disabled={syncLoading !== null}
                text={translate('setting.tab.button.btn_sync_hub', {
                  hub: storedLocationName,
                })}
                size="md"
              />
            </div>
          )}
        </div>
      );
    }

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
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
            {translate('setting.updated_by')} <br />
            <span className="font-medium text-slate-600 dark:text-slate-500">
              {updatedBy[type] || '-'}
            </span>
          </div>
        </div>
        {!isReadOnly && (
          <div className="mt-4">
            <Button
              onClick={() => executeSync(type)}
              isLoading={syncLoading === type}
              disabled={syncLoading !== null}
              text={translate('setting.tab.button.btn_sync')}
              size="md"
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full flex flex-col h-full">
      <Card className="grow">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 border-b border-gray-100 dark:border-slate-800 pb-4 gap-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-slate-200">
              {translate('setting.tab.sync_data.sync_title')}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {translate('setting.tab.sync_data.subtitle')}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {syncData.map((item, index) => (
            <div key={index} className="col-span-1">
              {renderCardContent(item.type, item.label)}
            </div>
          ))}
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-slate-700">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-slate-200">
                Sinkronisasi Routing Results
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Sinkronisasi data hasil routing MileApp berdasarkan rentang tanggal pengiriman
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <CustomDatePicker
                selectsRange={true}
                startDate={routingDateRange[0]}
                endDate={routingDateRange[1]}
                onChange={(dates) => setRoutingDateRange(dates)}
                useCustomRangeFormat={true}
                disabled={isSyncingRouting || isReadOnly}
                className="w-full sm:w-[260px] cursor-pointer"
                wrapperClassName="w-full sm:w-auto"
                disableSunday={false}
              />
              <Button
                onClick={async () => {
                  const [startDate, endDate] = routingDateRange;
                  if (!startDate) return;

                  const start = new Date(startDate);
                  const end = new Date(endDate || startDate);
                  start.setHours(0, 0, 0, 0);
                  end.setHours(0, 0, 0, 0);

                  const datesToSync = [];
                  const curr = new Date(start);
                  while (curr <= end) {
                    const y = curr.getFullYear();
                    const m = String(curr.getMonth() + 1).padStart(2, '0');
                    const d = String(curr.getDate()).padStart(2, '0');
                    datesToSync.push(`${y}-${m}-${d}`);
                    curr.setDate(curr.getDate() + 1);
                  }

                  if (datesToSync.length === 0) return;

                  setIsSyncingRouting(true);
                  let totalSynced = 0;
                  let totalSkipped = 0;
                  let failedCount = 0;

                  try {
                    for (let i = 0; i < datesToSync.length; i++) {
                      const dStr = datesToSync[i];
                      setSyncRoutingProgress(`${i + 1}/${datesToSync.length}`);
                      try {
                        const res = await syncRoutingResults({
                          deliveryDate: dStr,
                          hubId: activeHubId,
                        });
                        if (res?.skipped) {
                          totalSkipped++;
                        } else {
                          totalSynced += res?.syncedCount || 1;
                        }
                      } catch (err) {
                        failedCount++;
                        console.error(`Sync error for ${dStr}:`, err);
                      }
                    }

                    if (onRefresh) await onRefresh();

                    if (totalSynced > 0) {
                      toastSuccess(
                        `Berhasil sinkronisasi ${totalSynced} data routing (${totalSkipped} dilewati).`
                      );
                    } else if (totalSkipped > 0) {
                      toastSuccess(
                        `Semua ${totalSkipped} tanggal sudah ada di database atau tidak ada routing baru (dilewati).`
                      );
                    } else if (failedCount > 0) {
                      toastError('Gagal sinkronisasi data routing.');
                    } else {
                      toastSuccess('Sinkronisasi data routing selesai.');
                    }
                  } catch (e) {
                    toastError(e.message || 'Terjadi kesalahan saat sinkronisasi routing.', e);
                  } finally {
                    setIsSyncingRouting(false);
                    setSyncRoutingProgress('');
                  }
                }}
                isLoading={isSyncingRouting}
                disabled={isSyncingRouting || !routingDateRange[0] || isReadOnly}
                text={
                  isSyncingRouting
                    ? `Sinkronisasi... ${syncRoutingProgress ? `(${syncRoutingProgress})` : ''}`
                    : 'Sinkronisasi Routing'
                }
                size="md"
              />
            </div>
          </div>
        </div>
      </Card>

      <SyncModal
        isOpen={modalOpen}
        mismatchedData={mismatchedData}
        onMismatchedChange={handleMismatchedChange}
        onSave={handleSaveMismatches}
        onBypass={handleBypass}
        mcEasyDrivers={mcEasyDrivers}
        isDriverLoading={isDriverLoading}
        isSaving={
          syncLoading === 'drivers' ||
          syncLoading === 'drivers-active' ||
          syncLoading === 'drivers-global'
        }
        translate={translate}
      />
    </div>
  );
}
