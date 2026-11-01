'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { ArrowUpRight } from 'lucide-react';
import { GrungeShell } from '@/components/features/secret/GrungeShell';
import { fetchNewsClient } from '@/lib/api/client';
import {
  computeCrossSourceEcho,
  computeDateConfidenceDistribution,
  computeDedupRate,
  computeLatency,
  computeSourceHealth,
  computeStoryClusters,
  computeSummaryCompleteness,
  computeTemporalHotspots,
} from '@/lib/transformers';
import { SECRET_TRUTH } from '@/lib/secret/routes';
import { formatMinutes, formatNumber, formatPercent } from '@/lib/utils/format';
import type { NewsResponse } from '@/lib/types/api';

function Cell({ label, value, note }: { label: string; value: string; note: string }) {
  return <div className="border border-[#E8E5E0]/15 p-4">
    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#E8E5E0]/50">{label}</p>
    <p className="mt-2 font-mono text-2xl font-semibold text-[#E8E5E0]">{value}</p>
    <p className="mt-1 font-mono text-[10px] leading-4 text-[#E8E5E0]/40">{note}</p>
  </div>;
}

function Bar({ label, pct, tone }: { label: string; pct: number; tone: 'red' | 'light' | 'faint' }) {
  const width = Math.max(0, Math.min(100, pct));
  const color = tone === 'red' ? 'bg-[#D32F2F]' : tone === 'light' ? 'bg-[#E8E5E0]' : 'bg-[#E8E5E0]/30';
  return <div>
    <div className="flex items-center justify-between font-mono text-[10px] text-[#E8E5E0]/60"><span>{label}</span><span>{formatPercent(pct)}</span></div>
    <div aria-hidden="true" className="mt-1 h-1.5 bg-[#E8E5E0]/10"><div className={`h-full ${color}`} style={{ width: `${width}%` }} /></div>
  </div>;
}

