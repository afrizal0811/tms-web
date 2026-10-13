'use client';

import Button from '@/components/button/Button';
import { getUsers as getMceasyUsers, patchVehicle as patchMceasyVehicle } from '@/lib/api/mceasy';
import { getDrivers, patchDriverMceasy, postDrivers, postHubs, postRoles } from '@/lib/api/mileapp';
import { getLocalStorage } from '@/lib/localStorageHandler';
import { toastError, toastSuccess } from '@/lib/toast';
import { useCallback, useEffect, useState } from 'react';
import Card from '../components/Card';
import SyncModal from '../components/SyncModal';

export default function SyncDataTab({ hubs, lastUpdated, onRefresh, isReadOnly, translate }) {
  const [syncLoading, setSyncLoading] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [mismatchedData, setMismatchedData] = useState([]);
  const [matchedData, setMatchedData] = useState([]);
  const [mcEasyDrivers, setMcEasyDrivers] = useState([]);
  const [isDriverLoading, setIsDriverLoading] = useState(false);
  const [syncScope, setSyncScope] = useState({ mode: 'active' });

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
      const seenVehicleIds = new Set();
      for (const update of updates) {
        if (!update.mcVehicleId || seenVehicleIds.has(update.mcVehicleId)) continue;
        seenVehicleIds.add(update.mcVehicleId);

        const payload = new URLSearchParams();
        if (update.updatedDriverId !== undefined) {
          payload.append(
            'driver1Id',
            update.updatedDriverId !== null ? update.updatedDriverId : ''
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

      if (syncScope.mode === 'global') {
        await postDrivers([]);
      } else {
        await postDrivers([syncScope.hubId || activeHubId]);
      }

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

  const handleBypass = async () => {
    setSyncLoading(syncScope.mode === 'global' ? 'drivers-global' : 'drivers-active');
    try {
      if (syncScope.mode === 'global') {
        await postDrivers([]);
      } else {
        await postDrivers([syncScope.hubId || activeHubId]);
      }

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

        await postDrivers([activeHubId]);
        if (result.matched?.length > 0) {
          await patchDriverMceasy(null, null, result.matched);
        }
      } else {
        await postDrivers([activeHubId]);
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {syncData.map((item, index) => (
            <div key={index} className="col-span-1">
              {renderCardContent(item.type, item.label)}
            </div>
          ))}
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
