// File: src/context/LanguageContext.js
'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { dictionary } from '@/lib/dictionary';

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  // 1. LAZY INITIALIZATION (Solusi Error Cascading Render)
  // Kita cek localStorage langsung saat state dibuat, bukan di useEffect.
  const [lang, setLang] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('app_lang');
      // Kembalikan nilai dari storage jika ada, atau default 'id'
      return stored ? stored.replace(/"/g, '') : 'id';
    }
    return 'id'; // Default untuk server-side rendering
  });

  // 2. Fungsi Ganti Bahasa (Tanpa Enkripsi)
  const switchLanguage = (newLang) => {
    setLang(newLang);
    localStorage.setItem('app_lang', newLang); // Simpan biasa (plain text)
  };

  // 3. Fungsi Translate Helper (t)
  const t = (key) => {
    const keys = key.split('.');
    let value = dictionary[lang];

    // Safety check: jika dictionary[lang] belum siap/undefined, fallback ke id
    if (!value) value = dictionary['id'];

    keys.forEach((k) => {
      value = value ? value[k] : null;
    });

    return value || key; // Kalau tidak ketemu, tampilkan key-nya aja
  };

  return (
    <LanguageContext.Provider value={{ lang, switchLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
