'use client';

import Navbar from '@/components/navbar/Navbar';
import Footer from '@/components/page/Footer';

export default function SelectionLayout({ children }) {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="grow flex flex-col justify-center items-center w-full p-6">{children}</main>
      <Footer />
    </div>
  );
}
