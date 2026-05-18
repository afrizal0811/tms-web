'use client';

import ConfirmModal from '@/components/modal/ConfirmModal';
import VehicleTagMappingModal from '@/components/modal/VehicleTagMappingModal';
import Spinner from '@/components/Spinner';
import { getRoles, getUsersByEmail } from '@/lib/api';
import { useVehicleTagCheck } from '@/lib/hooks/useVehicleTagCheck';
import { getLocalStorage } from '@/lib/localStorageHandler';
import { toastError, toastSuccess } from '@/lib/toastHelper';
import { capitalizeText, isEmpty } from '@/lib/utils';
import { useState } from 'react';

export default function LoginSelection({
  t,
  selectedLocation,
  handleUserSelect,
  selectedLocationName,
  handleResetAll,
}) {
  const [emailInput, setEmailInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [userToConfirm, setUserToConfirm] = useState(null);

  const { isChecking, showModal, unmappedData, triggerCheck, handleMappingCompleted } =
    useVehicleTagCheck();

  const handleSearchUser = async (e) => {
    e.preventDefault();
    if (!emailInput) return;

    if (!selectedLocation) {
      toastError(t('home.toast.no_session'));
      return;
    }

    setLoading(true);
    try {
      const response = await getUsersByEmail(emailInput, selectedLocation);
      let usersArray = [];
      if (Array.isArray(response)) {
        usersArray = response;
      } else if (response && Array.isArray(response.data)) {
        usersArray = response.data;
      }

      if (isEmpty(usersArray)) {
        toastError(t('home.toast.no_email_inactive'));
        setLoading(false);
        return;
      }

      const foundUser = usersArray[0];
      if (!foundUser) {
        toastError(t('home.toast.no_email_inactive'));
        setLoading(false);
        return;
      }
      const roles = await getRoles();
      const driverRole = roles.find((r) => r.name.toLowerCase() === 'driver');
      const driverJktRole = roles.find((r) => r.name.toLowerCase() === 'driver jkt');

      if (
        (driverRole && foundUser.roleId === driverRole._id) ||
        (driverJktRole && foundUser.roleId === driverJktRole._id)
      ) {
        toastError(t('home.toast.driver_error'));
        setLoading(false);
        return;
      }

      setUserToConfirm(foundUser);
      setIsConfirmOpen(true);
    } catch (err) {
      toastError(t('common.toast.error', { err: err.message }));
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmLogin = async () => {
    if (!userToConfirm) return;
    setLoading(true);
    const { storedLocation } = getLocalStorage();
    const targetCheckHubId = storedLocation || selectedLocation;

    if (!targetCheckHubId) {
      toastError(t('home.toast.no_session'));
      setIsConfirmOpen(false);
      return;
    }
    await triggerCheck(targetCheckHubId, async () => {
      try {
        handleUserSelect(userToConfirm);
        toastSuccess(t('home.toast.login_success'));
      } catch (err) {
        toastError(t('home.toast.login_failed', { err: err.message }));
      }
    });
    setLoading(false);
    setIsConfirmOpen(false);
  };

  const handleCancelConfirm = () => {
    setIsConfirmOpen(false);
    setUserToConfirm(null);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center">
        <Spinner />
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">{t('common.loading')}</p>
      </div>
    );
  }

  const modalMessage = (
    <div className="flex flex-col gap-2">
      <div className="text-slate-200">
        {t('home.modal.question')}{' '}
        <span className="font-bold">{capitalizeText(userToConfirm?.name || '')}</span>?
      </div>
      <div className="text-sm text-gray-500 dark:text-slate-400">{userToConfirm?.email}</div>
    </div>
  );

  return (
    <div className="w-full max-w-md mt-6 mx-auto relative">
      {isChecking && (
        <div className="absolute inset-0 z-50 bg-white/40 dark:bg-slate-900/60 backdrop-blur-sm flex items-center justify-center rounded-lg">
          <div className="flex flex-col items-center">
            <Spinner />
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
              {t('home.vehicle_check')}
            </p>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={isConfirmOpen}
        message={modalMessage}
        onCancel={handleCancelConfirm}
        onConfirm={handleConfirmLogin}
        title={t('home.modal.title')}
        loading={loading}
      />

      <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 transition-colors">
        <div className="flex flex-col gap-2 mb-4">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 text-center">
            {t('home.input_email_title')}
          </h1>
          <h2 className="text-lg mb-4 text-gray-500 dark:text-slate-400 text-center">
            {t('home.location_label')}: <strong>{selectedLocationName}</strong>
          </h2>
        </div>
        <form onSubmit={handleSearchUser} className="flex flex-col gap-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-500 dark:text-slate-400 mb-1 text-left"
            >
              {t('home.email')}
            </label>
            <input
              autoComplete="off"
              className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-md focus:ring-sky-500 focus:border-sky-500 outline-none transition-colors"
              id="email"
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="john.doe@mail.com"
              required
              type="email"
              value={emailInput}
            />
          </div>
          <button
            className="w-full bg-sky-600 hover:bg-sky-700 text-white font-bold py-2 px-4 rounded transition-colors disabled:bg-gray-400 dark:disabled:bg-slate-700 dark:disabled:text-slate-400 disabled:cursor-not-allowed cursor-pointer"
            disabled={!emailInput}
            type="submit"
          >
            {t('home.login')}
          </button>
        </form>

        <button
          onClick={handleResetAll}
          className="w-full mt-2 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold py-2 px-4 rounded transition-colors cursor-pointer text-sm"
        >
          {t('home.back_btn')}
        </button>

        <div className="mt-4 text-right ">
          <span className="text-xs text-gray-400 dark:text-slate-500 italic">
            *{t('home.note')}
          </span>
        </div>
      </div>

      {showModal && (
        <VehicleTagMappingModal
          onCompleted={handleMappingCompleted}
          t={t}
          unmappedData={unmappedData}
        />
      )}
    </div>
  );
}
