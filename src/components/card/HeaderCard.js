// File: src/components/HeaderCard.js
'use client';

export default function HeaderCard({ title = '', subtitle = '', items = [] }) {
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-6 gap-4">
      {(title || subtitle) && (
        <div className="mb-4 md:mb-0">
          {title && <h1 className="text-3xl font-bold text-gray-900">{title}</h1>}
          {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto items-end md:items-center">
        {items.map((item, index) => (
          <div
            key={index}
            className="flex flex-col items-start w-full md:w-auto relative"
            style={{ zIndex: 50 - index }}
          >
            <label
              className={`block text-xs mb-1 ml-1 font-medium select-none ${
                item.hideLabel ? 'text-transparent' : 'text-gray-400'
              }`}
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
