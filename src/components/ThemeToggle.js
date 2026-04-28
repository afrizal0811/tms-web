// components/ThemeToggleItem.js
'use client';

export default function ThemeToggle({ isActive, onToggle, darkLabel, lightLabel, className }) {
  return (
    <div className={`flex items-center justify-between py-2.5 mb-1  text-slate-700 dark:text-slate-300 ${className}`}>
      <span className="font-medium">{isActive ? darkLabel : lightLabel}</span>

      <button
        onClick={onToggle}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
          isActive ? 'bg-sky-600' : 'bg-amber-600'
        }`}
      >
        <span
          className={`pointer-events-none relative flex h-5 w-5 items-center justify-center rounded-full bg-white shadow ring-0 transform transition duration-200 ease-in-out ${
            isActive ? 'translate-x-5' : 'translate-x-0'
          }`}
        >
          <span className="text-[10px]">{isActive ? '🌙' : '🌞'}</span>
        </span>
      </button>
    </div>
  );
}
