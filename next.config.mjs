import fs from 'fs';

// Membaca file package.json secara aman di dalam environment ES Module
const packageJson = JSON.parse(fs.readFileSync(new URL('./package.json', import.meta.url)));

/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  reactCompiler: true, // Konfigurasi bawaanmu tetap dipertahankan

  env: {
    // Mengekspos versi dari package.json ke seluruh aplikasi React
    NEXT_PUBLIC_APP_VERSION: packageJson.version,
  },
};

export default nextConfig;