export function SecretSafeView({ calm, path }: { calm: boolean; path: string }) {
  const { data: response, error } = useSWR<NewsResponse, Error>('/api/news?since=24h&max_items=200', fetchNewsClient, { revalidateOnFocus: false, shouldRetryOnError: false });
  const data = response?.data ?? null;

  const metrics = (() => {
    if (!data) return null;
    const health = computeSourceHealth(data);
    const latency = computeLatency(data.items);
    const confidence = computeDateConfidenceDistribution(data.items);
    const summaries = computeSummaryCompleteness(data.items);
    const echo = computeCrossSourceEcho(data.items);
    const clusters = computeStoryClusters(data.items);
    const dedup = computeDedupRate(data.stats);
    const hotspots = computeTemporalHotspots(data.items);
    const publisherCount = new Set(data.items.map((item) => item.publisher)).size;
    const categoryCount = new Set(data.items.flatMap((item) => item.categories)).size;
    const realClusters = clusters.clusters.filter((cluster) => cluster.size > 1);
    return {
      health,
      latency,
      confidence,
      summaries,
      echo,
      dedup,
      hotspots,
      publisherCount,
      categoryCount,
      realClusters,
    };
  })();

  return <GrungeShell calm={calm} eyebrow="zona tersembunyi" mode="safe" path={path} title="Halaman Gelap">
    <p className="max-w-2xl text-sm leading-7 text-[#E8E5E0]/70">Arsip ini hanya menyimpan bentuk, bukan nama. Yang tersisa di sini adalah jumlah, jeda, dan pola — potret agregat dari aliran berita yang sama, tanpa satu pun individu yang disebut.</p>

    {error ? <section className="mt-8 border border-[#D32F2F]/60 p-5"><p className="font-mono text-[11px] text-[#D32F2F]">Arsip tidak dapat dibaca.</p><p className="mt-2 text-xs leading-6 text-[#E8E5E0]/50">{error.message}</p></section> : null}

    {!data && !error ? <p className="mt-10 font-mono text-[11px] tracking-[0.2em] text-[#E8E5E0]/40">MEMBACA ARSIP...</p> : null}

    {data && metrics ? <>
      <section aria-label="Ringkasan agregat" className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Cell label="Artikel dikurasi" note="pada snapshot ini" value={formatNumber(data.stats.items_kept)} />
        <Cell label="Sumber sehat" note={`${formatNumber(data.stats.sources_failed)} gagal`} value={`${formatNumber(data.stats.sources_ok)}/${formatNumber(data.stats.sources_total)}`} />
        <Cell label="Duplikat dibuang" note={`dari ${formatNumber(metrics.dedup.fetched)} item mentah`} value={formatNumber(metrics.dedup.deduped)} />
        <Cell label="Median latensi" note="publish ke fetch" value={metrics.latency.insufficient ? '—' : formatMinutes(metrics.latency.median)} />
        <Cell label="Tanggal presisi" note="kinerja tanggal terbit" value={formatPercent(metrics.confidence.pctExact)} />
        <Cell label="Gema lintas sumber" note={`${formatNumber(metrics.echo.totalEchoes)} artikel dalam gema`} value={formatNumber(metrics.echo.echoes.length)} />
        <Cell label="Klaster cerita" note={`terbesar ${formatNumber(Math.max(0, ...metrics.realClusters.map((cluster) => cluster.size)))} artikel`} value={formatNumber(metrics.realClusters.length)} />
        <Cell label="Publisher / kategori" note="entitas unik pada snapshot" value={`${formatNumber(metrics.publisherCount)} / ${formatNumber(metrics.categoryCount)}`} />
      </section>

      <section className="mt-10 border-t border-[#E8E5E0]/15 pt-6">
        <h2 className="font-sans text-lg font-semibold text-[#E8E5E0]">Jejak yang tertinggal</h2>
        <p className="mt-2 max-w-2xl text-xs leading-6 text-[#E8E5E0]/50">Tidak ada judul, tidak ada nama, tidak ada tautan keluar. Hanya distribusi.</p>
        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="space-y-3">
            <Bar label="tanggal exact" pct={metrics.confidence.pctExact} tone="red" />
            <Bar label="tanggal approx" pct={metrics.confidence.pctApprox} tone="light" />
            <Bar label="tanggal unknown" pct={metrics.confidence.pctUnknown} tone="faint" />
          </div>
          <dl className="divide-y divide-[#E8E5E0]/10 border-y border-[#E8E5E0]/15 font-mono text-[11px]">
            <div className="flex items-center justify-between gap-4 py-2.5"><dt className="text-[#E8E5E0]/50">jam terpadat (WIB)</dt><dd className="text-[#E8E5E0]">{String(metrics.hotspots.top3[0] ?? 0).padStart(2, '0')}:00 · {formatNumber(metrics.hotspots.hours[metrics.hotspots.top3[0] ?? 0]?.count ?? 0)}</dd></div>
            <div className="flex items-center justify-between gap-4 py-2.5"><dt className="text-[#E8E5E0]/50">ringkasan tersedia</dt><dd className="text-[#E8E5E0]">{formatPercent(metrics.summaries.pct)}</dd></div>
            <div className="flex items-center justify-between gap-4 py-2.5"><dt className="text-[#E8E5E0]/50">kesehatan sumber</dt><dd className="text-[#E8E5E0]">{formatPercent(metrics.health.healthPct)}</dd></div>
            <div className="flex items-center justify-between gap-4 py-2.5"><dt className="text-[#E8E5E0]/50">klaster nyata</dt><dd className="text-[#E8E5E0]">{formatNumber(metrics.realClusters.length)}</dd></div>
          </dl>
        </div>
      </section>

      <section className="mt-10 border-t border-[#E8E5E0]/15 pt-6">
        <p className="max-w-2xl text-sm leading-7 text-[#E8E5E0]/60">Angka tidak menunjuk siapa pun. Ia hanya menunjukkan bahwa aliran berita berulang, melambat, dan kadang kehilangan tanggalnya. Nama-nama ada di halaman berikutnya, dan hanya karena sumbernya menuliskannya lebih dulu.</p>
        <Link className="mt-5 inline-flex min-h-11 items-center gap-2 border border-[#D32F2F] px-5 py-3 font-mono text-[11px] uppercase tracking-[0.18em] text-[#D32F2F] transition-colors hover:bg-[#D32F2F] hover:text-[#E8E5E0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E8E5E0]" href={SECRET_TRUTH}>Lihat kasus nyata <ArrowUpRight aria-hidden="true" className="size-3.5" /></Link>
      </section>
    </> : null}
  </GrungeShell>;
}
