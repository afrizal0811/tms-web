// File: src/components/TabButton.js
'use client';

export default function TabButton({ children, isActive, onClick, className = '' }) {
  const baseClasses = `
    px-5 py-3 
    font-semibold text-sm 
    whitespace-nowrap 
    transition-colors duration-200 
    border-b-2 outline-none 
    shrink-0
    dark:text-slate-200
    ${className}
  `;

  const activeClasses = isActive
    ? 'border-sky-600 text-sky-600 dark:border-sky-400 dark:text-sky-400!'
    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:hover:text-slate-100 dark:hover:border-slate-600 opacity-60 hover:opacity-100 cursor-pointer';

  return (
    <button onClick={onClick} className={`${baseClasses} ${activeClasses}`}>
      <div className="flex items-center justify-center gap-2">{children}</div>
    </button>
  );
}
