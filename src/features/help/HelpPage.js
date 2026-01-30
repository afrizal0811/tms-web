// File: src/features/help/HelpPage.js
'use client';

import ContentBlockRenderer from '@/components/ContentBlockRenderer';
import ImageLightbox from '@/components/ImageLightbox';
import SearchBar from '@/components/SearchBar';
import { useLanguage } from '@/context/LanguageContext';
import { pdf } from '@react-pdf/renderer';
import { useMemo, useState } from 'react';
import { helpTopics } from './data';
import { PdfDocument } from './PdfDocument';

export default function HelpPage() {
  const { t, lang } = useLanguage();
  const isIndo = lang === 'id';

  const [activeCategory, setActiveCategory] = useState('planner');
  const [manualSelection, setManualSelection] = useState(null);
  const [zoomedImage, setZoomedImage] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedIds, setExpandedIds] = useState(new Set());

  // Filter Topik
  const filteredTopics = useMemo(() => {
    let topics = helpTopics.filter((topic) => topic.category === activeCategory);

    if (searchQuery.trim()) {
      const lowerQuery = searchQuery.toLowerCase();
      topics = topics.filter((topic) => {
        const isMainMatch = topic.title.toLowerCase().includes(lowerQuery);
        const isSubMatch = topic.subTopics?.some((sub) =>
          sub.title.toLowerCase().includes(lowerQuery)
        );
        return isMainMatch || isSubMatch;
      });
    }
    return topics;
  }, [activeCategory, searchQuery]);

  // Handler Search
  const handleSearchChange = (val) => {
    const query = val;
    setSearchQuery(query);

    if (query.trim()) {
      const lowerQuery = query.toLowerCase();
      const newExpanded = new Set();
      const currentCategoryTopics = helpTopics.filter((t) => t.category === activeCategory);

      currentCategoryTopics.forEach((topic) => {
        if (topic.subTopics) {
          const isSubMatch = topic.subTopics.some((sub) =>
            sub.title.toLowerCase().includes(lowerQuery)
          );
          if (isSubMatch || topic.title.toLowerCase().includes(lowerQuery)) {
            newExpanded.add(topic.id);
          }
        }
      });
      setExpandedIds(newExpanded);
    } else {
      setExpandedIds(new Set());
    }
  };

  const currentTopic = manualSelection || (filteredTopics.length > 0 ? filteredTopics[0] : null);

  const handleCategoryChange = (category) => {
    setActiveCategory(category);
    setManualSelection(null);
    setSearchQuery('');
    setExpandedIds(new Set());
  };

  const handleDownload = async (targetCategory) => {
    setIsGenerating(true);
    try {
      // Filter semua topik kategori tersebut (mengabaikan search filter user)
      const categoryTopics = helpTopics.filter((t) => t.category === targetCategory);

      if (categoryTopics.length === 0) {
        alert('Tidak ada data untuk dicetak.');
        return;
      }

      // Generate Blob
      const blob = await pdf(
        <PdfDocument category={targetCategory} topics={categoryTopics} />
      ).toBlob();

      // Buat URL dan Download Otomatis
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Manual_${targetCategory}_TMS.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url); // Bersihkan memori
    } catch (error) {
      console.error('PDF Generation Error:', error);
      alert('Gagal membuat PDF.');
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleExpand = (e, topicId) => {
    e.stopPropagation();
    const newSet = new Set(expandedIds);
    if (newSet.has(topicId)) {
      newSet.delete(topicId);
    } else {
      newSet.add(topicId);
    }
    setExpandedIds(newSet);
  };

  const handleParentClick = (topic) => {
    setManualSelection(topic);
    if (topic.subTopics && topic.subTopics.length > 0) {
      const newSet = new Set(expandedIds);
      if (newSet.has(topic.id)) {
        newSet.delete(topic.id);
      } else {
        newSet.add(topic.id);
      }
      setExpandedIds(newSet);
    }
  };

  const getThemeColor = () => {
    if (activeCategory === 'planner') return 'sky';
    if (activeCategory === 'driver') return 'emerald';
    return 'slate';
  };
  const theme = getThemeColor();

  const plannerDocUrl = process.env.NEXT_PUBLIC_HELP_URL_PLANNER || '#';
  const driverDocUrl = process.env.NEXT_PUBLIC_HELP_URL_DRIVER || '#';

  return (
    <>
      {zoomedImage && (
        <ImageLightbox
          key={zoomedImage.src}
          src={zoomedImage.src}
          alt={zoomedImage.alt}
          onClose={() => setZoomedImage(null)}
        />
      )}

      <div className="max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-6">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-b border-gray-200 pb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              {isIndo ? 'Pusat Tutorial' : 'Tutorial Center'}
            </h1>
            <p className="text-slate-500 mt-1">
              {isIndo ? 'Panduan lengkap penggunaan sistem.' : 'Complete user guide.'}
            </p>
          </div>
          <div className="flex bg-gray-100 p-1 rounded-lg">
            {['planner', 'driver', 'faq'].map((cat) => (
              <button
                key={cat}
                onClick={() => handleCategoryChange(cat)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all capitalize ${
                  activeCategory === cat
                    ? 'bg-white shadow text-slate-900'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8 min-h-[600px]">
          {/* --- SIDEBAR --- */}
          {/* Perubahan di sini: class shrink-0 saja, tidak perlu flex-col di level ini */}
          <aside className="w-full lg:w-1/4 shrink-0">
            {/* WRAPPER STICKY: Membungkus Search, TOC, dan Download Button sekaligus */}
            <div className="sticky top-24 flex flex-col gap-4">
              {/* 1. SEARCH BAR */}
              <div className="w-full">
                <SearchBar
                  value={searchQuery}
                  onChange={handleSearchChange}
                  placeholder={
                    isIndo ? `Cari di ${activeCategory}...` : `Search in ${activeCategory}...`
                  }
                  width="w-full"
                  className="shadow-sm"
                />
              </div>

              {/* 2. TABLE OF CONTENTS (Hapus class sticky dari sini karena parent sudah sticky) */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className={`px-4 py-3 border-b border-gray-100 bg-${theme}-50`}>
                  <h3 className={`font-semibold text-${theme}-800 text-sm uppercase`}>
                    {isIndo ? 'Daftar Isi' : 'Table of Contents'}
                  </h3>
                </div>

                <nav className="p-2 space-y-1 max-h-[60vh] overflow-y-auto">
                  {' '}
                  {/* Kurangi max-h agar tombol download muat */}
                  {filteredTopics.length > 0 ? (
                    filteredTopics.map((topic) => {
                      const isParentActive = currentTopic?.id === topic.id;
                      const hasSubTopics = topic.subTopics && topic.subTopics.length > 0;
                      const isExpanded = expandedIds.has(topic.id);

                      return (
                        <div key={topic.id} className="mb-1">
                          {/* PARENT */}
                          <div
                            className={`group flex items-center justify-between w-full px-3 py-2.5 rounded-md text-sm font-bold transition-all cursor-pointer ${
                              isParentActive
                                ? `bg-${theme}-50 text-${theme}-700`
                                : 'text-slate-700 hover:bg-gray-50'
                            }`}
                            onClick={() => handleParentClick(topic)}
                          >
                            <span className="flex-1 truncate">{topic.title}</span>
                            {hasSubTopics && (
                              <button
                                onClick={(e) => toggleExpand(e, topic.id)}
                                className={`p-1 rounded-full hover:bg-gray-200 transition-colors ml-2 focus:outline-none`}
                              >
                                <svg
                                  className={`w-4 h-4 transition-transform duration-200 text-slate-400 group-hover:text-slate-600 ${isExpanded ? 'rotate-90' : 'rotate-0'}`}
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 5l7 7-7 7"
                                  />
                                </svg>
                              </button>
                            )}
                          </div>

                          {/* CHILDREN */}
                          {hasSubTopics && isExpanded && (
                            <div className="mt-1 ml-3 pl-3 border-l-2 border-gray-100 space-y-1 animate-in slide-in-from-top-1 duration-200">
                              {topic.subTopics.map((sub) => {
                                const isSubActive = currentTopic?.id === sub.id;
                                return (
                                  <button
                                    key={sub.id}
                                    onClick={() => setManualSelection(sub)}
                                    className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-all truncate ${
                                      isSubActive
                                        ? `text-${theme}-600 bg-${theme}-50/50`
                                        : 'text-slate-500 hover:text-slate-800 hover:bg-gray-50'
                                    }`}
                                  >
                                    {sub.title}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-4 text-center text-sm text-gray-400">
                      {isIndo ? 'Tidak ditemukan.' : 'No topics found.'}
                    </div>
                  )}
                </nav>
              </div>

              {/* 3. DOWNLOAD BUTTONS (Sekarang ikut Sticky karena di dalam wrapper) */}
              <div className="space-y-2 pl-1">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Download PDF Manual
                </p>
                <button
                  onClick={() => handleDownload('planner')}
                  disabled={isGenerating}
                  className="w-full flex items-center justify-center gap-2 text-sm text-slate-600 hover:text-sky-600 border border-gray-200 bg-white px-3 py-2 rounded-lg hover:border-sky-300 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGenerating ? (
                    <span className="animate-spin h-4 w-4 border-2 border-gray-300 border-t-sky-600 rounded-full"></span>
                  ) : (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
                    </svg>
                  )}
                  {isGenerating ? 'Generating...' : 'Planner Guide'}
                </button>
                <button
                  onClick={() => handleDownload('driver')}
                  disabled={isGenerating}
                  className="w-full flex items-center justify-center gap-2 text-sm text-slate-600 hover:text-sky-600 border border-gray-200 bg-white px-3 py-2 rounded-lg hover:border-sky-300 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGenerating ? (
                    <span className="animate-spin h-4 w-4 border-2 border-gray-300 border-t-sky-600 rounded-full"></span>
                  ) : (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
                    </svg>
                  )}
                  {isGenerating ? 'Generating...' : 'Driver Guide'}
                </button>
              </div>
            </div>
          </aside>

          {/* --- MAIN CONTENT --- */}
          <main className="w-full lg:w-3/4">
            {currentTopic ? (
              <div
                key={currentTopic.id}
                className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 sm:p-10 animate-in fade-in slide-in-from-bottom-2 duration-300"
              >
                <div className="mb-6 pb-6 border-b border-gray-100">
                  <span
                    className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset uppercase mb-3 ${
                      activeCategory === 'planner'
                        ? 'bg-sky-50 text-sky-700 ring-sky-600/20'
                        : activeCategory === 'driver'
                          ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
                          : 'bg-gray-50 text-gray-600 ring-gray-500/10'
                    }`}
                  >
                    {activeCategory} Module
                  </span>
                  <h2 className="text-3xl font-bold text-slate-900">{currentTopic.title}</h2>
                </div>

                <div className="content-area">
                  {currentTopic.blocks && currentTopic.blocks.length > 0 ? (
                    currentTopic.blocks.map((block, idx) => (
                      <ContentBlockRenderer key={idx} block={block} onImageClick={setZoomedImage} />
                    ))
                  ) : (
                    <div
                      className="prose prose-slate max-w-none text-slate-600 leading-relaxed"
                      dangerouslySetInnerHTML={{
                        __html: currentTopic.content || '<p>Konten sedang diperbarui.</p>',
                      }}
                    />
                  )}
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
                <svg
                  className="w-12 h-12 mb-2 opacity-50"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                  />
                </svg>
                <p>Pilih topik di sebelah kiri untuk melihat panduan.</p>
              </div>
            )}
          </main>
        </div>
      </div>
    </>
  );
}
