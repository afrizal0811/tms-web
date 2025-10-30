// File: src/components/UserSelectionGrid.js
'use client';

import { useState, useEffect } from 'react';

// 3x3 grid
const ITEMS_PER_PAGE = 9;

// Fungsi untuk Capitalize Each Word
function capitalizeWords(str) {
  if (!str) return "";
  return str.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function UserSelectionGrid({ hubId, roleId, onUserSelect }) {
  // ... (State: usersData, selectedId, currentPage, showAll... tetap sama) ...
  const [usersData, setUsersData] = useState({
    loading: true,
    data: [],
    error: null,
  });
  const [selectedId, setSelectedId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [showAll, setShowAll] = useState(false);

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

  // useEffect untuk mengambil data users (INI YANG BERUBAH)
  useEffect(() => {
    async function fetchUsers() {
      setUsersData({ loading: true, data: [], error: null });
      
      let apiUrl = `/api/get-users?hubId=${hubId}&status=active`;
      if (!showAll) {
        apiUrl += `&roleId=${roleId}`; 
      }
      
      try {
        const response = await fetch(apiUrl);
        const responseData = await response.json();

        if (!response.ok) {
          throw new Error(responseData.error || 'Gagal mengambil data users');
        }

        const usersArray = responseData.data;
        if (!Array.isArray(usersArray)) {
          throw new Error("Data user yang diterima bukanlah array.");
        }
        
        // --- INI BAGIAN BARU UNTUK FILTER TAMBAHAN ---

        // 0. Definisikan ID Driver yang dilarang
        const forbiddenRoleIds = [
          '6703410af6be892f3208ecde', // Driver
          '68f74e1cff7fa2efdd0f6a38'  // Driver JKT
        ];

        // 1. Mulai dengan data mentah
        let processedData = usersArray;

        // 2. Terapkan filter rahasia JIKA mode 'showAll' aktif
        if (showAll) {
          processedData = processedData.filter(user => 
            !forbiddenRoleIds.includes(user.roleId)
          );
        }

        // 3. Terapkan filter & map & sort (yang sudah ada sebelumnya)
        processedData = processedData
          // Filter "Hub Demo" (selalu)
          .filter(user => user.name !== "Hub Demo")
          // Ubah nama (Capitalize & replace)
          .map(user => ({
            ...user,
            name: capitalizeWords(user.name.replace("Hub ", ""))
          }))
          // Urutkan nama (selalu)
          .sort((a, b) => a.name.localeCompare(b.name));
        
        // --- SELESAI PERUBAHAN ---
        
        setUsersData({
          loading: false,
          data: processedData, // Simpan data yang sudah diproses
          error: null,
        });

      } catch (err) {
        console.error('Error fetching users:', err);
        setUsersData({
          loading: false,
          data: [],
          error: err.message,
        });
      }
    }

    fetchUsers();
  }, [hubId, roleId, showAll]); 

  // --- SISA KOMPONEN (TETAP SAMA) ---

  // ... (Logic Pagination: totalPages, paginatedUsers, handleNextPage, handlePrevPage) ...
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

  // ... (handleChange) ...
  const handleChange = (user) => {
    setSelectedId(user._id);
    onUserSelect(user);
  };

  // ... (Render: loading, error, empty) ...
  if (usersData.loading) {
    return <p className="mt-6 text-gray-400">Mencari user...</p>;
  }
  if (usersData.error) {
    return <p className="mt-6 text-red-500">{usersData.error}</p>;
  }
  if (usersData.data.length === 0) {
    return <p className="mt-6 text-gray-400">Tidak ada user ditemukan.</p>;
  }

  // ... (Return JSX) ...
  return (
    <div className="w-full max-w-2xl mt-6 mx-auto"> 
      
      {showAll && (
        <p className="text-center text-yellow-500 text-sm mb-4">
          Mode Rahasia: Menampilkan semua user (kecuali Driver)
        </p>
      )}

      <div 
        role="radiogroup" 
        aria-label="Pilih User"
        className="grid grid-cols-3 gap-4" 
      >
        {paginatedUsers.map((user) => (
          <div key={user._id}>
            <input
              type="radio"
              id={user._id}
              name="userSelection"
              value={user._id}
              checked={selectedId === user._id}
              onChange={() => handleChange(user)}
              className="sr-only peer"
            />
            <label
              htmlFor={user._id}
              className={`
                flex items-center justify-center w-full p-4 h-24
                text-center border rounded-lg cursor-pointer
                bg-gray-700 border-gray-600 text-gray-300
                hover:bg-gray-600
                peer-checked:ring-2 peer-checked:ring-blue-500
                peer-checked:bg-blue-900 peer-checked:text-white
                truncate
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
            className="px-4 py-2 bg-gray-600 rounded disabled:opacity-50"
          >
            Sebelumnya
          </button>
          <span className="text-sm text-gray-400">
            Halaman {currentPage} dari {totalPages}
          </span>
          <button
            onClick={handleNextPage}
            disabled={currentPage === totalPages}
            className="px-4 py-2 bg-gray-600 rounded disabled:opacity-50"
          >
            Selanjutnya
          </button>
        </div>
      )}
    </div>
  );
}