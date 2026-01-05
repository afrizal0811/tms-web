// File: src/app/layout.js

import SessionGuard from '@/components/SessionGuard';
import { LanguageProvider } from '@/context/LanguageContext';
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
      <body className={`${inter.className} bg-white text-slate-900`}>
        <LanguageProvider>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
            }}
          />
          <SessionGuard>
            <main className="p-0">{children}</main>
          </SessionGuard>
        </LanguageProvider>
      </body>
    </html>
  );
}
