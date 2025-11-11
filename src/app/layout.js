// File: app/layout.js

import SessionGuard from '@/components/SessionGuard'; // <-- 1. IMPORT GUARD
import { Inter } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

export const metadata = {
  title: 'TMS Processing',
  description: 'TMS Processing',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${inter.className} 
                    bg-white text-slate-900`}
      >
        {/* <ThemeProvider> */}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
          }}
        />
        <SessionGuard>
          <main className="p-4 sm:p-6">{children}</main>
        </SessionGuard>
      </body>
    </html>
  );
}
