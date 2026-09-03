// File: src/components/SearchBar.js
'use client';
import Tooltip from './Tooltip';

export default function SearchBar({
  value,
  onChange,
  placeholder = 'Search...',
  className = 'w-full',
  disabled = false,
  width = 'w-full xl:w-[250px]!',
  size = 'lg',
  tooltip
}) {
  const sizeClasses = {
    sm: { icon: 'h-3 w-3', input: 'text-xs h-[30px]' },
    md: { icon: 'h-4 w-4', input: 'text-sm h-[34px]' },
    lg: { icon: 'h-5 w-5', input: 'text-base h-[42px]' },
  };
  return (
    <div className={`relative shrink-0 ${className} ${width}`}>
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <svg
          className={`${sizeClasses[size].icon} text-gray-400 dark:text-slate-500`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>
      <Tooltip tooltipContent={tooltip ? tooltip : ''}>
        <input
          type="text"
          className={`w-full pl-10 pr-10 ${sizeClasses[size].input} border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-colors disabled:cursor-not-allowed disabled:bg-gray-100 dark:disabled:bg-slate-800/50 disabled:text-gray-400 dark:disabled:text-slate-500`}
          placeholder={placeholder}
          disabled={disabled}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </Tooltip>

      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-200 cursor-pointer transition-colors"
          aria-label="Clear search"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      )}
    </div>
  );
}
