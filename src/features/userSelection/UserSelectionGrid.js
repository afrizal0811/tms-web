'use client';

import Spinner from '@/components/Spinner';
import VehicleTagMappingModal from '@/components/VehicleTagMappingModal';
import { useLanguage } from '@/context/LanguageContext';
import { ROLE_ID } from '@/lib/constants';
import { useVehicleTagCheck } from '@/lib/hooks/useVehicleTagCheck';
import { isEmpty } from '@/lib/utils';
import { useEffect, useState } from 'react';
import ConfirmModal from '../../components/ConfirmModal';
import { getUsers } from '../../lib/apiService';
import { toastSuccess } from '../../lib/toastHelper';

function capitalizeWords(str) {
  if (!str) return '';
  return str.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

// Atur berapa item per halaman untuk 3x3 grid
const ITEMS_PER_PAGE = 9;

// --- (PERUBAHAN 1): Terima 'roleIds' (array) ---
export default function UserSelectionGrid({ hubId, roleIds, onUserSelect }) {
  const { t } = useLanguage();
  const [usersData, setUsersData] = useState({
    loading: true,
    data: [],
    error: null,
  });
  const [selectedId, setSelectedId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [showAll, setShowAll] = useState(false); // State untuk mode rahasia

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [userToConfirm, setUserToConfirm] = useState(null);

  // HOOK untuk cek tag/kendaraan (sesuai API asumsi di atas)
  const { isChecking, showModal, unmappedData, triggerCheck, handleMappingCompleted } =
    useVehicleTagCheck();

  // ... (useEffect untuk hotkey CTRL+ALT+A... tetap sama) ...
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.altKey && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        setShowAll(true);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    if (!hubId) {
      setUsersData({ loading: true, data: [], error: null });
      return;
    }

    async function fetchUsers() {
      setUsersData({ loading: true, data: [], error: null });

      try {
        let usersArray = [];

        if (showAll) {
          // --- Mode Rahasia: Ambil SEMUA user (tanpa filter role) ---
          usersArray = await getUsers({ hubId: hubId, status: 'active' });
        } else {
          // --- Mode Normal: Ambil SEMUA roleIds yang diminta ---
          if (!Array.isArray(roleIds) || isEmpty(roleIds)) {
            throw new Error('Role tidak disediakan atau kosong.');
          }

          // Buat array berisi promise untuk setiap roleId
          const fetchPromises = roleIds.map((roleId) =>
            getUsers({
              hubId: hubId,
              status: 'active',
              roleId: roleId,
            })
          );
          const results = await Promise.all(fetchPromises);
          usersArray = results.flat();
        }

        // --- Logika Filter (tidak berubah) ---
        if (!Array.isArray(usersArray)) {
          throw new Error('Data user yang diterima bukanlah array.');
        }

        const forbiddenRoleIds = [ROLE_ID.driver, ROLE_ID.driverJkt];

        let processedData = usersArray;

        if (showAll) {
          processedData = processedData.filter((user) => !forbiddenRoleIds.includes(user.roleId));
        }

        processedData = processedData
          .filter((user) => user.name !== 'Hub Demo')
          .map((user) => ({
            ...user,
            name: capitalizeWords(user.name.replace('Hub ', '')),
          }))
          .sort((a, b) => a.name.localeCompare(b.name));

        setUsersData({
          loading: false,
          data: processedData,
          error: null,
        });
      } catch (err) {
        setUsersData({
          loading: false,
          data: [],
          error: err.message,
        });
      }
    }

    fetchUsers();
  }, [hubId, showAll, roleIds]);

  const totalPages = Math.ceil(usersData.data.length / ITEMS_PER_PAGE);
  const paginatedUsers = usersData.data.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );
  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };
  const handlePrevPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  // Handle saat radio button (user) dipilih
  const handleUserClick = (user) => {
    if (user._id === selectedId) {
      return;
    }
    setUserToConfirm(user);
    setIsConfirmOpen(true);
  };

  const handleConfirmSelection = async () => {
    if (!userToConfirm) {
      setIsConfirmOpen(false);
      return;
    }
    setIsConfirmOpen(false);
    triggerCheck(hubId, () => {
      setSelectedId(userToConfirm._id);
      onUserSelect(userToConfirm);
      toastSuccess(t('home.toast.success'));
      setUserToConfirm(null);
    });
  };

  const handleCancelSelection = () => {
    setIsConfirmOpen(false);
    setUserToConfirm(null);
  };

  const buttonPageClass =
    'px-6 py-3 rounded text-center cursor-pointer text-white font-bold bg-sky-600 hover:bg-sky-700 disabled:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed';

  if (usersData.loading) {
    return (
      <div className="flex flex-col items-center">
        <Spinner />
        <p className="mt-3 text-sm text-slate-600">{t('common.loading')}</p>
      </div>
    );
  }
  // Tampilan Error
  if (usersData.error) {
    return <p className="mt-6 text-red-500">{usersData.error}</p>;
  }
  // Tampilan jika tidak ada user
  if (isEmpty(usersData.data)) {
    return <p className="mt-6 text-gray-400">Tidak ada user ditemukan di lokasi ini.</p>;
  }
  const modalMessage = (
    <div className="flex flex-col gap-2">
      <div>
        {t('home.confirmation.question')} <span className="font-bold">{userToConfirm?.name}</span>?
      </div>
      <div className="underline">{t('home.confirmation.caution')}</div>
    </div>
  );
  // Tampilan Grid
  return (
    <div className="w-full max-w-2xl mt-6 mx-auto relative">
      {showAll && <p className="text-center text-red-500 text-sm mb-4">{t('home.secret_mode')}</p>}

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
        onCancel={handleCancelSelection}
        onConfirm={handleConfirmSelection}
        title={t('home.confirmation.title')}
      />

      <div role="radiogroup" aria-label="Pilih User" className="grid grid-cols-3 gap-4">
        {paginatedUsers.map((user) => (
          <div key={user._id}>
            <input
              checked={selectedId === user._id}
              className="sr-only peer"
              id={user._id}
              name="userSelection"
              readOnly
              type="radio"
              value={user._id}
            />
            <label
              className={`
                flex items-center justify-center w-full p-4 h-24
                text-center border rounded-lg cursor-pointer
                bg-white border-gray-300 text-gray-700
                hover:border-sky-500 hover:text-sky-600
                peer-checked:bg-sky-600 peer-checked:text-white peer-checked:border-sky-600
                truncate transition-colors
              `}
              htmlFor={user._id}
              onClick={() => handleUserClick(user)}
            >
              {user.name}
            </label>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="grid grid-cols-3 items-center mt-6">
          <button
            className={`justify-self-start ${buttonPageClass}`}
            disabled={currentPage === 1}
            onClick={handlePrevPage}
          >
            {t('home.previous')}
          </button>
          <span className="justify-self-center text-sm text-gray-400 whitespace-nowrap">
            {t('home.page')} {currentPage} {t('home.from')} {totalPages}
          </span>
          <button
            className={`justify-self-end ${buttonPageClass}`}
            disabled={currentPage === totalPages}
            onClick={handleNextPage}
          >
            {t('home.next')}
          </button>
        </div>
      )}
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
