export default function Card({ children, className = '' }) {
  return (
    <div
      className={`bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-4 md:p-6 shadow-sm flex flex-col w-full ${className}`}
    >
      {children}
    </div>
  );
}
