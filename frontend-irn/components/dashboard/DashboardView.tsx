'use client';

import useSWR from 'swr';
import Fuse from 'fuse.js';
import Link from 'next/link';
import { useMemo } from 'react';
import { ExternalLink, RotateCcw, Sparkles } from 'lucide-react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BookmarkButton } from '@/components/features/BookmarkButton';
import { EditorsPicksStrip } from '@/components/features/editors-picks/EditorsPicksStrip';
import { ExplainTrigger } from '@/components/features/explain/ExplainTrigger';
import { CoverageMatrixPanel } from '@/components/features/heatmap/CoverageMatrix';
import { useDrawer } from '@/components/layout/DrawerProvider';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { StateCard } from '@/components/ui/StateCard';
import { fetchNewsClient } from '@/lib/api/client';
import { useFilterState } from '@/hooks/useFilterState';
import { computeDedupRate, computeLatency, computePipelineReliability, computePublisherDominance, computeSourceHealth, computeCategoryVelocity, type VelocityRow } from '@/lib/transformers';
import { formatDateTime, formatMinutes, formatNumber, formatPercent } from '@/lib/utils/format';
import { getNewsItemSnippet } from '@/lib/api/news-item';
import { NewsItemSourceMeta } from '@/components/features/news/NewsItemSourceMeta';
import type { NewsData, NewsResponse } from '@/lib/types/api';
import { ExportMenu } from '@/components/features/export/ExportMenu';
import { CrossSourceEcho } from '@/components/dashboard/CrossSourceEcho';
import { TemporalHotspots } from '@/components/dashboard/TemporalHotspots';
import { HeuristicVelocity } from '@/components/dashboard/HeuristicVelocity';
import { DiversityPanel } from '@/components/dashboard/DiversityPanel';
import { StoryClustersPanel } from '@/components/dashboard/StoryClustersPanel';
import { PublishRatePanel } from '@/components/dashboard/PublishRatePanel';


type DashboardViewProps = {
  initialData: NewsData | null;
  initialError: { code: string; message: string } | null;
  initialSince: string;
  initialCategories: string[];
  initialPublishers: string[];
};

const timeOptions = [
  { value: '24h', label: '24 jam' },
  { value: '7d', label: '7 hari' },
  { value: '30d', label: '30 hari' },
];

function CheckGroup({ title, options, selected, onToggle }: { title: string; options: string[]; selected: string[]; onToggle: (value: string) => void }) {
  return (
    <fieldset className="space-y-2">
      <legend className="mb-3 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-500">{title}</legend>
      {options.map((option) => <label className="flex cursor-pointer items-start gap-2 text-xs leading-5 text-ink-700" key={option}>
        <input checked={selected.includes(option)} className="mt-1 size-4 accent-[#D32F2F]" onChange={() => onToggle(option)} type="checkbox" />
        <span className="break-words">{option}</span>
      </label>)}
      {options.length === 0 ? <p className="text-xs text-ink-400">Belum tersedia</p> : null}
    </fieldset>
  );
}

function MetricCell({ label, value, note, metricId }: { label: string; value: string; note: string; metricId: string }) {
  return <div className="min-h-[140px] min-w-0 space-y-2 bg-paper-50 p-6 lg:p-7">
    <p className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-500">{label}<ExplainTrigger metricId={metricId} /></p>
    <p className="truncate font-mono text-2xl font-semibold leading-8 text-ink-900">{value}</p>
    <p className="text-[11px] leading-4 text-ink-500">{note}</p>
  </div>;
}

