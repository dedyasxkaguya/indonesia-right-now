'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';

export function AltZIPortal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeRef.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      previous?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return <div className="fixed inset-0 z-[96] flex items-center justify-center bg-[#0A0A0A]/95 p-5">
    <div aria-labelledby="secret-portal-title" aria-modal="true" className="relative w-full max-w-lg border border-[#D32F2F] bg-[#0A0A0A] p-8 text-[#E8E5E0]" role="dialog">
      <button aria-label="Tutup pintu rahasia" className="absolute right-3 top-3 inline-flex size-8 items-center justify-center text-[#E8E5E0]/60 transition-colors hover:text-[#D32F2F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D32F2F]" onClick={onClose} ref={closeRef} type="button"><X aria-hidden="true" className="size-4" /></button>
      <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-[#D32F2F]">akses tersembunyi</p>
      <h2 className="glitch-text mt-3 font-sans text-3xl font-bold" data-text="Pintu belakang" id="secret-portal-title">Pintu belakang</h2>
      <p className="mt-4 text-sm leading-7 text-[#E8E5E0]/75">Tidak ada tautan ke sini di navigasi. Pintu ini hanya terbuka lewat urutan tombol, bukan lewat menu.</p>
      <Link className="mt-6 inline-flex min-h-11 items-center bg-[#D32F2F] px-5 py-3 text-sm font-semibold text-[#E8E5E0] transition-colors hover:bg-[#FF4B2B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E8E5E0]" href="/__halaman-gelap" onClick={onClose}>Masuk ke halaman gelap</Link>
      <p className="mt-5 font-mono text-[10px] text-[#E8E5E0]/40">alt+z, lepas, lalu i</p>
    </div>
  </div>;
}
