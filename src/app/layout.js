// File: app/layout.js
import './globals.css';

export const metadata = {
  title: 'TMS-WEB',
  description: 'TMS Processing Summary',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      {/* - Tema diubah ke putih (Poin 1)
        - Navbar dan Footer dihapus dari sini.
      */}
      <body className="bg-white text-slate-900">{children}</body>
    </html>
  );
}
