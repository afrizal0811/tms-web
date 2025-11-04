// File: src/components/AppLayout.js
'use client';

import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function AppLayout({ children, mainClassName }) {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      {/* - Layout ini mengizinkan scrolling. 
        - 'py-6 sm:py-12': Padding vertikal global
        - 'mainClassName': Untuk kustomisasi (misal: padding horizontal)
      */}
      <main className={`grow flex flex-col w-full py-6 sm:py-12 ${mainClassName || ''}`}>
        {children}
      </main>
      <Footer />
    </div>
  );
}
