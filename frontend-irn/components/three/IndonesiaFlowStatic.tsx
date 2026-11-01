'use client';

import React from 'react';

interface IndonesiaFlowStaticProps {
  className?: string;
  itemsKept?: number;
}

export function IndonesiaFlowStatic({ className = '', itemsKept = 24 }: IndonesiaFlowStaticProps) {
  return (
    <div className={`relative flex flex-col items-center justify-center p-6 bg-paper-50/50 border border-paper-300 rounded-card ${className}`}>
      <svg
        viewBox="0 0 800 300"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto max-h-[260px] opacity-80"
        aria-label="Siluet Statis Kepulauan Indonesia"
      >
        {/* Sumatra */}
        <ellipse cx="140" cy="130" rx="90" ry="25" transform="rotate(-30 140 130)" fill="#D32F2F" fillOpacity="0.25" stroke="#D32F2F" strokeWidth="1" strokeDasharray="3 3" />
        {/* Java */}
        <ellipse cx="280" cy="230" rx="95" ry="15" transform="rotate(2 280 230)" fill="#D32F2F" fillOpacity="0.3" stroke="#D32F2F" strokeWidth="1" />
        {/* Bali & Nusa Tenggara */}
        <ellipse cx="410" cy="240" rx="50" ry="12" fill="#D32F2F" fillOpacity="0.25" stroke="#D32F2F" strokeWidth="1" strokeDasharray="2 2" />
        {/* Kalimantan */}
        <ellipse cx="280" cy="115" rx="65" ry="55" fill="#D32F2F" fillOpacity="0.2" stroke="#D32F2F" strokeWidth="1" />
        {/* Sulawesi */}
        <path d="M 400 90 Q 425 110 405 140 Q 430 150 415 190 Q 395 160 400 90 Z" fill="#D32F2F" fillOpacity="0.25" stroke="#D32F2F" strokeWidth="1" />
        {/* Maluku */}
        <ellipse cx="490" cy="140" rx="30" ry="40" fill="#D32F2F" fillOpacity="0.2" stroke="#D32F2F" strokeWidth="1" strokeDasharray="3 3" />
        {/* Papua */}
        <ellipse cx="610" cy="160" rx="80" ry="40" transform="rotate(-10 610 160)" fill="#D32F2F" fillOpacity="0.25" stroke="#D32F2F" strokeWidth="1" />

        {/* Hotspot nodes */}
        <circle cx="240" cy="225" r="4" fill="#D32F2F" />
        <circle cx="240" cy="225" r="8" stroke="#D32F2F" strokeWidth="1" opacity="0.4" />
        <text x="248" y="222" fill="#212121" fontSize="10" fontFamily="IBM Plex Mono" opacity="0.8">Jakarta</text>

        <circle cx="330" cy="235" r="3.5" fill="#D32F2F" />
        <text x="338" y="240" fill="#212121" fontSize="9" fontFamily="IBM Plex Mono" opacity="0.8">Surabaya</text>

        <circle cx="110" cy="100" r="3" fill="#D32F2F" />
        <text x="118" y="98" fill="#212121" fontSize="9" fontFamily="IBM Plex Mono" opacity="0.8">Medan</text>

        <circle cx="415" cy="180" r="3" fill="#D32F2F" />
        <text x="423" y="185" fill="#212121" fontSize="9" fontFamily="IBM Plex Mono" opacity="0.8">Makassar</text>
      </svg>
      <div className="mt-3 flex items-center justify-between w-full px-2 text-xs font-mono text-ink-500">
        <span>Arus Berita Nasional</span>
        <span>{itemsKept} artikel terpantau</span>
      </div>
    </div>
  );
}
