'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, Treemap, XAxis, YAxis } from 'recharts';
import { ExplainTrigger } from '@/components/features/explain/ExplainTrigger';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';
import { ArrowUpRight } from 'lucide-react';
import { StateCard } from '@/components/ui/StateCard';
import { fetchDataSchema } from '@/lib/api/schemas';
import { computeCategoryVelocity, computeKeywordGraph, computeLatency, computePublisherDominance, computeSourceHealth } from '@/lib/transformers';
import { formatDateTime, formatNumber, formatPercent } from '@/lib/utils/format';
import type { FetchData, NewsData } from '@/lib/types/api';
import { PublisherNetworkScene } from '@/components/three/PublisherNetworkScene';
import { TimeRangeToggle, type AnalyticsTimeRange } from '@/components/analytics/TimeRangeToggle';
import { CorrelationSection, SourceFreshnessSection, SupportingAnalytics } from '@/components/features/metrics/AnalyticsMetrics';

const COLORS = ['#D32F2F', '#B45309', '#4A148C', '#15803D', '#8C8882'];

type SourceFilter = 'all' | 'ok' | 'error';

function getSourceDomain(sourceUrl: string): string {
  try {
    return new URL(sourceUrl).hostname;
  } catch {
    return 'URL tidak valid';
  }
}

function getPublisherDomain(data: NewsData, source: NewsData['sources'][number], domain: string): string {
  return data.items.find((item) => item.source_url === source.url)?.publisher_domain ?? domain;
}

