'use client';

import { useMemo, useState } from 'react';
import { ArrowDown, ArrowRight, ArrowUp, Minus } from 'lucide-react';
import { ExplainTrigger } from '@/components/features/explain/ExplainTrigger';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { formatNumber, formatPercent } from '@/lib/utils/format';
import {
  computeCategorySourceDiversity,
  computeCrossSourceEcho,
  computeHeuristicVelocity,
  computeRecentPublishRate,
  computeStoryClusters,
  computeSummaryCompleteness,
  computeTemporalHotspots,
} from '@/lib/transformers';
import type { NewsData } from '@/lib/types/api';

function resolveNow(data: NewsData): number {
  const generated = Date.parse(data.generated_at);
  if (Number.isFinite(generated)) return generated;
  const itemTimes = data.items.map((item) => Date.parse(item.published_at)).filter(Number.isFinite);
  return itemTimes.length ? Math.max(...itemTimes) : 0;
}

function PanelHead({ title, metricId, caption }: { title: string; metricId: string; caption: string }) {
  return <div className="mb-5">
    <div className="flex items-center gap-1"><h3 className="font-sans text-h3 text-ink-900">{title}</h3><ExplainTrigger metricId={metricId} /></div>
    <p className="mt-1 text-xs text-ink-500">{caption}</p>
  </div>;
}

function Empty({ children }: { children: string }) {
  return <p className="text-xs text-ink-500">{children}</p>;
}

function EchoPanel({ data }: { data: NewsData }) {
  const result = computeCrossSourceEcho(data.items);
  const max = Math.max(1, ...result.echoes.map((echo) => echo.publisherCount));
  return <SurfaceCard>
    <PanelHead caption="Judul yang sama setelah normalisasi, muncul di beberapa publisher." metricId="cross-source-echo" title="Gema Lintas Sumber" />
    {result.insufficient ? <Empty>Belum ada judul yang muncul di lebih dari satu publisher.</Empty> : <ul className="space-y-4">
      {result.echoes.slice(0, 8).map((echo) => <li key={echo.normalizedTitle}>
        <p className="truncate font-sans text-xs font-semibold text-ink-900" title={echo.displayTitle}>{echo.displayTitle.length > 40 ? `${echo.displayTitle.slice(0, 40)}…` : echo.displayTitle}</p>
        <div className="mt-1.5 flex items-center gap-2">
          <div aria-hidden="true" className="h-1.5 min-w-0 flex-1 bg-paper-200"><div className="h-full bg-brand-red" style={{ width: `${(echo.publisherCount / max) * 100}%` }} /></div>
          <span className="shrink-0 font-mono text-[10px] text-ink-500">{formatNumber(echo.publisherCount)}</span>
        </div>
        <p className="mt-1.5 flex flex-wrap gap-1">{echo.publishers.map((publisher) => <span className="rounded-pill bg-paper-200 px-2 py-0.5 font-mono text-[10px] text-ink-700" key={`${echo.normalizedTitle}:${publisher}`}>{publisher}</span>)}</p>
      </li>)}
    </ul>}
  </SurfaceCard>;
}

function HotspotsPanel({ items }: { items: NewsData['items'] }) {
  const result = computeTemporalHotspots(items);
  const max = Math.max(1, ...result.hours.map((hour) => hour.count));
  const top = new Set(result.top3);
  return <SurfaceCard>
    <PanelHead caption="Zona waktu Asia/Jakarta. Jam sibuk ≠ jam penting editorial." metricId="temporal-hotspots" title="Jam Sibuk" />
    {result.insufficient ? <Empty>Belum ada timestamp terbit yang dapat dibaca.</Empty> : <>
      <div className="grid gap-px" style={{ gridTemplateColumns: 'repeat(24, minmax(0, 1fr))' }}>
        {result.hours.map((hour) => <div className="min-w-0" key={hour.hour}>
          <p className={`mb-1 text-center font-mono text-[8px] ${top.has(hour.hour) ? 'text-brand-red' : 'text-transparent'}`}>{String(hour.hour).padStart(2, '0')}</p>
          <div aria-label={`${String(hour.hour).padStart(2, '0')}:00, ${formatNumber(hour.count)} artikel`} className="h-10 bg-brand-red" role="img" style={{ opacity: hour.count === 0 ? 0.08 : Math.max(0.15, hour.count / max) }} />
        </div>)}
      </div>
      <div className="mt-2 flex justify-between font-mono text-[9px] text-ink-400"><span>00</span><span>06</span><span>12</span><span>18</span><span>23</span></div>
    </>}
  </SurfaceCard>;
}

