// File: src/components/Spinner.js
'use client';

// Komponen spinner sederhana menggunakan utilitas Tailwind
export default function Spinner({
  addClass = '',
  border = 'border-4 border-gray-200 dark:border-gray-400',
  colorClass = 'border-t-sky-600 dark:border-t-slate-700',
  size = 'w-12 h-12',
}) {
  return (
    <div
      className={`
      ${addClass}
      ${border}
      ${colorClass} 
      ${size} 
      animate-spin
      rounded-full 
    `}
    />
  );
}