function SourceTable({ data }: { data: NewsData }) {
  const [filter, setFilter] = useState<SourceFilter>('all');
  const [selectedDomains, setSelectedDomains] = useState<string[]>([]);
  const router = useRouter();
  const rows = data.sources.filter((source) => filter === 'all' || source.status === filter);
  const tabs: { key: SourceFilter; label: string }[] = [{ key: 'all', label: 'Semua' }, { key: 'ok', label: 'Sehat' }, { key: 'error', label: 'Gagal' }];
  const toggleComparison = (publisherDomain: string, checked: boolean) => setSelectedDomains((current) => {
    if (!checked) return current.filter((entry) => entry !== publisherDomain);
    if (current.length >= 2) {
      toast.info('Pilih maksimal dua publisher.');
      return current;
    }
    return [...current, publisherDomain];
  });
  return <section>
    <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
      <div><div className="flex items-center gap-1"><h2 className="font-sans text-h3 text-ink-900">Kesehatan ekosistem</h2><ExplainTrigger metricId="source-health" /></div><p className="mt-1 text-xs text-ink-500">Status source sebagaimana dikembalikan pada snapshot.</p></div>
      <div aria-label="Filter status sumber" className="flex gap-4" role="group">{tabs.map((tab) => <button aria-pressed={filter === tab.key} className={`border-b-2 pb-1 text-xs ${filter === tab.key ? 'border-brand-red font-semibold text-brand-red' : 'border-transparent text-ink-500 hover:text-ink-900'}`} key={tab.key} onClick={() => setFilter(tab.key)} type="button">{tab.label}</button>)}</div>
    </div>
    {rows.length ? <>
      <div className="space-y-2 sm:hidden">{rows.map((source) => {
        const domain = getSourceDomain(source.url);
        const publisherDomain = getPublisherDomain(data, source, domain);
        const comparable = data.items.some((item) => item.publisher_domain === publisherDomain);
        return <article className="border border-paper-300 bg-paper-50 p-4" key={source.url}>
          <div className="flex items-start justify-between gap-3">
            <Link className="font-sans text-sm font-semibold text-ink-900 underline decoration-transparent underline-offset-2 hover:text-brand-red hover:decoration-brand-red" href={`/publisher/${encodeURIComponent(publisherDomain)}`}>{source.publisher}</Link>
            <Badge variant={source.status === 'ok' ? 'success' : 'danger'}>{source.status === 'ok' ? 'Sehat' : 'Gagal'}</Badge>
          </div>
          <p className="mt-2 break-all font-mono text-[10px] text-ink-500">{domain}</p>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-paper-300 pt-3">
            <span className="font-mono text-xs text-ink-700">{formatNumber(source.items)} item</span>
            <label className="inline-flex items-center gap-2 text-xs text-ink-500">
              Bandingkan
              <input aria-label={`Pilih ${source.publisher} untuk dibandingkan`} checked={selectedDomains.includes(publisherDomain)} className="size-4 accent-[#D32F2F]" disabled={!comparable} onChange={(event) => toggleComparison(publisherDomain, event.target.checked)} type="checkbox" />
            </label>
          </div>
          {source.error ? <p className="mt-2 font-mono text-[10px] text-data-danger">Error: {source.error.code}</p> : null}
        </article>;
      })}</div>
      <div className="hidden overflow-x-auto border-y border-paper-300 sm:block">
      <table className="w-full min-w-[720px] border-collapse text-left text-xs">
        <thead><tr className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-500"> <th className="py-3 pr-3 font-medium">Bandingkan</th><th className="py-3 pr-4 font-medium">Publisher</th><th className="py-3 pr-4 font-medium">Domain feed</th><th className="py-3 pr-4 font-medium">Status</th><th className="py-3 pr-4 text-right font-medium">Item</th><th className="py-3 font-medium">Error code</th></tr></thead>
        <tbody>{rows.map((source, index) => {
          const domain = getSourceDomain(source.url);
          const publisherDomain = getPublisherDomain(data, source, domain);
          return <tr className={index % 2 === 0 ? 'bg-paper-50' : 'bg-paper-100/60'} key={source.url}>
            <td className="py-3 pr-3"><input aria-label={`Pilih ${source.publisher} untuk dibandingkan`} checked={selectedDomains.includes(publisherDomain)} className="size-4 accent-[#D32F2F]" disabled={!data.items.some((item) => item.publisher_domain === publisherDomain)} onChange={(event) => toggleComparison(publisherDomain, event.target.checked)} type="checkbox" /></td>
            <td className="py-3 pr-4 font-medium text-ink-900"><Link className="underline decoration-transparent underline-offset-2 hover:text-brand-red hover:decoration-brand-red" href={`/publisher/${encodeURIComponent(publisherDomain)}`}>{source.publisher}</Link></td><td className="py-3 pr-4 font-mono text-ink-500">{domain}</td>
            <td className="py-3 pr-4"><Badge variant={source.status === 'ok' ? 'success' : 'danger'}>{source.status === 'ok' ? 'Sehat' : 'Gagal'}</Badge></td>
            <td className="py-3 pr-4 text-right font-mono text-ink-700">{formatNumber(source.items)}</td><td className="py-3 font-mono text-[10px] text-data-danger">{source.error?.code ?? '—'}</td>
          </tr>;
        })}</tbody>
      </table>
      </div>
    </> : <StateCard variant="empty" title="Tidak ada sumber pada filter ini" />}
    {selectedDomains.length === 2 ? <div className="fixed bottom-5 left-1/2 z-40 flex -translate-x-1/2 items-center gap-4 border border-paper-300 bg-paper-50 px-4 py-3 shadow-lg"><span className="font-mono text-xs text-ink-700">2 publisher dipilih</span><Button onClick={() => router.push(`/bandingkan?a=${encodeURIComponent(selectedDomains[0])}&b=${encodeURIComponent(selectedDomains[1])}`)}>Bandingkan 2 publisher <ArrowUpRight aria-hidden="true" className="size-4" /></Button><button aria-label="Hapus pilihan perbandingan" className="text-xs text-ink-500 underline" onClick={() => setSelectedDomains([])} type="button">Batal</button></div> : null}
  </section>;
}