function HeuristicVelocityPanel({ items, now }: { items: NewsData['items']; now: number }) {
  const result = computeHeuristicVelocity(items, now);
  const icon = (direction: 'up' | 'down' | 'flat') => direction === 'up' ? <ArrowUp aria-hidden="true" className="size-3 text-brand-red" /> : direction === 'down' ? <ArrowDown aria-hidden="true" className="size-3 text-ink-500" /> : <Minus aria-hidden="true" className="size-3 text-ink-400" />;
  return <SurfaceCard>
    <PanelHead caption="Heuristik 4 jam vs 4 jam sebelumnya. Selisih < 5% dianggap flat." metricId="heuristic-velocity" title="Kecepatan Kategori (Heuristik)" />
    {result.insufficient ? <Empty>Butuh setidaknya dua artikel untuk membandingkan jendela waktu.</Empty> : <ul className="divide-y divide-paper-300">
      {result.categories.map((row) => <li className="flex items-center justify-between gap-3 py-2.5" key={row.category}>
        <span className="min-w-0 truncate text-xs text-ink-700">{row.category}</span>
        <span className="flex shrink-0 items-center gap-2">
          <span aria-hidden="true" className="flex h-3 items-end gap-0.5">
            <span className="w-1 bg-ink-300" style={{ height: `${Math.max(2, (row.prev4h / Math.max(1, row.last4h, row.prev4h)) * 12)}px` }} />
            <span className="w-1 bg-brand-red" style={{ height: `${Math.max(2, (row.last4h / Math.max(1, row.last4h, row.prev4h)) * 12)}px` }} />
          </span>
          <span className="flex items-center gap-1.5 font-mono text-[11px] text-ink-900">{icon(row.direction)}{formatPercent(row.deltaPct)}</span>
        </span>
      </li>)}
    </ul>}
    <p className="mt-3 font-mono text-[10px] text-ink-400">proyeksi 4 jam ke depan jika laju berlanjut</p>
  </SurfaceCard>;
}

function DiversityPanel({ items }: { items: NewsData['items'] }) {
  const result = computeCategorySourceDiversity(items);
  const max = Math.max(1, ...result.categories.map((row) => row.publisherCount));
  return <SurfaceCard>
    <PanelHead caption="Jumlah publisher berbeda per kategori. Banyak publisher ≠ banyak perspektif." metricId="category-source-diversity" title="Keberagaman Sumber per Kategori" />
    {result.insufficient ? <Empty>Belum ada kategori pada snapshot ini.</Empty> : <ul className="space-y-3">
      {result.categories.map((row) => <li key={row.category}>
        <div className="flex items-center justify-between gap-3 text-xs"><span className="min-w-0 truncate text-ink-700">{row.category}</span><span className="shrink-0 font-mono text-[10px] text-ink-500">{formatNumber(row.itemCount)} artikel</span></div>
        <div aria-label={`${row.category}: ${formatNumber(row.publisherCount)} publisher`} className="mt-1 h-1.5 bg-paper-200" role="img"><div className="h-full bg-brand-red" style={{ width: `${(row.publisherCount / max) * 100}%` }} /></div>
      </li>)}
    </ul>}
  </SurfaceCard>;
}

