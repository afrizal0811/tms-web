'use client';

import Button from '@/components/button/Button';
import { getUsers as getMceasyUsers, patchVehicle as patchMceasyVehicle } from '@/lib/api/mceasy';
import { patchDriverMceasy, postDrivers, postHubs, postRoles } from '@/lib/api/mileapp';
import { getDriverData } from '@/lib/driverData';
import { getLocalStorage } from '@/lib/localStorageHandler';
import { toastError, toastSuccess } from '@/lib/toast';
import { useCallback, useEffect, useState } from 'react';
import Card from '../components/Card';
import SyncModal from '../components/SyncModal';

export default function SyncDataTab({ lastUpdated, onRefresh, isReadOnly, translate }) {
  const [syncLoading, setSyncLoading] = useState(null);
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
        getMceasyUsers({ 'position-name': 'Driver' }),
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

      options.unshift({ label: translate('setting.tab.modal.blank_driver'), value: '-' });
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
    setSyncLoading('drivers');
    try {
      const updates = mismatchedData.filter((m) => m.isUpdated);
      for (const update of updates) {
        if (!update.mcVehicleId) continue;

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
      setSyncLoading(null);
    }
  };

  const executeSync = async (type) => {
    if (isReadOnly) return;
    setSyncLoading(type);
    try {
      if (type === 'hubs') await postHubs();
      else if (type === 'roles') await postRoles();
      else if (type === 'drivers') {
        const result = await patchDriverMceasy(activeHubId, storedLocationName);

        if (!result.success && result.mismatched?.length > 0) {
          setMismatchedData(result.mismatched);
          setMatchedData(result.matched || []);
          setModalOpen(true);
          setSyncLoading(null);
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
      setSyncLoading(null);
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
          <Button
            onClick={() => executeSync(type)}
            isLoading={syncLoading === type}
            disabled={syncLoading !== null}
            text={translate('setting.tab.button.btn_sync')}
            size="md"
          />
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

      <SyncModal
        isOpen={modalOpen}
        mismatchedData={mismatchedData}
        onMismatchedChange={handleMismatchedChange}
        onSave={handleSaveMismatches}
        mcEasyDrivers={mcEasyDrivers}
        isDriverLoading={isDriverLoading}
        isSaving={syncLoading === 'drivers'}
        translate={translate}
      />
    </div>
  );
}