function KeywordGraph({ items }: { items: NewsData['items'] }) {
  const graph = useMemo(() => computeKeywordGraph(items, { topN: 18 }), [items]);
  const [selected, setSelected] = useState<string | null>(null);
  if (graph.insufficient) return <StateCard variant="empty" title="Jaringan kata kunci belum terbentuk" description="Dibutuhkan setidaknya dua kata yang dapat dihubungkan dari judul berita." />;
  const centerX = 270;
  const centerY = 160;
  const positions = graph.nodes.map((node, index) => {
    const angle = -Math.PI / 2 + (2 * Math.PI * index) / graph.nodes.length;
    const radius = 108 + (index % 3) * 11;
    return { ...node, x: centerX + Math.cos(angle) * radius, y: centerY + Math.sin(angle) * radius };
  });
  const byId = new Map(positions.map((node) => [node.id, node]));
  const neighbors = new Set(graph.edges.filter((edge) => edge.source === selected || edge.target === selected).flatMap((edge) => [edge.source, edge.target]));
  const relatedItems = selected ? items.filter((item) => item.title.toLocaleLowerCase('id').includes(selected)).slice(0, 5) : [];
  return <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_220px]">
    <div className="min-w-0 overflow-hidden border-y border-paper-300 bg-paper-50">
      <svg aria-label="Grafik jaringan kata kunci judul berita" className="h-[320px] w-full" role="img" viewBox="0 0 540 320">
        <title>Jaringan kata kunci berita</title><desc>Garis menghubungkan kata yang muncul bersama pada satu judul. Pilih kata untuk melihat judul terkait.</desc>
        {graph.edges.map((edge) => {
          const source = byId.get(edge.source); const target = byId.get(edge.target);
          if (!source || !target) return null;
          return <line key={`${edge.source}-${edge.target}`} opacity={selected ? (neighbors.has(edge.source) && neighbors.has(edge.target) ? 0.8 : 0.12) : 0.38} stroke="#B8AF9B" strokeWidth={Math.min(3, 0.7 + edge.weight * 0.35)} x1={source.x} x2={target.x} y1={source.y} y2={target.y} />;
        })}
        {positions.map((node) => {
          const active = selected === node.id;
          const related = !selected || neighbors.has(node.id);
          return <g aria-label={`${node.id}, bobot ${node.weight}`} className="cursor-pointer" key={node.id} onClick={() => setSelected(active ? null : node.id)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') setSelected(active ? null : node.id); }} role="button" tabIndex={0}>
            <circle cx={node.x} cy={node.y} fill={active ? '#D32F2F' : '#EDE7F6'} opacity={related ? 1 : 0.3} r={Math.min(22, 8 + node.weight * 2)} stroke={active ? '#A02020' : '#4A148C'} strokeWidth={active ? 3 : 1.5} />
            <text fill={active ? '#FDFBF6' : '#3A3733'} fontFamily="var(--font-mono)" fontSize="10" opacity={related ? 1 : 0.3} textAnchor="middle" x={node.x} y={node.y + 3}>{node.id.length > 12 ? `${node.id.slice(0, 11)}…` : node.id}</text>
          </g>;
        })}
      </svg>
    </div>
    <aside className="border-l border-paper-300 pl-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-500">{selected ? `Judul · ${selected}` : 'Pilih kata'}</p>
      {selected && relatedItems.length ? <ol className="mt-3 space-y-3">{relatedItems.map((item) => <li className="border-t border-paper-300 pt-2 text-xs leading-5 text-ink-700" key={item.id}>{item.title}<span className="mt-1 block font-mono text-[10px] text-ink-400">{item.publisher}</span></li>)}</ol> : <p className="mt-3 text-xs leading-5 text-ink-500">Judul terkait akan muncul di sini.</p>}
      {selected ? <button className="mt-4 font-mono text-[10px] text-brand-red underline underline-offset-2" onClick={() => setSelected(null)} type="button">Hapus pilihan</button> : null}
    </aside>
  </div>;
}

function PublisherNetworkSection({ data }: { data: NewsData }) {
  const publishers = computePublisherDominance(data.items).publishers.slice(0, 8);
  return (
    <section className="grid grid-cols-1 gap-8 border-y border-paper-300 py-7 lg:grid-cols-12">
      <div className="lg:col-span-4">
        <div className="flex items-center gap-1">
          <h2 className="font-sans text-h3 text-ink-900">Peta aliran berita</h2>
          <ExplainTrigger metricId="publisher-dominance" />
        </div>
        <p className="mt-2 text-xs leading-5 text-ink-500">
          Koneksi kategori antar-publisher dalam ruang interaktif 3D.
        </p>
        <ul className="mt-5 space-y-2">
          {publishers.map((publisher, index) => (
            <li className="flex items-center gap-2 text-xs text-ink-700" key={publisher.publisher}>
              <span className="size-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
              {publisher.publisher}
            </li>
          ))}
        </ul>
      </div>
      <div className="lg:col-span-8">
        <PublisherNetworkScene data={data} />
      </div>
    </section>
  );
}

