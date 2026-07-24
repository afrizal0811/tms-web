'use client';

import Tooltip from './Tooltip';

export default function RadioCard({ options, selected, onChange, disabled }) {
  return (
    <div className="flex flex-wrap justify-center gap-3 w-full max-w-3xl">
      {options.map((opt) => {
        const isActive = selected === opt.id;
        return (
          <div
            key={opt.id}
            onClick={() => !disabled && onChange(opt.id)}
            className={`relative flex items-center justify-between w-full sm:w-60 p-3 border rounded-lg cursor-pointer transition-all ${
              isActive
                ? 'border-sky-600 bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-300 font-semibold shadow-sm'
                : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-300'
            }`}
          >
            <span className="text-sm">{opt.label}</span>
            {opt.tooltip ? (
              <Tooltip tooltipContent={opt.tooltip}>
                <span className="inline-flex items-center justify-center p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    className="w-4 h-4"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.21M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
                    />
                  </svg>
                </span>
              </Tooltip>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
