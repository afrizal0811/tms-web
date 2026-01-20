// File: src/components/HighlightText.js
'use client';

import { useMemo } from 'react';

export default function HighlightText({ text, highlight, className = '' }) {
  const { parts, isTextEmpty } = useMemo(() => {
    let strText = '';

    if (text === null || text === undefined) {
      return { parts: [], isTextEmpty: true };
    }

    if (typeof text === 'object') {
      try {
        if (Array.isArray(text)) {
          strText = text
            .map((item) => (item === null || item === undefined ? '' : String(item)))
            .join(', ');
        } else {
          if (text.name) strText = String(text.name);
          else if (text.label) strText = String(text.label);
          else strText = JSON.stringify(text);
        }
      } catch (e) {
        strText = String(text);
      }
    } else {
      strText = String(text);
    }

    if (!strText || strText.trim() === '') {
      return { parts: [strText], isTextEmpty: true };
    }
    if (!highlight || String(highlight).trim() === '') {
      return { parts: [strText], isTextEmpty: false };
    }

    const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&');
    const safeHighlight = escapeRegExp(String(highlight));
    const regex = new RegExp(`(${safeHighlight})`, 'gi');

    return { parts: strText.split(regex), isTextEmpty: false };
  }, [text, highlight]);

  if (isTextEmpty && (!parts || parts.length === 0)) return null;

  return (
    <span className={className}>
      {parts.map((part, i) => {
        const isMatch =
          highlight && part && String(part).toLowerCase() === String(highlight).toLowerCase();

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
