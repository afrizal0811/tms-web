// File: src/components/Spinner.js
'use client';

// Komponen spinner sederhana menggunakan utilitas Tailwind
export default function Spinner({ size = 'w-12 h-12', colorClass = 'border-t-blue-600' }) {
  return (
    <div
      className={`
      ${size} 
      border-4 
      border-gray-200 
      ${colorClass} 
      rounded-full 
      animate-spin
    `}
    />
  );
}
