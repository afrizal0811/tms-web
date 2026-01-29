// File: src/app/layout.js

import SessionGuard from '@/components/SessionGuard';
import TokenExpirationModal from '@/components/TokenExpirationModal';
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
            containerStyle={{
              top: 80,
              left: 20,
              bottom: 20,
              right: 20,
            }}
            toastOptions={{
              duration: 4000,
            }}
          />
          <TokenExpirationModal />
          <SessionGuard>
            <main className="p-0">{children}</main>
          </SessionGuard>
        </LanguageProvider>
      </body>
    </html>
  );
}
