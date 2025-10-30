// File: src/components/DeliverySummary.js
'use client';

import { useState } from 'react';

export default function DeliverySummary({ selectedLocation, selectedUser, driverData, selectedDate }) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null); // Tambahkan state error

  const handleDeliverySummary = () => {
    setIsLoading(true);
    setError(null);
    alert('Logika untuk Delivery Summary akan ada di sini!');
    // Nanti di sini kamu akan:
    // 1. Fetch API
    // 2. Proses data
    // 3. Buat Excel
    setIsLoading(false);
  };

  return (
    // Bungkus dengan div (tanpa w-full)
    <div className="flex flex-col">
      <button
        onClick={handleDeliverySummary}
        disabled={isLoading}
        className="px-6 py-3 rounded w-full sm:w-auto text-white
                   bg-green-600 hover:bg-green-700 disabled:bg-gray-500"
      >
        {isLoading ? 'Memproses...' : '2. Generate Delivery Summary'}
      </button>
      {error && (
        <p className="mt-2 text-red-500 text-xs text-center w-full max-w-xs">{error}</p>
      )}
    </div>
  );
}