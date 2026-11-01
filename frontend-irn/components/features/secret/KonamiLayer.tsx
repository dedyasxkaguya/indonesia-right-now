'use client';

import { X } from 'lucide-react';

export function KonamiLayer({ active, onClose }: { active: boolean; onClose: () => void }) {
  if (!active) return null;
  return <div aria-live="polite" className="konami-layer pointer-events-none fixed inset-0 z-[95] flex items-center justify-center" role="status">
    <p className="sr-only">Kode Konami diterima. Efek glitch aktif selama beberapa detik.</p>
    <div aria-hidden="true" className="absolute inset-0 bg-[#0A0A0A]/70">
      <span className="konami-band absolute inset-x-0 top-[18%] h-12 bg-[#D32F2F]/30" />
      <span className="konami-band absolute inset-x-0 top-[46%] h-24 bg-[#FF4B2B]/20" />
      <span className="konami-band absolute inset-x-0 top-[72%] h-8 bg-[#00E5FF]/20" />
    </div>
    <div className="relative mx-5 w-full max-w-md border border-[#D32F2F] bg-[#0A0A0A] p-7 text-center text-[#E8E5E0]">
      <button aria-label="Tutup efek glitch" className="pointer-events-auto absolute right-2 top-2 inline-flex size-8 items-center justify-center text-[#E8E5E0]/60 transition-colors hover:text-[#D32F2F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D32F2F]" onClick={onClose} type="button"><X aria-hidden="true" className="size-4" /></button>
      <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-[#D32F2F]">kode lama diterima</p>
      <p className="glitch-text mt-4 font-sans text-3xl font-bold" data-text="SINYAL RETAK">SINYAL RETAK</p>
      <p className="mt-4 font-mono text-[11px] text-[#E8E5E0]/60">↑ ↑ ↓ ↓ ← → ← → B A</p>
    </div>
  </div>;
}
