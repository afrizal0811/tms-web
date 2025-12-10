'use client';

export default function HeaderCard({ title = '', subtitle = '', items = [] }) {
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-6">
      {(title || subtitle) && (
        <div className="mb-4 md:mb-0">
          <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
          <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
        </div>
      )}
      {items.map((item, index) => (
        <div key={index} className="flex flex-col items-start w-full md:w-auto">
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
  );
}
