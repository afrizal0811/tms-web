// File: src/components/AppLayout.js
'use client';

import Footer from '@/components/Footer';
import Navbar from '@/components/navbar/Navbar';

export default function AppLayout({ children, mainClassName }) {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className={`grow flex flex-col w-full py-6 sm:py-12 ${mainClassName || ''}`}>
        {children}
      </main>
      <Footer />
    </div>
  );
}