export function LatencySection({ items }: { items: NewsData['items'] }) {
  const latency = computeLatency(items);
  if (latency.insufficient) return <StateCard variant="empty" title="Distribusi latensi belum tersedia" description="Data waktu terbit dan fetch yang valid belum cukup." />;
  return <div>
    <div className="mb-4 flex flex-wrap gap-6 font-mono text-xs"><span>Median <strong className="text-brand-red">{latency.median.toLocaleString('id-ID', { maximumFractionDigits: 1 })} mnt</strong></span><span>P95 <strong className="text-ink-900">{latency.p95.toLocaleString('id-ID', { maximumFractionDigits: 1 })} mnt</strong></span></div>
    <p className="sr-only" id="latency-description">Distribusi jeda antara waktu terbit dan waktu fetch item berita.</p>
    <div aria-describedby="latency-description" aria-label="Histogram latensi terbit ke fetch" className="h-56" role="img"><ResponsiveContainer width="100%" height="100%"><BarChart data={latency.buckets} margin={{ top: 8, right: 12, bottom: 0, left: -18 }}>
      <CartesianGrid vertical={false} stroke="#D9D2C4" strokeDasharray="2 5" /><XAxis dataKey="label" tick={{ fill: '#8C8882', fontSize: 10 }} tickLine={false} axisLine={false} /><YAxis allowDecimals={false} tick={{ fill: '#8C8882', fontSize: 10 }} tickLine={false} axisLine={false} /><Tooltip contentStyle={{ background: '#FDFBF6', border: '1px solid #D9D2C4', borderRadius: 0, fontSize: 12 }} /><Bar dataKey="count" fill="#B45309" maxBarSize={44} name="Jumlah item" radius={0} />
    </BarChart></ResponsiveContainer></div>
  </div>;
}

function CategoryTreemap({ items }: { items: NewsData['items'] }) {
  const counts = new Map<string, number>();
  for (const item of items) for (const category of new Set(item.categories)) counts.set(category, (counts.get(category) ?? 0) + 1);
  const ordered = [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const rows = ordered.slice(0, 5).map(([name, count], index) => ({ name, count, fill: COLORS[index % COLORS.length] }));
  if (!rows.length) return <StateCard variant="empty" title="Distribusi kategori belum tersedia" />;
  return <div aria-label="Treemap jumlah artikel per kategori" className="h-64" role="img">
    <ResponsiveContainer width="100%" height="100%"><Treemap data={rows} dataKey="count" nameKey="name" stroke="#F7F3EC" fill="#D32F2F" aspectRatio={4 / 3}>
      <Tooltip contentStyle={{ background: '#FDFBF6', border: '1px solid #D9D2C4', borderRadius: 0, fontSize: 12 }} formatter={(value, name) => [value, name]} />
    </Treemap></ResponsiveContainer>
  </div>;
}

function AIQualityCard() {
  const [ai, setAi] = useState<FetchData['ai'] | null>(null);
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('irn:lastFetch:v1');
      if (!saved) return;
      const parsed: unknown = JSON.parse(saved);
      const validated = fetchDataSchema.safeParse(parsed);
      if (validated.success) setAi(validated.data.ai);
    } catch { setAi(null); }
  }, []);
  return <section className="border-t border-paper-300 pt-7">
    <div className="flex flex-wrap items-baseline justify-between gap-3"><h2 className="flex items-center gap-1 font-sans text-h3 text-ink-900">Kualitas AI <ExplainTrigger metricId="pipeline-reliability" /></h2><span className="font-mono text-[10px] text-ink-400">Dari analisis URL terakhir di sesi ini</span></div>
    {ai ? <div className="mt-5 grid grid-cols-2 gap-0 border-y border-paper-300 bg-paper-50 sm:grid-cols-3">
      <div className="border-b border-r border-paper-300 p-4"><p className="font-mono text-[10px] uppercase text-ink-500">Guard</p><p className="mt-2"><Badge variant={ai.guard_status === 'pass' ? 'success' : ai.guard_status === 'blocked' ? 'danger' : 'ochre'}>{ai.guard_status}</Badge></p></div>
      <div className="border-b border-paper-300 p-4 sm:border-r"><p className="font-mono text-[10px] uppercase text-ink-500">Keyakinan guard</p><p className="mt-2 font-mono text-lg text-ink-900">{formatPercent(ai.guard_confidence * 100)}</p></div>
      <div className="border-b border-paper-300 p-4 sm:border-r"><p className="font-mono text-[10px] uppercase text-ink-500">Chunk berhasil</p><p className="mt-2 font-mono text-lg text-ink-900">{ai.chunks_ok} / {ai.chunks_total}</p></div>
      <div className="border-r border-paper-300 p-4"><p className="font-mono text-[10px] uppercase text-ink-500">Item dipertahankan</p><p className="mt-2 font-mono text-lg text-ink-900">{ai.items_kept} / {ai.items_raw}</p></div>
      <div className="border-r border-paper-300 p-4"><p className="font-mono text-[10px] uppercase text-ink-500">Model</p><p className="mt-2 break-all font-mono text-xs text-ink-900">{ai.model}</p></div>
      <div className="p-4"><p className="font-mono text-[10px] uppercase text-ink-500">Cache</p><p className="mt-2 font-mono text-xs text-ink-900">{ai.cached ? 'digunakan' : 'tidak digunakan'}</p></div>
    </div> : <p className="mt-3 text-sm text-ink-500">Belum ada hasil analisis URL di sesi browser ini.</p>}
  </section>;
}

