import SessionGuard from '@/components/SessionGuard';
import SystemUpdateModal from '@/components/modal/SystemUpdateModal';
import TokenExpirationModal from '@/components/modal/TokenExpirationModal';
import { LanguageProvider } from '@/context/LanguageContext';
import ThemeProvider from '@/context/ThemeProvider';
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
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.className} bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200`}
      >
        <ThemeProvider>
          <LanguageProvider>
            <SystemUpdateModal />
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
        </ThemeProvider>
      </body>
    </html>
  );
}
