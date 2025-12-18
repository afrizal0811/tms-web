'use client';

import Footer from '@/components/Footer';
import Navbar from '@/components/navbar/Navbar';

export default function AppLayout({ children, mainClassName }) {
  return (
    <div className="flex flex-col h-screen overflow-auto">
      <Navbar />
      <main className={`grow flex flex-col w-full pt-8 ${mainClassName || ''}`}>{children}</main>
      <Footer />
    </div>
  );
}
