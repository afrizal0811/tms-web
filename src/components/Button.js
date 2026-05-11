'use client';

import Spinner from './Spinner';

export default function Button({
  onClick,
  isLoading = false,
  disabled = false,
  width = 'w-full',
  text = 'Button',
  loadingText,
  icon = null,
  type = 'button',
  className = '',
  ...rest
}) {
  const isDisabled = disabled || isLoading;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      {...rest}
      className={`
        ${width} cursor-pointer px-6 h-[42px] flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-semibold shadow-sm transition-all bg-sky-600 text-white border border-sky-800/60 hover:bg-sky-700 dark:text-white dark:hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:border-slate-300 disabled:text-slate-500 dark:disabled:bg-slate-800 dark:disabled:border-slate-700 dark:disabled:text-slate-500 ${className}
      `}
    >
      {isLoading ? (
        <>
          <Spinner
            addClass="inline-block"
            border="border-2 border-sky-200 border-t-white dark:border-sky-200 dark:border-t-white"
            size="w-5 h-5"
          />
          <span>{loadingText !== undefined ? loadingText : text}</span>
        </>
      ) : (
        <>
          {icon && <span className="flex items-center justify-center">{icon}</span>}
          <span>{text}</span>
        </>
      )}
    </button>
  );
}
