// File: src/components/ContentBlockRenderer.js
'use client';

import Image from 'next/image';

export default function ContentBlockRenderer({ block, onImageClick }) {
  // 1. Handler untuk gambar Murni (Block Type: Image)
  if (block.type === 'image') {
    return (
      <div
        className="my-6 rounded-lg overflow-hidden border border-gray-200 cursor-zoom-in shadow-sm hover:shadow-md transition-all"
        onClick={() => onImageClick({ src: block.src, alt: block.alt })}
      >
        <div className="relative w-full h-64 sm:h-80 bg-gray-50">
          <Image
            src={block.src}
            alt={block.alt || 'Tutorial Image'}
            fill
            className="object-contain p-2"
          />
        </div>
        {block.alt && (
          <p className="p-2 text-center text-xs text-gray-500 bg-gray-50 border-t border-gray-100 italic">
            {block.alt}
          </p>
        )}
      </div>
    );
  }

  // 2. Handler untuk Teks HTML (Block Type: Text)
  if (block.type === 'text') {
    return (
      <div
        className="prose prose-slate max-w-none text-slate-600 leading-relaxed mb-4 
        [&_img]:cursor-zoom-in [&_img]:rounded-md [&_img]:border [&_img]:border-gray-200 [&_img]:shadow-sm hover:[&_img]:shadow-md [&_img]:transition-all"
        // --- LOGIC UTAMA DI SINI ---
        onClick={(e) => {
          // Cek apakah elemen yang diklik adalah tag IMG
          if (e.target.tagName === 'IMG') {
            // Panggil fungsi lightbox dengan data gambar yang diklik
            onImageClick({
              src: e.target.getAttribute('src'), // Ambil src asli
              alt: e.target.alt,
            });
          }
        }}
        dangerouslySetInnerHTML={{ __html: block.content }}
      />
    );
  }

  // 3. Handler untuk Video
  if (block.type === 'video') {
    return (
      <div className="aspect-video w-full my-6 rounded-lg overflow-hidden shadow-sm border border-gray-200">
        <iframe
          className="w-full h-full"
          src={block.src}
          title="Video tutorial"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  return null;
}
