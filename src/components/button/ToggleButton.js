'use client';

export default function ToggleButton({
  options = [],
  value,
  onChange,
  disabled = false,
  className = '',
}) {
  return (
    <div
      className={`flex w-full items-center rounded-lg border border-slate-200 bg-slate-100 p-1 h-[42px] dark:border-slate-700 dark:bg-slate-800 ${className}`}
    >
      {options.map((opt) => {
        const active = value === opt.value;

        return (
          <button
            key={opt.label}
            type="button"
            onClick={() => onChange(opt.value)}
            disabled={disabled}
            className={`h-full flex-1 rounded-md px-4 text-xs font-medium transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-50 ${
              active
                ? 'bg-white text-sky-700 shadow-sm dark:bg-slate-700 dark:text-sky-400'
                : 'cursor-pointer text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