function DashboardFilters({ data, filters, availableCategories, availablePublishers }: {
  data: NewsData | null;
  filters: ReturnType<typeof useFilterState>;
  availableCategories: string[];
  availablePublishers: string[];
}) {
  const { since, categories, publishers } = filters;
  const toggle = (current: string[], value: string, set: (next: string[]) => void) => set(current.includes(value) ? current.filter((entry) => entry !== value) : [...current, value].sort());

  return <div className="space-y-8">
    <fieldset>
      <legend className="mb-3 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-500">Rentang waktu</legend>
      <div className="flex flex-wrap gap-2">{timeOptions.map((option) => <button aria-pressed={since === option.value} className={`border px-3 py-2 font-mono text-xs transition-colors ${since === option.value ? 'border-brand-red bg-brand-red text-paper-50' : 'border-paper-300 bg-paper-50 text-ink-700 hover:bg-paper-200'}`} key={option.value} onClick={() => filters.setSince(option.value)} type="button">{option.label}</button>)}</div>
    </fieldset>
    <CheckGroup title="Kategori" options={availableCategories} selected={categories} onToggle={(value) => toggle(categories, value, filters.setCategories)} />
    <CheckGroup title="Publisher" options={availablePublishers} selected={publishers} onToggle={(value) => toggle(publishers, value, filters.setPublishers)} />
    <div>
      <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-500">Kesehatan sumber</p>
      <ul className="space-y-2">{data?.sources.map((source) => <li className="flex items-start gap-2 text-xs text-ink-700" key={source.url} title={source.error?.code ?? source.status}>
        <span aria-label={source.status === 'ok' ? 'Sehat' : 'Gagal'} className={`mt-1 size-2 shrink-0 rounded-full ${source.status === 'ok' ? 'bg-data-success' : 'bg-data-danger'}`} />
        <span className="min-w-0 break-words">{source.publisher}{source.error ? <span className="mt-0.5 block font-mono text-[10px] text-data-danger">{source.error.code}</span> : null}</span>
      </li>)}</ul>
      {!data ? <p className="text-xs text-ink-400">Status sumber belum tersedia.</p> : null}
    </div>
    {filters.hasFilters ? <Button className="w-full" onClick={filters.reset} variant="secondary"><RotateCcw aria-hidden="true" className="size-4" /> Reset filter</Button> : null}
  </div>;
}

function HighlightedTitle({ title, query }: { title: string; query: string }) {
  const search = query.trim();
  const index = title.toLocaleLowerCase('id').indexOf(search.toLocaleLowerCase('id'));
  if (!search || index < 0) return <>{title}</>;
  return <>{title.slice(0, index)}<mark className="bg-brand-red/10 text-ink-900 rounded-sm px-0.5">{title.slice(index, index + search.length)}</mark>{title.slice(index + search.length)}</>;
}

function FeedRow({ item, query }: { item: NewsData['items'][number]; query: string }) {
  const { openReader } = useDrawer();
const isMobile = useIsMobile();
const router = useRouter();
  const snippet = getNewsItemSnippet(item);
  return <article className="grid grid-cols-1 gap-3 border-t border-paper-300 py-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red focus-visible:ring-offset-2 focus-visible:ring-offset-paper-100 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start" data-feed-id={item.id} data-feed-item data-feed-url={item.url} data-reader-title={item.title} data-reader-url={item.url} tabIndex={-1}>
    <div className="min-w-0">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        {(item.categories ?? []).map((category) => <Badge key={category}>{category}</Badge>)}
        <span className="font-mono text-[10px] text-ink-400">{item.date_confidence}</span>
      </div>
      <h3 className="font-sans text-base font-semibold leading-6 text-ink-900">
        <button className="text-left underline decoration-transparent underline-offset-4 hover:text-brand-red hover:decoration-brand-red" data-feed-reader onClick={() => { if (isMobile) { router.push('/baca?url=' + encodeURIComponent(item.url)); } else { openReader(item.url, item); } } } type="button"><HighlightedTitle query={query} title={item.title} /></button>
      </h3>
      {snippet ? <p className="mt-2 line-clamp-2 text-sm leading-6 text-ink-500">{snippet}</p> : null}
      <p className="mt-2 flex flex-wrap items-center gap-1.5 font-mono text-[10px] text-ink-400"><NewsItemSourceMeta item={item} /> · {formatDateTime(item.published_at)}</p>
    </div>
    <div className="flex items-center gap-1 sm:mt-1">
      <BookmarkButton article={item} />
      <a aria-label={`Buka artikel: ${item.title}`} className="inline-flex size-9 items-center justify-center rounded-btn text-ink-400 hover:bg-paper-200 hover:text-brand-red" href={item.url} rel="noreferrer" target="_blank"><ExternalLink aria-hidden="true" className="size-4" /></a>
    </div>
  </article>;
}

