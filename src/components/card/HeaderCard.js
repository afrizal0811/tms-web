// File: src/components/HeaderCard.js
'use client';

export default function HeaderCard({ title = '', subtitle = '', items = [] }) {
  const isCompact = items.length <= 2;
  const itemRowBp = 'lg';
  const containerRowBp = isCompact ? 'lg' : '2xl';

  return (
    <div
      className={`flex flex-col ${containerRowBp}:flex-row justify-between items-start ${containerRowBp}:items-center bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-6 gap-6`}
    >
      {/* BAGIAN JUDUL */}
      <div className={`w-full ${containerRowBp}:w-auto text-left`}>
        {title && (
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight whitespace-nowrap">
            {title}
          </h1>
        )}
        {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
      </div>

      {/* BAGIAN ITEMS */}
      <div
        className={`flex flex-col ${itemRowBp}:flex-row gap-4 w-full ${containerRowBp}:w-auto items-end`}
      >
        {items.map((item, index) => (
          <div
            key={index}
            className={`
              flex flex-col items-start 
              w-full ${itemRowBp}:w-auto 
              shrink-0 relative
              max-lg:*:w-full!
            `}
            style={{ zIndex: 50 - index }}
          >
            <label
              className={`block text-xs mb-1 ml-1 text-gray-400 tracking-wider whitespace-nowrap transition-all ${
                item.hideLabel ? 'opacity-0 h-0 overflow-hidden' : 'opacity-100 h-auto'
              }`}
            >
              {item.label}
            </label>

            <div className={`w-full ${itemRowBp}:w-auto`}>{item.component}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
