// File: src/components/StartFinishSummary.js
'use client';

import { useState } from 'react';

export default function StartFinishSummary({ selectedLocation, selectedUser, driverData, selectedDate }) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null); // Tambahkan state error

  const handleStartFinishSummary = () => {
    setIsLoading(true);
    setError(null);
    alert('Logika untuk Start-Finish Summary akan ada di sini!');
    setIsLoading(false);
  };

  return (
    // Bungkus dengan div (tanpa w-full)
    <div className="flex flex-col">
      <button
        onClick={handleStartFinishSummary}
        disabled={isLoading}
        className="px-6 py-3 rounded w-full sm:w-auto text-white
                   bg-purple-600 hover:bg-purple-700 disabled:bg-gray-500"
      >
        {isLoading ? 'Memproses...' : '3. Generate Start-Finish Summary'}
      </button>
      {error && (
        <p className="mt-2 text-red-500 text-xs text-center w-full max-w-xs">{error}</p>
      )}
    </div>
  );
}