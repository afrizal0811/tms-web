// components/ThemeToggleItem.js
'use client';

export default function ThemeToggle({
  isActive,
  onToggle,
  darkLabel,
  lightLabel,
  className,
  isLargeIcon = false,
}) {
  const paddingMargin = isLargeIcon ? '' : 'py-2.5 mb-1 ';
  const toggleBgSize = isLargeIcon ? 'h-7 w-15' : 'h-6 w-11';
  const buttonSize = isLargeIcon ? 'h-6 w-7' : 'h-5 w-5';
  const buttonMove = isLargeIcon ? 'translate-x-7' : 'translate-x-5';
  const textSize = isLargeIcon ? 'text-sm' : 'text-[10px]';
  return (
    <div
      className={`flex items-center justify-between ${paddingMargin} text-slate-700 dark:text-slate-300 ${className}`}
    >
      <span className="font-medium">{isActive ? darkLabel : lightLabel}</span>

      <button
        onClick={onToggle}
        className={`relative inline-flex ${toggleBgSize} shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
          isActive ? 'bg-sky-600' : 'bg-amber-600'
        }`}
      >
        <span
          className={`pointer-events-none relative flex ${buttonSize} items-center justify-center rounded-full bg-white shadow ring-0 transform transition duration-200 ease-in-out ${
            isActive ? buttonMove : 'translate-x-0'
          }`}
        >
          <span className={textSize}>{isActive ? '🌙' : '🌞'}</span>
        </span>
      </button>
    </div>
  );
}
