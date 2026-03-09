// File: src/features/userLogin/UserLogin.js
'use client';

import ConfirmModal from '@/components/ConfirmModal';
import Spinner from '@/components/Spinner';
import VehicleTagMappingModal from '@/components/VehicleTagMappingModal';
import { useLanguage } from '@/context/LanguageContext';
import { getRoles, getUsersByEmail } from '@/lib/api';
import { useVehicleTagCheck } from '@/lib/hooks/useVehicleTagCheck';
import { getLocalStorage } from '@/lib/localStorageHandler';
import { toastError, toastSuccess } from '@/lib/toastHelper';
import { isEmpty } from '@/lib/utils';
import { useState } from 'react';

export default function UserLogin({ onUserSelect, locationId, hubId }) {
  const { t } = useLanguage();

  const [emailInput, setEmailInput] = useState('');
  const [loading, setLoading] = useState(false);

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [userToConfirm, setUserToConfirm] = useState(null);

  const { isChecking, showModal, unmappedData, triggerCheck, handleMappingCompleted } =
    useVehicleTagCheck();

  const handleSearchUser = async (e) => {
    e.preventDefault();
    if (!emailInput) return;

    if (!hubId) {
      toastError(t('home.toast.no_session'));
      return;
    }

    setLoading(true);
    try {
      const response = await getUsersByEmail(emailInput, hubId);
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
    const { storedLocation } = getLocalStorage();
    const targetCheckHubId = storedLocation || hubId;

    if (!targetCheckHubId) {
      toastError(t('home.toast.no_session'));
      setIsConfirmOpen(false);
      return;
    }
    await triggerCheck(targetCheckHubId, async () => {
      try {
        onUserSelect(userToConfirm);
        toastSuccess(t('home.toast.login_success'));
      } catch (err) {
        toastError(t('home.toast.login_failed', { err: err.message }));
      }
    });

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
        <p className="mt-3 text-sm text-slate-600">{t('common.loading')}</p>
      </div>
    );
  }

  const modalMessage = (
    <div className="flex flex-col gap-2">
      <div>
        {t('home.confirmation.question')} <span className="font-bold">{userToConfirm?.name}</span>?
      </div>
      <div className="text-sm text-gray-500">{userToConfirm?.email}</div>
      <div className="underline">{t('home.confirmation.caution')}</div>
    </div>
  );

  return (
    <div className="w-full max-w-md mt-6 mx-auto relative">
      {isChecking && (
        <div className="absolute inset-0 z-50 bg-white/40 backdrop-blur-sm flex items-center justify-center rounded-lg">
          <div className="flex flex-col items-center">
            <Spinner />
            <p className="mt-3 text-sm text-slate-600">{t('home.vehicle_check')}</p>
          </div>
        </div>
      )}

      <ConfirmModal
        cancelText={t('home.confirmation.cancel')}
        confirmText={t('home.confirmation.confirm')}
        isOpen={isConfirmOpen}
        message={modalMessage}
        onCancel={handleCancelConfirm}
        onConfirm={handleConfirmLogin}
        title={t('home.confirmation.title')}
      />

      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex flex-col gap-2 mb-4">
          <h1 className="text-3xl font-bold">{t('home.input_email_title')}</h1>
          <h2 className="text-lg mb-4 text-gray-500">
            {t('home.location_label')}: <strong>{locationId}</strong>
          </h2>
        </div>
        <form onSubmit={handleSearchUser} className="flex flex-col gap-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-500 mb-1 text-left"
            >
              {t('home.email')}
            </label>
            <input
              autoComplete="off"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-sky-500 focus:border-sky-500 outline-none"
              id="email"
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="john.doe@mail.com"
              required
              type="email"
              value={emailInput}
            />
          </div>
          <button
            className="w-full bg-sky-600 hover:bg-sky-700 text-white font-bold py-2 px-4 rounded transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed cursor-pointer"
            disabled={!emailInput}
            type="submit"
          >
            {t('home.login')}
          </button>
        </form>
        <div className="mt-4 text-right ">
          <span className="text-xs text-gray-400 italic">*{t('home.note')}</span>
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
