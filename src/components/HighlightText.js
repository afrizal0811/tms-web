// File: src/components/HighlightText.js
'use client';

import { useMemo } from 'react';

export default function HighlightText({ text, highlight, className = '' }) {
  const parts = useMemo(() => {
    if (!text) return [];
    if (!highlight || highlight.trim() === '') return [text];

    // Escape karakter regex spesial (seperti *, +, ?, dll) agar tidak error
    const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const safeHighlight = escapeRegExp(highlight);
    const regex = new RegExp(`(${safeHighlight})`, 'gi');

    // Split text berdasarkan regex, tapi simpan delimiter-nya (bagian yg match)
    return text.toString().split(regex);
  }, [text, highlight]);

  if (!text) return null;

  return (
    <span className={className}>
      {parts.map((part, i) => {
        // Cek apakah bagian ini cocok dengan highlight (case-insensitive)
        const isMatch = part.toLowerCase() === highlight?.toLowerCase();

        return isMatch ? (
          <strong key={i} className="bg-yellow-300 text-black rounded-sm px-0.5">
            {part}
          </strong>
        ) : (
          part
        );
      })}
    </span>
  );
}
