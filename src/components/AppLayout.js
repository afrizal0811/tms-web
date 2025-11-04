// File: src/components/AppLayout.js
'use client';

export default function AppLayout({ children }) {
  return (
    <main className="flex min-h-screen flex-col items-center p-6 sm:p-24">
      <div className="flex flex-col justify-center items-center grow w-full">
        {children}
      </div>
      <footer className="w-full text-center text-slate-500 text-xs py-6">
        Dibuat oleh: Afrizal Maulana - EDP © 2025
      </footer>
    </main>
  );
}
