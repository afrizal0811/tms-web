// File: src/components/DownloadButton.js
'use client';

import Spinner from './Spinner';

export default function DownloadButton(props) {
  const {
    onClick,
    isLoading = false,
    disabled = false,
    width = 'w-full lg:w-auto',
    text = 'Download Excel',
  } = props;

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      // Class width akan mengikuti prop di atas
      className={`${width} px-6 h-[42px] bg-sky-600 text-white font-semibold rounded-md hover:bg-sky-700 transition-all disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm cursor-pointer whitespace-nowrap`}
    >
      {isLoading ? (
        <Spinner
          addClass="inline-block"
          border="border-2 border-slate-400 border-t-white"
          size="w-5 h-5"
        />
      ) : (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
          />
        </svg>
      )}
      <span>{text}</span>
    </button>
  );
}
