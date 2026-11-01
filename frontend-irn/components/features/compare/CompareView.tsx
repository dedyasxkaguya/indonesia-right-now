'use client';

import { useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import { Copy, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { Drawer as VaulDrawer } from 'vaul';
import { useDrawer } from '@/components/layout/DrawerProvider';
import { ExplainTrigger } from '@/components/features/explain/ExplainTrigger';
import { useIsMobile } from '@/hooks/useIsMobile';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { StateCard } from '@/components/ui/StateCard';
import { fetchNewsClient } from '@/lib/api/client';
import { computeKeywordGraph, computeLatency } from '@/lib/transformers';
import { formatNumber, formatPercent } from '@/lib/utils/format';
import type { NewsData, NewsResponse } from '@/lib/types/api';

type PublisherOption = { domain: string; name: string };

function PublisherFields({ options, a, b, setA, setB, firstSelectRef }: {
  options: PublisherOption[];
  a: string;
  b: string;
  setA: (value: string) => void;
  setB: (value: string) => void;
  firstSelectRef?: React.RefObject<HTMLSelectElement>;
}) {
  return <>
    <label className="block"><span className="mb-2 block font-mono text-[10px] uppercase tracking-[0.12em] text-ink-500">Publisher A</span><select ref={firstSelectRef} className="min-h-11 w-full border border-paper-300 bg-paper-100 px-3 text-sm text-ink-900" onChange={(event) => setA(event.target.value)} value={a}><option value="">Pilih publisher</option>{options.map((option) => <option key={option.domain} value={option.domain}>{option.name} · {option.domain}</option>)}</select></label>
    <label className="block"><span className="mb-2 block font-mono text-[10px] uppercase tracking-[0.12em] text-ink-500">Publisher B</span><select className="min-h-11 w-full border border-paper-300 bg-paper-100 px-3 text-sm text-ink-900" onChange={(event) => setB(event.target.value)} value={b}><option value="">Pilih publisher</option>{options.map((option) => <option key={option.domain} value={option.domain}>{option.name} · {option.domain}</option>)}</select></label>
  </>;
}

function PublisherPicker({ options, initialA, initialB }: { options: PublisherOption[]; initialA: string; initialB: string }) {
  const [a, setA] = useState(initialA);
  const [b, setB] = useState(initialB);
  const [open, setOpen] = useState(false);
  const firstSelectRef = useRef<HTMLSelectElement>(null);
  const router = useRouter();
  function compare() {
    if (!a || !b || a === b) return;
    router.push(`/bandingkan?a=${encodeURIComponent(a)}&b=${encodeURIComponent(b)}`);
    setOpen(false);
  }
  return <VaulDrawer.Root direction="bottom" modal onOpenChange={setOpen} open={open}>
    <div className="mt-6">
      <section className="hidden grid-cols-1 gap-4 border-y border-paper-300 bg-paper-50 p-5 sm:grid sm:grid-cols-[1fr_auto_1fr_auto] sm:items-end">
        <PublisherFields a={a} b={b} options={options} setA={setA} setB={setB} />
        <Button disabled={!a || !b || a === b} onClick={compare}>Bandingkan</Button>
      </section>
      <div className="sm:hidden"><VaulDrawer.Trigger className="inline-flex min-h-11 items-center justify-center gap-2 rounded-btn bg-brand-red px-5 py-3 font-sans text-sm font-semibold text-paper-50 transition-colors duration-200 ease-out hover:bg-brand-redDeep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red focus-visible:ring-offset-2 focus-visible:ring-offset-paper-100">Pilih publisher</VaulDrawer.Trigger></div>
    </div>
      <VaulDrawer.Portal>
        <VaulDrawer.Overlay className="fixed inset-0 z-[70] bg-ink-900/35" />
        <VaulDrawer.Content className="fixed inset-x-0 bottom-0 z-[71] max-h-[80vh] overflow-y-auto rounded-t-3xl border-t border-paper-300 bg-paper-50 p-5 pb-8 shadow-xl focus:outline-none" onOpenAutoFocus={(event) => {
          event.preventDefault();
          firstSelectRef.current?.focus();
        }}>
          <div aria-hidden="true" className="mx-auto mb-4 h-1.5 w-12 rounded-pill bg-paper-300" />
          <VaulDrawer.Title className="font-sans text-h3 text-ink-900">Pilih publisher</VaulDrawer.Title>
          <VaulDrawer.Description className="mt-1 text-xs text-ink-500">Pilih dua publisher aktif untuk dibandingkan.</VaulDrawer.Description>
          <div className="mt-5 grid gap-4"><PublisherFields a={a} b={b} firstSelectRef={firstSelectRef} options={options} setA={setA} setB={setB} /></div>
          <Button className="mt-5 w-full" disabled={!a || !b || a === b} onClick={compare}>Bandingkan</Button>
        </VaulDrawer.Content>
      </VaulDrawer.Portal>
  </VaulDrawer.Root>;
}

function domainSources(data: NewsData, domain: string) {
  return data.sources.filter((source) => source.url.includes(domain) || source.publisher === domain);
}

function topCategories(items: NewsData['items']): string[] {
  const counts = new Map<string, number>();
  for (const item of items) for (const category of new Set(item.categories)) counts.set(category, (counts.get(category) ?? 0) + 1);
  return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 3).map(([category]) => category);
}

function MetricRow({ label, left, right, leftLabel, rightLabel, leftWinner = false, rightWinner = false, diff, metricId }: {
  label: string;
  left: React.ReactNode;
  right: React.ReactNode;
  leftLabel: string;
  rightLabel: string;
  leftWinner?: boolean;
  rightWinner?: boolean;
  diff?: string;
  metricId?: string;
}) {
  return <div className="grid grid-cols-1 gap-2 border-t border-paper-300 py-4 md:grid-cols-12 md:items-start md:gap-5">
    <div className={`order-2 min-w-0 text-sm md:order-none md:col-span-5 md:col-start-1 md:row-start-1 md:text-right ${leftWinner ? 'font-semibold text-data-success' : 'text-ink-700'}`}>
      <span className="mb-1 block font-mono text-[10px] text-ink-500 md:hidden">{leftLabel}</span>{left}
    </div>
    <div className="order-1 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-500 md:order-none md:col-span-2 md:col-start-6 md:row-start-1 md:text-center"><span className="inline-flex items-center gap-1">{label}{metricId ? <ExplainTrigger metricId={metricId} /> : null}</span>{diff ? <span className="mt-1 block normal-case tracking-normal text-ink-400">{diff}</span> : null}</div>
    <div className={`order-3 min-w-0 text-sm md:order-none md:col-span-5 md:col-start-8 md:row-start-1 md:text-left ${rightWinner ? 'font-semibold text-data-success' : 'text-ink-700'}`}>
      <span className="mb-1 block font-mono text-[10px] text-ink-500 md:hidden">{rightLabel}</span>{right}
    </div>
  </div>;
}

export function CompareView() {
  const params = useSearchParams() ?? new URLSearchParams();
  const domainA = params.get('a') ?? '';
  const domainB = params.get('b') ?? '';
  const { data: response, error, isLoading } = useSWR<NewsResponse, Error>('/api/news?since=24h&max_items=200', fetchNewsClient, { revalidateOnFocus: false, shouldRetryOnError: false });
  const data = response?.data ?? null;
  const { openReader } = useDrawer();
  const isMobile = useIsMobile();
  const router = useRouter();
  const publishers = useMemo(() => {
    const names = new Map<string, string>();
    for (const item of data?.items ?? []) names.set(item.publisher_domain, item.publisher);
    return [...names].map(([domain, name]) => ({ domain, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [data]);

  async function share() {
    try { await navigator.clipboard.writeText(window.location.href); toast.success('Tautan perbandingan disalin.'); } catch { toast.error('Tautan tidak dapat disalin.'); }
  }

  if (isLoading && !data) return <div className="mx-auto max-w-7xl px-5 py-16 lg:px-8"><StateCard variant="loading" title="Memuat perbandingan" description="Mengambil daftar publisher aktif." /></div>;
  if (error || !data) return <div className="mx-auto max-w-7xl px-5 py-16 lg:px-8"><StateCard variant="error" title="Data perbandingan tidak dapat dimuat" description={error?.message ?? 'Layanan berita belum tersedia.'} /></div>;

  const available = new Set(publishers.map((publisher) => publisher.domain));
  const validA = Boolean(domainA && available.has(domainA));
  const validB = Boolean(domainB && available.has(domainB));
  if (!validA || !validB || domainA === domainB) {
    const missing = domainA && !validA ? domainA : domainB && !validB ? domainB : '';
    return <div className="mx-auto max-w-7xl px-5 py-12 lg:px-8 lg:py-16">
      <header className="border-b border-paper-300 pb-7"><p className="font-mono text-eyebrow uppercase text-brand-red">Perbandingan · 12</p><h1 className="mt-3 font-sans text-h1 text-ink-900">Bandingkan publisher</h1></header>
      <StateCard className="mt-8" variant="empty" title={missing ? `Publisher ${missing} tidak aktif dalam 24 jam terakhir.` : 'Pilih dua publisher aktif untuk dibandingkan.'} description="Daftar mengikuti domain publisher pada feed terbaru." />
      <PublisherPicker initialA={validA ? domainA : ''} initialB={validB ? domainB : ''} options={publishers} />
    </div>;
  }

  const itemsA = data.items.filter((item) => item.publisher_domain === domainA);
  const itemsB = data.items.filter((item) => item.publisher_domain === domainB);
  const nameA = publishers.find((publisher) => publisher.domain === domainA)?.name ?? domainA;
  const nameB = publishers.find((publisher) => publisher.domain === domainB)?.name ?? domainB;
  const latencyA = computeLatency(itemsA);
  const latencyB = computeLatency(itemsB);
  const sourcesA = domainSources(data, domainA);
  const sourcesB = domainSources(data, domainB);
  const healthScore = (sources: NewsData['sources']) => sources.length ? sources.filter((source) => source.status === 'ok').length / sources.length : -1;
  const keywordsA = computeKeywordGraph(itemsA, { topN: 3 }).nodes.slice(0, 3).map((node) => node.id);
  const keywordsB = computeKeywordGraph(itemsB, { topN: 3 }).nodes.slice(0, 3).map((node) => node.id);
  const categoriesA = topCategories(itemsA);
  const categoriesB = topCategories(itemsB);
  const latestA = [...itemsA].sort((a, b) => Date.parse(b.published_at) - Date.parse(a.published_at)).slice(0, 3);
  const latestB = [...itemsB].sort((a, b) => Date.parse(b.published_at) - Date.parse(a.published_at)).slice(0, 3);
  const difference = itemsA.length + itemsB.length === 0 ? '0%' : itemsB.length === 0 ? '—' : formatPercent(((itemsA.length - itemsB.length) / itemsB.length) * 100);
  const status = (sources: NewsData['sources']) => sources.length === 0 ? <Badge>Tak diketahui</Badge> : sources.every((source) => source.status === 'ok') ? <Badge variant="success">Sehat</Badge> : <span className="inline-flex flex-wrap gap-2"><Badge variant="danger">Gagal</Badge>{sources.filter((source) => source.error).map((source) => <code className="font-mono text-[10px] text-data-danger" key={source.url}>{source.error?.code}</code>)}</span>;
  const keywordList = (words: string[]) => words.length ? <span className="font-mono text-xs">{words.join(' · ')}</span> : 'Belum tersedia';
  const categoryList = (categories: string[]) => categories.length ? <span className="flex flex-wrap gap-1">{categories.map((category) => <Badge key={category}>{category}</Badge>)}</span> : 'Belum tersedia';
  const headlineList = (items: NewsData['items']) => items.length ? <ol className="space-y-2">{items.map((item) => <li key={item.id}><button className="text-left text-xs leading-5 underline decoration-transparent underline-offset-2 hover:text-brand-red hover:decoration-brand-red" onClick={() => {
    if (isMobile) router.push(`/baca?url=${encodeURIComponent(item.url)}`);
    else openReader(item.url, item);
  }} type="button">{item.title}</button></li>)}</ol> : 'Belum tersedia';

  return <div className="mx-auto max-w-7xl px-5 py-12 lg:px-8 lg:py-16">
    <header className="mb-8 grid grid-cols-1 items-baseline gap-4 border-b border-paper-300 pb-7 sm:grid-cols-12">
      <div className="min-w-0 sm:col-span-5"><h1 className="font-sans text-h2 text-ink-900">{nameA}</h1><p className="mt-1 font-mono text-xs text-ink-500">{domainA}</p></div>
      <h2 className="font-sans text-h3 text-ink-900 sm:col-span-2 sm:text-center">Bandingkan</h2>
      <div className="flex min-w-0 items-baseline justify-between gap-3 sm:col-span-5 sm:justify-end"><div className="sm:text-right"><h1 className="font-sans text-h2 text-ink-900">{nameB}</h1><p className="mt-1 font-mono text-xs text-ink-500">{domainB}</p></div><Button aria-label="Salin tautan perbandingan" onClick={() => void share()} variant="ghost"><Copy aria-hidden="true" className="size-4" /></Button></div>
    </header>
    <div className="border-b border-paper-300">
      <MetricRow label="Total artikel (24h)" leftLabel={nameA} rightLabel={nameB} leftWinner={itemsA.length > itemsB.length} rightWinner={itemsB.length > itemsA.length} metricId="items-kept" left={formatNumber(itemsA.length)} right={formatNumber(itemsB.length)} diff={`${itemsA.length > itemsB.length ? '▲' : itemsA.length < itemsB.length ? '▼' : '—'} Selisih A vs B: ${difference}`} />
      <MetricRow label="Median latensi" leftLabel={nameA} rightLabel={nameB} leftWinner={!latencyA.insufficient && !latencyB.insufficient && latencyA.median < latencyB.median} rightWinner={!latencyA.insufficient && !latencyB.insufficient && latencyB.median < latencyA.median} metricId="median-latency" left={latencyA.insufficient ? '—' : `${latencyA.median.toLocaleString('id-ID', { maximumFractionDigits: 1 })} menit`} right={latencyB.insufficient ? '—' : `${latencyB.median.toLocaleString('id-ID', { maximumFractionDigits: 1 })} menit`} />
      <MetricRow label="P95 latensi" leftLabel={nameA} rightLabel={nameB} leftWinner={!latencyA.insufficient && !latencyB.insufficient && latencyA.p95 < latencyB.p95} rightWinner={!latencyA.insufficient && !latencyB.insufficient && latencyB.p95 < latencyA.p95} metricId="median-latency" left={latencyA.insufficient ? '—' : `${latencyA.p95.toLocaleString('id-ID', { maximumFractionDigits: 1 })} menit`} right={latencyB.insufficient ? '—' : `${latencyB.p95.toLocaleString('id-ID', { maximumFractionDigits: 1 })} menit`} />
      <MetricRow label="Status sumber" leftLabel={nameA} rightLabel={nameB} leftWinner={healthScore(sourcesA) > healthScore(sourcesB)} rightWinner={healthScore(sourcesB) > healthScore(sourcesA)} metricId="source-health" left={status(sourcesA)} right={status(sourcesB)} />
      <MetricRow label="Kategori teratas" leftLabel={nameA} rightLabel={nameB} metricId="category-velocity" left={categoryList(categoriesA)} right={categoryList(categoriesB)} />
      <MetricRow label="Kata kunci teratas" leftLabel={nameA} rightLabel={nameB} metricId="keyword-graph" left={keywordList(keywordsA)} right={keywordList(keywordsB)} />
      <MetricRow label="3 judul terbaru" leftLabel={nameA} rightLabel={nameB} left={headlineList(latestA)} right={headlineList(latestB)} />
    </div>
    <p className="mt-4 text-right font-mono text-[10px] text-ink-400"><ExternalLink aria-hidden="true" className="mr-1 inline size-3" />Snapshot {data.date} · {data.date_tz}</p>
  </div>;
}
