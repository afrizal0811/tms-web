// File: src/components/SelectionLayout.js
'use client';

import Footer from '@/components/Footer';

export default function SelectionLayout({ children }) {
  return (
    // 'min-h-screen' memastikan div ini setinggi layar
    <div className="flex flex-col min-h-screen">
      {/* --- INI ADALAH PERBAIKANNYA --- */}
      <main className="grow flex flex-col justify-center items-center w-full p-6">
        {/* 'children' (konten Anda dari page.js) 
          sekarang akan dipusatkan di tengah secara sempurna
        */}
        {children}
      </main>
      {/* --- SELESAI PERBAIKAN --- */}

      <Footer />
    </div>
  );
}
