'use client';

export default function ToggleButton({
  options = [],
  value,
  onChange,
  disabled = false,
  className = '',
  size = 'md',
}) {
  const containerSizes = {
    sm: 'w-20 h-[32px] p-1',
    md: 'w-28 h-[40px] p-1',
    lg: 'w-36 h-[48px] p-1',
  };

  const textSizes = {
    sm: 'text-[10px]',
    md: 'text-xs',
    lg: 'text-sm',
  };

  const buttonPaddings = {
    sm: 'px-1',
    md: 'px-3',
    lg: 'px-4',
  };

  return (
    <div
      className={`flex items-stretch rounded-lg border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800 ${containerSizes[size] || containerSizes.md} ${className}`}
    >
      {options.map((opt) => {
        const active = value === opt.value;

        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            disabled={disabled}
            className={`h-full flex-1 flex items-center justify-center rounded-md ${buttonPaddings[size] || buttonPaddings.md} font-medium transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-50 ${textSizes[size] || textSizes.md} ${
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
