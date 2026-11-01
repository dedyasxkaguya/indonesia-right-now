import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { QuickAnalysis } from '@/components/home/QuickAnalysis';
import { LiveTicker } from '@/components/features/ticker/LiveTicker';
import { LandingNewsGrid } from '@/components/features/frontpage/LandingNewsGrid';
import { LedgerRow } from '@/components/ui/LedgerRow';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { StateCard } from '@/components/ui/StateCard';
import { postNews } from '@/lib/api/server';
import type { NewsData } from '@/lib/types/api';
import dynamic from 'next/dynamic';

const IndonesiaFlowScene = dynamic(
  () => import('@/components/three/IndonesiaFlowScene').then((m) => ({ default: m.IndonesiaFlowScene })),
  { ssr: false, loading: () => <div className="w-full min-h-[300px] bg-paper-100/50 rounded-card animate-pulse" /> }
);

export const revalidate = 60;

async function loadNews(): Promise<NewsData | null> {
  try {
    const response = await postNews({ max_items: 100 });
    return response.ok ? response.data : null;
  } catch {
    return null;
  }
}

export default async function HomePage() {
  const data = await loadNews();

  return (
    <>
      {data ? <LiveTicker items={data.items} /> : null}
      <section className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-8 px-4 py-10 sm:gap-12 sm:px-5 sm:py-16 lg:min-h-[calc(100svh-4rem)] lg:grid-cols-12 lg:gap-10 lg:px-8 lg:py-24" id="beranda">
        <div className="lg:col-span-7">
          <p className="mb-6 font-mono text-eyebrow uppercase text-ink-500">Live · {data?.date_tz ?? 'Asia/Jakarta'} · Snapshot feed</p>
          <h1 className="max-w-3xl font-sans text-4xl font-bold leading-[1.04] text-ink-900 sm:text-6xl lg:text-display">Berita Indonesia,<br />dalam satu pandangan <span className="text-brand-red">jernih.</span></h1>
          <p className="mt-6 max-w-xl text-body text-ink-500">indonesia-right-now mengumpulkan dan membaca pola dari feed berita yang tersedia, dengan sumber dan batas data yang terlihat.</p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link className="inline-flex min-h-11 items-center gap-2 rounded-btn bg-brand-red px-5 py-3 text-sm font-semibold text-paper-50 transition duration-200 hover:-translate-y-0.5 hover:bg-brand-redDeep hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red focus-visible:ring-offset-2 focus-visible:ring-offset-paper-100" href="/dashboard">Lihat Dashboard <ArrowUpRight aria-hidden="true" className="size-4" /></Link>
            <Link className="inline-flex min-h-11 items-center gap-2 px-3 font-sans text-sm font-semibold text-brand-red underline decoration-paper-300 underline-offset-4 hover:decoration-brand-red" href="/analisis-url">Analisis URL <ArrowUpRight aria-hidden="true" className="size-4" /></Link>
          </div>
          {!data ? <div className="mt-10"><StateCard variant="error" title="Feed belum terjangkau" description="Angka dan visualisasi akan muncul setelah layanan backend tersedia. Tidak ada data contoh yang ditampilkan." /></div> : null}
        </div>
        <div className="lg:col-span-5 lg:pl-6">
          <IndonesiaFlowScene itemsKept={data?.stats?.items_kept ?? 0} />
        </div>
      </section>

      {data ? <LandingNewsGrid items={data.items} /> : null}

      <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-28" id="pilar">
        <SectionHeader index="01" title="Tiga jalur membaca berita" />
        <LedgerRow index="01" title="Kurasi yang dapat ditelusuri" description="Lihat aliran artikel dan kesehatan sumber dari respons feed yang tersedia." href="/dashboard" />
        <LedgerRow index="02" title="Analisis URL" description="Kirim URL publik ke layanan analisis dan telaah hasil ekstraksi beserta status pipeline." href="/analisis-url" />
        <LedgerRow index="03" title="Sinyal, bukan klaim" description="Bandingkan publisher, kategori, dan latensi; setiap angka mengikuti data sumbernya." href="/analitik" />
      </section>

      <section className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-5 py-20 lg:grid-cols-12 lg:px-8 lg:py-28" id="analisis-url">
        <div className="lg:col-span-5"><SectionHeader index="03" title="Coba analisis URL" /><p className="max-w-md text-body text-ink-500">Periksa konten dari URL publik melalui backend. Target privat dan lokal akan ditolak oleh proteksi SSRF.</p></div>
        <QuickAnalysis />
      </section>
      <section className="border-t border-paper-300 px-5 py-20 text-center lg:py-28" id="penutup">
        <h2 className="font-sans text-3xl font-semibold text-ink-900 sm:text-4xl">Bukti, bukan sekadar klik.</h2>
        <Link className="mt-6 inline-flex items-center gap-2 font-sans text-sm font-semibold text-brand-red underline decoration-paper-300 underline-offset-4 hover:decoration-brand-red" href="/dashboard">Mulai dari Dashboard <ArrowUpRight aria-hidden="true" className="size-4" /></Link>
      </section>
    </>
  );
}
