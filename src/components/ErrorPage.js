// File: src/components/ErrorPage.js
import SelectionLayout from './SelectionLayout';

export default function ErrorPage() {
  return (
    <SelectionLayout>
      <div className="flex flex-col items-center justify-center p-8 max-w-lg mx-auto text-center animate-in fade-in zoom-in-95 duration-300">
        {/* --- Icon Error --- */}
        <div className="relative mb-6">
          <div className="absolute -inset-4 bg-red-100 rounded-full animate-pulse opacity-50"></div>
          <div className="bg-white p-4 rounded-full shadow-sm border border-red-100 relative">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-12 w-12 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          {/* Dekorasi silang kecil */}
          <div className="absolute -right-1 -top-1 bg-red-600 text-white rounded-full p-1 shadow-md">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-3 w-3"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        </div>

        {/* --- Headline --- */}
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Gagal Memuat Aplikasi</h2>

        {/* --- Deskripsi & Pesan Error Teknis --- */}
        <p className="text-slate-500 mb-6 leading-relaxed">
          Terjadi kendala saat menghubungi server atau koneksi Anda terputus. Silakan coba muat
          ulang halaman.
        </p>

        {/* --- Tombol Aksi --- */}
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <button
            onClick={() => window.location.reload()}
            className="flex items-center justify-center gap-2 px-6 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-lg shadow-sm transition-all hover:-translate-y-0.5 cursor-pointer"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2} // Stroke lebih tebal biar jelas
              stroke="currentColor"
              className="w-4 h-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
              />
            </svg>
            Coba Lagi
          </button>

          <button
            onClick={() => {
              localStorage.clear();
              window.location.reload();
            }}
            className="flex items-center justify-center gap-2 px-6 py-2.5 bg-white border border-slate-300 text-slate-600 hover:bg-slate-50 hover:text-red-600 hover:border-red-200 font-medium rounded-lg transition-all text-sm group cursor-pointer"
          >
            {/* Ikon Sampah (Trash) */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-4 h-4 text-slate-400 group-hover:text-red-500 transition-colors"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
              />
            </svg>
            Hapus Cache & Reload
          </button>
        </div>
      </div>
    </SelectionLayout>
  );
}
