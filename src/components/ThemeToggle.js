'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Mencegah hydration mismatch error DAN menghindari linter "cascading render"
  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  // Opsional: Daripada return null, lebih baik return elemen kosong dengan ukuran yang sama
  // agar layout tidak "melompat" (layout shift) saat tombolnya tiba-tiba muncul
  if (!mounted) {
    return (
      <div className="h-10 w-[140px] bg-gray-100 dark:bg-slate-800 rounded-lg animate-pulse" />
    );
  }

  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="p-2 border border-gray-200 dark:border-slate-700 rounded-lg bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-gray-200 transition-colors shadow-sm text-sm font-medium cursor-pointer"
    >
      {theme === 'dark' ? '🌞 Mode Terang' : '🌙 Mode Gelap'}
    </button>
  );
}
