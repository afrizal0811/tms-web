export default function Th({ children, widthClass = '', alignClass = 'text-left', className }) {
  return (
    <th
      className={`p-3 ${alignClass} text-xs font-semibold text-gray-600 uppercase bg-gray-100 border-b border-gray-200 dark:bg-[#1b2639] dark:text-slate-300 dark:border-slate-700 ${widthClass} ${className}`}
    >
      {children}
    </th>
  );
}
