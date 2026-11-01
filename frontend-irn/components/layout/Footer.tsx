'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getModeFromPath } from '@/lib/mode';

export function Footer() {
  const mode = getModeFromPath(usePathname() ?? '/');
  if (mode === 'igs') {
    return (
      <footer className="border-t border-paper-300 bg-paper-100">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-5 py-10 md:grid-cols-12 lg:px-8">
          <div className="md:col-span-5">
            <Link className="font-sans text-sm font-bold text-ink-900" href="/gov">indonesia-right-now <span className="font-mono text-gov-primary">— Gov Stats</span></Link>
            <p className="mt-3 max-w-sm text-caption text-ink-500">Angka mengikuti cakupan berkas sumber yang tersedia; wilayah atau tahun tanpa baris tidak dianggap bernilai nol.</p>
          </div>
          <nav aria-label="Navigasi Gov Stats" className="flex flex-col gap-2 text-caption text-ink-700 md:col-span-3">
            <Link href="/gov/dashboard">Dashboard</Link>
            <Link href="/gov/analytics">Analitik</Link>
            <Link href="/gov/pencarian">Pencarian wilayah dan metrik</Link>
          </nav>
          <div className="font-mono text-[11px] leading-5 text-ink-500 md:col-span-4 md:text-right"><p>Data statis · 2020–2025</p><p>Dataset dan kelengkapan tercantum pada halaman analitik.</p></div>
        </div>
      </footer>
    );
  }
  return (
    <footer className="border-t border-paper-300 bg-paper-100">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-5 py-10 md:grid-cols-12 lg:px-8">
        <div className="md:col-span-5">
          <Link className="font-sans text-sm font-bold text-ink-900" href="/">indonesia-<span className="text-brand-red">right</span>-now</Link>
          <p className="mt-3 max-w-sm text-caption text-ink-500">Potret berita dari sumber yang tersedia, dengan jejak data yang dapat ditelusuri.</p>
        </div>
        <nav aria-label="Navigasi footer" className="flex flex-col gap-2 text-caption text-ink-700 md:col-span-3">
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/analitik">Analitik</Link>
          <Link href="/analisis-url">Analisis URL</Link>
        </nav>
        <div className="font-mono text-[11px] leading-5 text-ink-500 md:col-span-4 md:text-right">
          <p>API · /api/news</p>
          <p>Status bergantung pada layanan backend.</p>
          <p>indonesia-right-now</p>
        </div>
      </div>
    </footer>
  );
}
