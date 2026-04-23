export default function Td({ children, alignClass = 'text-left' }) {
  return (
    <td
      className={`p-3 text-sm text-gray-800 border-b border-gray-200 align-top dark:text-slate-300 dark:border-slate-700 ${alignClass}`}
    >
      {children}
    </td>
  );
}