function StoryClustersPanel({ data }: { data: NewsData }) {
  const result = computeStoryClusters(data.items);
  const [expanded, setExpanded] = useState<string | null>(null);
  const titleById = useMemo(() => new Map(data.items.map((item) => [item.id, item.title])), [data.items]);
  return <SurfaceCard>
    <PanelHead caption="Token judul dengan ambang Jaccard 0,4 — lebih longgar dari halaman depan (0,5)." metricId="story-clusters" title="Klaster Cerita" />
    {result.insufficient ? <Empty>Belum ada klaster berisi lebih dari satu artikel.</Empty> : <ul className="divide-y divide-paper-300">
      {result.clusters.filter((cluster) => cluster.size > 1).slice(0, 10).map((cluster) => {
        const open = expanded === cluster.representativeTitle;
        return <li className="py-2.5" key={cluster.representativeTitle}>
          <button aria-expanded={open} className="flex w-full items-start justify-between gap-3 text-left" onClick={() => setExpanded(open ? null : cluster.representativeTitle)} type="button">
            <span className="min-w-0 text-xs leading-5 text-ink-900">{cluster.representativeTitle}</span>
            <span className="shrink-0 rounded-pill bg-brand-red/10 px-2 py-0.5 font-mono text-[10px] text-brand-red">{formatNumber(cluster.size)} artikel</span>
          </button>
          {open ? <ul className="mt-2 space-y-1 border-l border-paper-300 pl-3">{cluster.ids.map((id) => <li className="text-[11px] leading-5 text-ink-500" key={id}>{titleById.get(id) ?? id}</li>)}</ul> : null}
        </li>;
      })}
    </ul>}
  </SurfaceCard>;
}

function PublishRatePanel({ items, now }: { items: NewsData['items']; now: number }) {
  const result = computeRecentPublishRate(items, now);
  const max = Math.max(1, ...result.publishers.map((row) => row.last6h));
  return <SurfaceCard>
    <PanelHead caption="Aktivitas terbaru per publisher, bukan kualitas atau kepentingan." metricId="recent-publish-rate" title="Laju Publikasi Terbaru" />
    {result.insufficient ? <Empty>Belum ada publisher pada snapshot ini.</Empty> : <ul className="space-y-3">
      {result.publishers.map((row) => <li key={row.publisher}>
        <div className="flex items-center justify-between gap-3 text-xs"><span className="min-w-0 truncate text-ink-700">{row.publisher}</span><span className="shrink-0 font-mono text-[10px] text-ink-500">{formatNumber(row.last1h)} / {formatNumber(row.last6h)}</span></div>
        <div className="mt-1 space-y-0.5">
          <div aria-label={`${row.publisher}, 1 jam: ${formatNumber(row.last1h)}`} className="h-1 bg-paper-200" role="img"><div className="h-full bg-brand-red" style={{ width: `${(row.last1h / max) * 100}%` }} /></div>
          <div aria-label={`${row.publisher}, 6 jam: ${formatNumber(row.last6h)}`} className="h-1 bg-paper-200" role="img"><div className="h-full bg-ink-400" style={{ width: `${(row.last6h / max) * 100}%` }} /></div>
        </div>
      </li>)}
    </ul>}
    <p className="mt-3 font-mono text-[10px] text-ink-400">merah: 1 jam · abu: 6 jam</p>
  </SurfaceCard>;
}

function CompletenessPanel({ items }: { items: NewsData['items'] }) {
  const result = computeSummaryCompleteness(items);
  return <SurfaceCard>
    <PanelHead caption="Artikel dengan ringkasan tidak kosong dari backend." metricId="summary-completeness" title="Kelengkapan Ringkasan" />
    {result.insufficient ? <Empty>Belum ada artikel pada snapshot ini.</Empty> : <>
      <p className="font-mono text-mono-num text-brand-red">{formatPercent(result.pct)}</p>
      <p className="mt-2 font-mono text-[11px] text-ink-500">{formatNumber(result.withSummary)} dari {formatNumber(result.total)} artikel punya ringkasan</p>
    </>}
    <p className="mt-3 flex items-center gap-1 font-mono text-[10px] text-ink-400"><ArrowRight aria-hidden="true" className="size-3" />Ringkasan teknis, bukan ringkasan editorial.</p>
  </SurfaceCard>;
}

export function DashboardMetrics({ data }: { data: NewsData }) {
  const now = resolveNow(data);
  return <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-2">
    <EchoPanel data={data} />
    <HotspotsPanel items={data.items} />
    <HeuristicVelocityPanel items={data.items} now={now} />
    <DiversityPanel items={data.items} />
    <StoryClustersPanel data={data} />
    <PublishRatePanel items={data.items} now={now} />
    <CompletenessPanel items={data.items} />
  </div>;
}
