// File: src/components/Button.js
'use client';

import Spinner from './Spinner';

export default function Button({
  onClick,
  isLoading = false,
  disabled = false,
  width = 'w-full',
  text = 'Button',
  icon = null,
  type = 'button',
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
        ${width} cursor-pointer px-6 h-[42px] flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-semibold shadow-sm transition-all bg-sky-600 text-white border border-sky-800/60 hover:bg-sky-700 dark:bg-sky-600 dark:text-white dark:border-sky-500 dark:hover:bg-sky-500 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:border-slate-300 disabled:text-slate-500 dark:disabled:bg-slate-800 dark:disabled:border-slate-700 dark:disabled:text-slate-500
      `}
    >
      {isLoading ? (
        <Spinner
          addClass="inline-block"
          border="border-2 border-sky-200 border-t-white dark:border-sky-200 dark:border-t-white"
          size="w-5 h-5"
        />
      ) : (
        icon && icon
      )}
      <span>{text}</span>
    </button>
  );
}
