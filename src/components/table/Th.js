export default function Th({ children, widthClass = '' }) {
  return (
    <th className={`p-3 text-left text-xs font-semibold text-gray-600 uppercase bg-gray-100 border-b border-gray-200 ${widthClass}`}>
      {children}
    </th>
  );
}
