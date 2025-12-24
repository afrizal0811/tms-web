// File: src/app/not-found.js
import Footer from '@/components/Footer';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-800 px-4 relative overflow-hidden font-sans">
      {/* --- Background Radar Effect --- */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[500px] h-[500px] border border-slate-200 rounded-full animate-ping absolute opacity-80"></div>
        <div className="w-[300px] h-[300px] border border-slate-300 rounded-full animate-ping delay-75 absolute opacity-60"></div>
      </div>

      {/* --- Icon Pin Nyasar --- */}
      <div className="relative z-10 mb-6 group">
        <div className="absolute -inset-4 bg-red-100/50 rounded-full blur-xl group-hover:bg-red-200/50 transition-all"></div>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-24 w-24 text-red-500 animate-bounce drop-shadow-sm"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z"
            clipRule="evenodd"
          />
        </svg>
        <div className="w-12 h-1.5 bg-slate-300/50 blur-[2px] rounded-full mx-auto mt-2 animate-pulse"></div>
      </div>

      {/* --- Headline --- */}
      <h1 className="text-4xl md:text-5xl font-black text-slate-800 mb-2 tracking-tight z-10 text-center">
        GPS SIGNAL LOST
      </h1>

      {/* --- Info Box --- */}
      <div className="bg-white border border-slate-200 p-6 rounded-xl max-w-lg text-center shadow-sm hover:shadow-md transition-shadow duration-300 mb-8 relative z-10">
        <div className="flex justify-between items-center border-b border-slate-100 pb-2 mb-3 font-mono text-xs">
          <span className="text-red-500 font-bold">ERROR: 404_NOT_FOUND</span>
          <span className="text-slate-400">LAT: -- | LNG: --</span>
        </div>

        <p className="text-slate-600 mb-4 leading-relaxed">
          Sistem gagal melacak koordinat halaman yang kamu tuju. Kemungkinan link rusak, halaman
          sudah dihapus, atau driver salah belok.
        </p>

        <div className="flex justify-center items-center gap-2 text-xs font-mono bg-slate-50 py-1.5 rounded text-slate-500">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
          </span>
          Recalculating route to dashboard...
        </div>
      </div>

      {/* --- Tombol Aksi --- */}
      <Link
        href="/"
        className="relative z-10 px-8 py-3 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-lg shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all flex items-center gap-2 mb-8"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
        Kembali ke Hub
      </Link>

      {/* --- Footer Fixed --- */}
      {/* Menggunakan absolute positioning agar selalu menempel di bawah */}
      <div className="absolute bottom-0 w-full z-20">
        <Footer />
      </div>
    </div>
  );
}