function VelocityPanel({ data }: { data: NewsData }) {
  const velocity = computeCategoryVelocity(data.items);
  if (velocity.insufficient) return <StateCard variant="empty" title="Kecepatan kategori belum tersedia" description="Tidak ada waktu terbit valid dalam jendela 24 jam pada data ini." />;
  const chartData = Array.from({ length: 24 }, (_, hour) => ({
    jam: `${String(hour).padStart(2, '0')}`,
    ...Object.fromEntries(velocity.categories.slice(0, 4).map((category) => [category.category, category.hourly[hour]])),
  }));
  const colors = ['#D32F2F', '#4A148C', '#B45309', '#15803D'];
  return <div>
    <p className="sr-only" id="velocity-description">Jumlah artikel per kategori, dikelompokkan berdasarkan jam terbit selama 24 jam.</p>
    <div aria-describedby="velocity-description" aria-label="Grafik kecepatan kategori per jam" className="mt-4 h-64" role="img">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: -18 }}>
          <CartesianGrid vertical={false} stroke="#D9D2C4" strokeDasharray="2 5" />
          <XAxis dataKey="jam" tick={{ fill: '#8C8882', fontSize: 10 }} tickLine={false} axisLine={false} interval={3} />
          <YAxis allowDecimals={false} tick={{ fill: '#8C8882', fontSize: 10 }} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={{ background: '#FDFBF6', border: '1px solid #D9D2C4', borderRadius: 0, fontSize: 12 }} />
          {velocity.categories.slice(0, 4).map((category, index) => <Line connectNulls dataKey={category.category} dot={false} key={category.category} name={category.category} stroke={colors[index]} strokeWidth={2} type="monotone" />)}
        </LineChart>
      </ResponsiveContainer>
    </div>
    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">{velocity.categories.slice(0, 4).map((category, index) => <span className="inline-flex items-center gap-2 font-mono text-[10px] text-ink-500" key={category.category}><span className="size-2" style={{ backgroundColor: colors[index] }} />{category.category}</span>)}</div>
  </div>;
}

