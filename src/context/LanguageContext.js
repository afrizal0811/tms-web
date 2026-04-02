// File: src/context/LanguageContext.js
'use client';

import { dictionary } from '@/lib/dictionary';
import { getLocalStorage, setLocalStorage } from '@/lib/localStorageHandler';
import { createContext, useContext, useState } from 'react';
const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => {
    if (typeof window !== 'undefined') {
      const { storedLanguage: stored } = getLocalStorage();
      return stored ? stored.replace(/"/g, '') : 'en';
    }
    return 'en';
  });

  const switchLanguage = (newLang) => {
    setLang(newLang);
    setLocalStorage('language', newLang);
  };

  // Fungsi Translate Helper (t)
  const t = (key, params) => {
    const keys = key.split('.');
    let value = dictionary[lang];
    if (!value) value = dictionary['en'];

    keys.forEach((k) => {
      value = value ? value[k] : null;
    });

    let text = value || key;
    if (typeof text === 'string' && params) {
      Object.keys(params).forEach((paramKey) => {
        text = text.replace(new RegExp(`{${paramKey}}`, 'g'), params[paramKey]);
      });
    }

    return text;
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