export function AnalyticsView({ data, since }: { data: NewsData; since: AnalyticsTimeRange }) {
  const health = computeSourceHealth(data);
  const velocity = computeCategoryVelocity(data.items);
  const rangeLabel = since === '12h' ? '12 Jam' : since === '72h' ? '72 Jam' : '24 Jam';
  return <div className="mx-auto max-w-7xl px-5 py-12 lg:px-8 lg:py-16">
    <header className="mb-12 flex flex-col justify-between gap-4 border-b border-paper-300 pb-7 sm:flex-row sm:items-end">
      <div><p className="font-mono text-eyebrow uppercase text-brand-red">Snapshot · {rangeLabel}</p><h1 className="mt-3 font-sans text-h1 text-ink-900">Analitik {rangeLabel}</h1></div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="font-mono text-xs text-ink-500">{formatDateTime(data.generated_at)} · {data.date_tz}</p>
        <TimeRangeToggle current={since} />
      </div>
    </header>
    <div className="mb-10 grid grid-cols-2 gap-4 border-y border-paper-300 py-5 sm:grid-cols-4">
      <div><p className="font-mono text-[10px] uppercase text-ink-500">Sumber sehat</p><p className="mt-2 font-mono text-2xl text-ink-900">{health.insufficient ? '—' : formatPercent(health.healthPct)}</p></div>
      <div><p className="font-mono text-[10px] uppercase text-ink-500">Artikel dipertahankan</p><p className="mt-2 font-mono text-2xl text-ink-900">{formatNumber(data.stats.items_kept)}</p></div>
      <div><p className="font-mono text-[10px] uppercase text-ink-500">Kategori bergerak</p><p className="mt-2 font-mono text-2xl text-ink-900">{velocity.categories.length}</p></div>
      <div><p className="font-mono text-[10px] uppercase text-ink-500">Snapshot</p><p className="mt-2 font-mono text-base text-ink-900">{data.date}</p></div>
    </div>
    <div className="space-y-12">
      <SourceTable data={data} />
      <SourceFreshnessSection data={data} />
      <PublisherNetworkSection data={data} />
      <SupportingAnalytics data={data} />
      <section><div className="mb-5"><div className="flex items-center gap-1"><h2 className="font-sans text-h3 text-ink-900">Jaringan kata kunci</h2><ExplainTrigger metricId="keyword-graph" /></div><p className="mt-1 text-xs text-ink-500">Kata muncul bersama pada satu judul; bukan analisis sentimen atau pemodelan topik.</p></div><KeywordGraph items={data.items} /></section>
      <CorrelationSection data={data} />
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
        <section className="lg:col-span-7"><h2 className="mb-5 flex items-center gap-1 font-sans text-h3 text-ink-900">Distribusi latensi <ExplainTrigger metricId="median-latency" /></h2><LatencySection items={data.items} /></section>
        <section className="lg:col-span-5"><h2 className="mb-5 flex items-center gap-1 font-sans text-h3 text-ink-900">Kategori berita <ExplainTrigger metricId="category-velocity" /></h2><CategoryTreemap items={data.items} /></section>
      </div>
      <AIQualityCard />
    </div>
  </div>;
}
