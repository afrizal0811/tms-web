// File: src/components/HeaderCard.js
'use client';

export default function HeaderCard({ title = '', subtitle = '', items = [] }) {
  const itemsLength = items.length;

  return (
    <div
      className={`flex flex-col ${itemsLength >= 2 ? 'lg:flex-row' : 'md:flex-row'} justify-between items-start md:items-center bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 mb-6 gap-4 transition-colors duration-200`}
    >
      {(title || subtitle) && (
        <div
          className={`mb-4 md:mb-0 text-left  ${itemsLength >= 2 ? 'md:text-center ' : ''}  lg:text-left min-w-xs`}
        >
          {title && (
            <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100">{title}</h1>
          )}
          {subtitle && <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">{subtitle}</p>}
        </div>
      )}

      <div
        className={`grid grid-cols-1 ${itemsLength > 1 ? 'md:grid-cols-2' : ''} xl:flex xl:flex-row gap-3 w-full md:w-auto items-end xl:items-center`}
      >
        {items.map((item, index) => (
          <div
            key={index}
            className="flex flex-col items-start w-full md:w-auto relative"
            style={{ zIndex: 50 - index }}
          >
            <label
              className={`block text-xs mb-1 ml-1 font-medium select-none ${
                item.hideLabel ? 'text-transparent' : 'text-gray-400 dark:text-slate-400'
              } `}
            >
              {item.label || 'Label'}
            </label>
            {item.component}
          </div>
        ))}
      </div>
    </div>
  );
}
