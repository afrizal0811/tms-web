'use client';

import { useEffect, useState } from 'react';
import ConfirmModal from '../../components/ConfirmModal';
import { getUsers } from '../../lib/apiService';
import { toastSuccess } from '../../lib/toastHelper';

// Fungsi helper untuk Capitalize
function capitalizeWords(str) {
  if (!str) return '';
  return str.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

// Atur berapa item per halaman untuk 3x3 grid
const ITEMS_PER_PAGE = 9;

// --- (PERUBAHAN 1): Terima 'roleIds' (array) ---
export default function UserSelectionGrid({ hubId, roleIds, onUserSelect }) {
  // ... (State: usersData, selectedId, currentPage... tetap sama) ...
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
          if (!Array.isArray(roleIds) || roleIds.length === 0) {
            throw new Error('Role tidak disediakan atau kosong.');
          }

          // Buat array berisi promise untuk setiap roleId
          const fetchPromises = roleIds.map(roleId => 
            getUsers({ 
              hubId: hubId, 
              status: 'active', 
              roleId: roleId 
            })
          );
          
          // Jalankan semua promise secara paralel
          const results = await Promise.all(fetchPromises);
          
          // Gabungkan hasil dari semua panggilan API (results adalah array dari array)
          usersArray = results.flat();
        }

        // --- Logika Filter (tidak berubah) ---
        if (!Array.isArray(usersArray)) {
          throw new Error('Data user yang diterima bukanlah array.');
        }

        const forbiddenRoleIds = [
          '6703410af6be892f3208ecde', // Driver
          '68f74e1cff7fa2efdd0f6a38', // Driver JKT
        ];

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
  }, [hubId, roleIds, showAll]); // <-- 'roleId' diganti 'roleIds'
  // --- (SELESAI PERUBAHAN 2) ---


  // ... (Sisa logika: pagination, handleChange, render... tetap sama) ...

  // --- LOGIC PAGINATION ---
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

  const handleConfirmSelection = () => {
    if (userToConfirm) {
      setSelectedId(userToConfirm._id);
      onUserSelect(userToConfirm);
      toastSuccess(`Data berhasil disimpan!`);
    }
    setIsConfirmOpen(false);
    setUserToConfirm(null);
  };

  const handleCancelSelection = () => {
    setIsConfirmOpen(false);
    setUserToConfirm(null);
  };

  // Tampilan Loading
  if (usersData.loading) {
    return <p className="mt-6 text-gray-400">Mencari user...</p>;
  }
  // Tampilan Error
  if (usersData.error) {
    return <p className="mt-6 text-red-500">{usersData.error}</p>;
  }
  // Tampilan jika tidak ada user
  if (usersData.data.length === 0) {
    return <p className="mt-6 text-gray-400">Tidak ada user ditemukan di lokasi ini.</p>;
  }

  // Tampilan Grid
  return (
    <div className="w-full max-w-2xl mt-6 mx-auto">
      {showAll && (
        <p className="text-center text-red-500 text-sm mb-4">
          Mode Rahasia: Menampilkan semua user
        </p>
      )}
      <ConfirmModal
        isOpen={isConfirmOpen}
        title="Konfirmasi Pilihan User"
        message={`Anda yakin ingin memilih user "${userToConfirm?.name}"?`}
        onConfirm={handleConfirmSelection}
        onCancel={handleCancelSelection}
      />

      <div role="radiogroup" aria-label="Pilih User" className="grid grid-cols-3 gap-4">
        {paginatedUsers.map((user) => (
          <div key={user._id}>
            <input
              type="radio"
              id={user._id}
              name="userSelection"
              value={user._id}
              checked={selectedId === user._id}
              readOnly
              className="sr-only peer"
            />
            <label
              htmlFor={user._id}
              onClick={() => handleUserClick(user)}
              className={`
                flex items-center justify-center w-full p-4 h-24
                text-center border rounded-lg cursor-pointer
                bg-white border-gray-300 text-gray-700
                hover:border-sky-500 hover:text-sky-600
                peer-checked:bg-sky-600 peer-checked:text-white peer-checked:border-sky-600
                truncate transition-colors
              `}
            >
              {user.name}
            </label>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-between items-center mt-6">
          <button
            onClick={handlePrevPage}
            disabled={currentPage === 1}
            className="px-6 py-3 rounded text-center cursor-pointer text-white font-bold bg-sky-600 hover:bg-sky-700 disabled:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Sebelumnya
          </button>
          <span className="text-sm text-gray-400">
            Halaman {currentPage} dari {totalPages}
          </span>
          <button
            onClick={handleNextPage}
            disabled={currentPage === totalPages}
            className="px-6 py-3 rounded text-center cursor-pointer text-white font-bold bg-sky-600 hover:bg-sky-700 disabled:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Selanjutnya
          </button>
        </div>
      )}
    </div>
  );
}