'use client';
import { useState } from 'react';

export default function HeaderCard({ title = '', subtitle = '', items = [] }) {
  const itemsLength = items.length;
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      className={`relative z-50 flex flex-col ${itemsLength < 5 ? 'lg:flex-row' : ''} justify-between items-start lg:items-center bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 mb-6 gap-4 transition-colors duration-200`}
    >
      {(title || subtitle) && (
        <div
          className={`flex flex-col w-full lg:w-auto text-left ${itemsLength >= 2 ? 'md:text-center' : ''} ${itemsLength < 5 ? 'lg:text-left' : 'lg:text-center'} w-full md:min-w-xs`}
        >
          {title && (
            <h1 className="text-xl md:text-3xl font-bold text-gray-900 dark:text-slate-100">
              {title}
            </h1>
          )}
          {subtitle && (
            <p className="text-xs md:text-sm text-gray-500 dark:text-slate-400 mt-1">{subtitle}</p>
          )}

          {itemsLength > 1 && (
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="md:hidden mt-4 p-2 w-full max-w-full min-w- flex items-center justify-center text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
            >
              <svg
                className={`w-5 h-5 transform transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
          )}
        </div>
      )}

      <div className={`w-full xl:w-auto ${itemsLength > 1 && !isOpen ? 'hidden md:grid' : 'grid'}`}>
        <div>
          <div
            className={`grid grid-cols-1 ${itemsLength > 1 ? 'md:grid-cols-2' : ''} xl:flex xl:flex-row gap-3 w-full xl:w-auto items-end xl:items-center mt-2 md:mt-0 pb-1`}
          >
            {items.map((item, index) => (
              <div
                key={index}
                className="flex flex-col items-start w-full relative"
                style={{ zIndex: 50 - index }}
              >
                <label
                  className={`block text-xs mb-1 ml-1 font-medium select-none ${
                    item.hideLabel ? 'text-transparent ' : 'text-gray-400 dark:text-slate-400'
                  } `}
                >
                  {item.label || 'Label'}
                </label>
                {item.component}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
