'use client';

import Image from 'next/image';

export default function ContentBlockRenderer({ block, onImageClick }) {
  switch (block.type) {
    case 'text':
      return (
        <div
          className="prose prose-slate max-w-none text-slate-600 leading-relaxed mb-6"
          dangerouslySetInnerHTML={{ __html: block.content }}
        />
      );
    case 'image':
      return (
        <div className="mb-8 w-full relative group">
          <div
            className="rounded-lg border border-gray-200 bg-gray-50 overflow-hidden cursor-zoom-in hover:shadow-md transition-shadow"
            onClick={() => onImageClick && onImageClick({ src: block.src, alt: block.alt })}
          >
            <Image
              src={block.src}
              alt={block.alt || 'Tutorial Image'}
              width={0}
              height={0}
              sizes="100vw"
              className="w-full h-auto max-h-[500px] object-contain mx-auto transition-transform duration-300 group-hover:scale-[1.01]"
              style={{ width: '100%', height: 'auto' }}
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 flex items-center justify-center transition-colors pointer-events-none">
              <span className="opacity-0 group-hover:opacity-100 bg-black/60 text-white text-xs px-2 py-1 rounded shadow-sm backdrop-blur-sm transition-opacity">
                Click to Expand
              </span>
            </div>
          </div>
          {block.alt && (
            <p className="text-center text-xs text-gray-400 mt-2 italic">{block.alt}</p>
          )}
        </div>
      );
    case 'video':
      return (
        <div className="mb-8 aspect-video rounded-lg overflow-hidden bg-black shadow-md border border-gray-200">
          <iframe
            width="100%"
            height="100%"
            src={block.src}
            title="YouTube video player"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          ></iframe>
        </div>
      );
    default:
      return null;
  }
}