export function DashboardView({ initialData, initialError, initialSince, initialCategories, initialPublishers }: DashboardViewProps) {
  const filters = useFilterState({ since: initialSince, categories: initialCategories, publishers: initialPublishers });
  const { since, categories, publishers, q } = filters;
  const query = useMemo(() => new URLSearchParams({ since, max_items: '200' }).toString(), [since]);
  const fallbackData = initialData ? { ok: true, data: initialData, error: null } as NewsResponse : undefined;
  const { data: response, error, isLoading, mutate } = useSWR<NewsResponse, Error>(`/api/news?${query}`, fetchNewsClient, { fallbackData, revalidateOnFocus: false, keepPreviousData: true });
  const data = response?.data ?? null;
  const availableCategories = useMemo(() => [...new Set(data?.items.flatMap((item) => item.categories ?? []) ?? [])].sort(), [data]);
  const availablePublishers = useMemo(() => [...new Set(data?.items.map((item) => item.publisher) ?? [])].sort(), [data]);
  const fuse = useMemo(() => new Fuse(data?.items ?? [], {
    keys: [
      { name: 'title', weight: 2 },
      { name: 'summary', weight: 1 },
      { name: 'publisher', weight: 1.5 },
      { name: 'categories', weight: 1.5 },
    ],
    threshold: 0.4,
    includeMatches: true,
    ignoreLocation: true,
    minMatchCharLength: 3,
  }), [data]);
  const filteredItems = useMemo(() => {
    const matches = q.trim() ? fuse.search(q).map((result) => result.item) : data?.items ?? [];
    return matches.filter((item) => (!categories.length || categories.some((category) => (item.categories ?? []).includes(category))) && (!publishers.length || publishers.includes(item.publisher)));
  }, [categories, data, fuse, publishers, q]);
  const health = data ? computeSourceHealth(data) : null;
  const latency = data ? computeLatency(data.items) : null;
  const dedup = data ? computeDedupRate(data.stats) : null;
  const pipeline = data ? computePipelineReliability(data.stats) : null;
  const dominance = data ? computePublisherDominance(data.items) : null;

  return <div className="mx-auto max-w-7xl px-5 py-12 lg:px-8 lg:py-16">
    <header className="mb-10 flex flex-col justify-between gap-4 border-b border-paper-300 pb-7 sm:flex-row sm:items-end">
      <div><p className="font-mono text-eyebrow uppercase text-brand-red">Pemantauan · 01</p><h1 className="mt-3 font-sans text-h1 text-ink-900">Dashboard</h1><p className="mt-2 text-sm text-ink-500">Aliran feed dan kondisi sumber berita.</p></div>
      {data ? <p className="font-mono text-xs text-ink-500">Diperbarui {formatDateTime(data.generated_at)}</p> : null}
      {data ? <ExportMenu items={filteredItems} snapshotElementId="dashboard-feed" /> : null}
    </header>
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
      <details className="border-b border-paper-300 pb-6 lg:hidden">
        <summary className="cursor-pointer font-sans text-sm font-semibold text-ink-900">Filter dashboard</summary>
        <div className="mt-5"><DashboardFilters data={data} filters={filters} availableCategories={availableCategories} availablePublishers={availablePublishers} /></div>
      </details>
      <aside className="hidden lg:sticky lg:top-24 lg:col-span-3 lg:block lg:h-fit">
        <DashboardFilters data={data} filters={filters} availableCategories={availableCategories} availablePublishers={availablePublishers} />
      </aside>

      <section aria-label="Ringkasan dan feed" className="min-w-0 lg:col-span-9">
        {error || initialError && !response ? <StateCard variant="error" title="Data berita tidak dapat dimuat" description={error?.message ?? initialError?.message ?? 'Layanan berita belum tersedia.'} action={<Button onClick={() => void mutate()} type="button">Coba lagi</Button>} /> : null}
        {isLoading && !data && !initialError ? <StateCard variant="loading" title="Memuat dashboard" description="Mengambil data feed terbaru." /> : null}
        {data ? <>
          {filteredItems.length === 0 ? <StateCard className="mb-6" variant="empty" title="Tidak ada hasil untuk filter ini." description="Coba ubah kata kunci, kategori, publisher, atau rentang waktunya." action={<Button onClick={filters.reset} variant="secondary">Reset filter</Button>} /> : null}
          <div className="grid grid-cols-1 gap-px border border-paper-300 bg-paper-300 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCell label="Kesehatan sumber" metricId="source-health" value={health?.insufficient ? '—' : formatPercent(health?.healthPct ?? 0)} note={`${formatNumber(data.stats.sources_ok)} dari ${formatNumber(data.stats.sources_total)} sumber`} />
            <MetricCell label="Artikel dikurasi" metricId="items-kept" value={formatNumber(data.stats.items_kept)} note="pada snapshot feed ini" />
            <MetricCell label="Median latensi" metricId="median-latency" value={latency?.insufficient ? '—' : formatMinutes(latency?.median ?? 0)} note="terbit ke fetch" />
            <MetricCell label="Deduplikasi" metricId="dedup-rate" value={dedup?.insufficient ? '—' : formatPercent((dedup?.rate ?? 0) * 100)} note={`${formatNumber(dedup?.deduped ?? 0)} dari ${formatNumber(dedup?.fetched ?? 0)} item`} />
          </div>
          <CrossSourceEcho data={data} />
        <TemporalHotspots data={data} />
        <HeuristicVelocity data={data} now={Date.now()} />
          <div className="mt-8 grid grid-cols-1 gap-8 xl:grid-cols-12">
            <section className="min-w-0 xl:col-span-8">
              <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
                <h2 className="font-sans text-h3 text-ink-900">Aliran berita terkini</h2>
                <div className="flex items-center gap-2">
                  <span aria-live="polite" className="flex items-center gap-1 font-mono text-[10px] text-ink-400">Menampilkan {formatNumber(filteredItems.length)} dari {formatNumber(data.items.length)} artikel<ExplainTrigger context={{ filteredCount: filteredItems.length, query: q }} metricId="filter-count" /></span>

                </div>
              </div>
              <EditorsPicksStrip data={data} />
              <div id="dashboard-feed">{filteredItems.slice(0, 30).map((item) => <FeedRow item={item} key={item.id} query={q} />)}</div>
            </section>
            <section className="min-w-0 border-t border-paper-300 pt-6 xl:col-span-4 xl:border-l xl:border-t-0 xl:pl-6 xl:pt-0">
              <div className="flex items-center gap-1"><h2 className="font-sans text-h3 text-ink-900">Dominasi publisher</h2><ExplainTrigger metricId="publisher-dominance" /></div>
              <p className="mt-1 text-xs text-ink-500">Porsi dari artikel yang tampil, bukan total produksi.</p>
              <div className="mt-5 space-y-4">{dominance?.publishers.map((publisher, index) => <div key={publisher.publisher}>
                <div className="mb-1 flex justify-between gap-3 text-xs"><Link className="min-w-0 truncate text-ink-700 underline decoration-transparent underline-offset-2 hover:text-brand-red hover:decoration-brand-red" href={`/publisher/${encodeURIComponent(publisher.domains[0] ?? '')}`}>{publisher.publisher}</Link><span className="shrink-0 font-mono text-ink-500">{formatPercent(publisher.sharePct)}</span></div>
                <div aria-label={`${publisher.publisher}, ${formatNumber(publisher.count)} artikel`} className="h-1.5 bg-paper-300" role="img"><div className={`h-full ${index === 0 ? 'bg-brand-red' : 'bg-ink-400'}`} style={{ width: `${publisher.sharePct}%` }} /></div>
              </div>)}</div>
              {dominance?.insufficient ? <p className="mt-4 text-xs text-ink-500">Belum ada data publisher.</p> : null}
              <div className="mt-8 border-t border-paper-300 pt-5">
                <p className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-500">Kualitas pipeline<ExplainTrigger metricId="pipeline-reliability" /></p>
                {pipeline?.insufficient ? <p className="mt-2 text-sm text-ink-500">Belum tersedia.</p> : <dl className="mt-3 space-y-2 text-xs">
                  {[
                    { label: 'Hasil kurasi', value: pipeline?.extractionYield ?? 0 },
                    { label: 'Deduplikasi', value: pipeline?.dedupeRate ?? 0 },
                    { label: 'Sumber berhasil', value: pipeline?.fetchSuccessRate ?? 0 },
                  ].map((metric) => <div key={metric.label}>
                    <div className="flex justify-between gap-3"><dt className="text-ink-500">{metric.label}</dt><dd className="font-mono text-ink-900">{formatPercent(metric.value * 100)}</dd></div>
                    <div aria-label={`${metric.label}: ${formatPercent(metric.value * 100)}`} className="mt-1 h-1 bg-paper-300" role="img"><div className="h-full bg-brand-red" style={{ width: `${Math.min(100, Math.max(0, metric.value * 100))}%` }} /></div>
                  </div>)}
                </dl>}
                {!pipeline?.insufficient ? <p className="mt-3 text-[10px] leading-4 text-ink-500">Dari {formatNumber(data.stats.items_kept)} artikel dipertahankan, {formatNumber(data.stats.items_deduped)} duplikat dari {formatNumber(data.stats.items_fetched)} item, dan {formatNumber(data.stats.sources_ok)} dari {formatNumber(data.stats.sources_total)} sumber berhasil.</p> : null}
              </div>
            </section>
          </div>
          <CoverageMatrixPanel data={data} />
          <section className="mt-10 border-t border-paper-300 pt-7">
            <div className="flex flex-wrap items-baseline justify-between gap-3"><div className="flex items-center gap-1"><h2 className="font-sans text-h3 text-ink-900">Kecepatan kategori</h2><ExplainTrigger metricId="category-velocity" /></div><span className="font-mono text-[10px] text-ink-400">Jendela 24 jam · berdasarkan waktu terbit</span></div>
            <VelocityPanel data={data} />
          </section>
        </> : null}
      </section>
    </div>
  </div>;
}
