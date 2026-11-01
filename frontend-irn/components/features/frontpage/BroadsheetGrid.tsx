import Link from 'next/link';
import { ExplainTrigger } from '@/components/features/explain/ExplainTrigger';
import { StateCard } from '@/components/ui/StateCard';
import { formatNumber, formatMinutes } from '@/lib/utils/format';
import { computeLatency } from '@/lib/transformers';
import type { NewsData, NewsItem } from '@/lib/types/api';
import { BroadsheetItem } from '@/components/features/frontpage/BroadsheetItem';

type BroadsheetGridProps = { data: NewsData; items: NewsItem[] };

function groupByPublisher(items: NewsItem[]) {
  const counts = new Map<string, number>();
  for (const item of items) counts.set(item.publisher, (counts.get(item.publisher) ?? 0) + 1);
  return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 5);
}

function SidebarContent({ data, topSources, latency }: { data: NewsData; topSources: [string, number][]; latency: ReturnType<typeof computeLatency> }) {
  return <>
    <div className="mt-4 grid grid-cols-3 gap-3 border-y border-paper-300 py-4">
      <div><p className="font-mono text-[9px] uppercase text-ink-500">Artikel</p><p className="mt-2 font-mono text-xl text-ink-900">{formatNumber(data.stats.items_kept)}<ExplainTrigger className="align-middle" metricId="items-kept" /></p></div>
      <div><p className="font-mono text-[9px] uppercase text-ink-500">Sumber</p><p className="mt-2 font-mono text-xl text-ink-900">{formatNumber(data.stats.sources_ok)}<ExplainTrigger className="align-middle" metricId="source-health" /></p></div>
      <div><p className="font-mono text-[9px] uppercase text-ink-500">Latensi</p><p className="mt-2 font-mono text-sm text-ink-900">{latency.insufficient ? '—' : formatMinutes(latency.median)}<ExplainTrigger className="align-middle" metricId="median-latency" /></p></div>
    </div>
    <h3 className="mb-3 mt-7 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-500">Sumber Aktif</h3>
    <ul className="divide-y divide-paper-300 border-y border-paper-300">{topSources.map(([publisher, count]) => <li className="flex justify-between gap-3 py-2 text-xs text-ink-700" key={publisher}><span className="min-w-0 truncate">{publisher}</span><span className="font-mono text-ink-500">{formatNumber(count)}</span></li>)}</ul>
    <Link className="mt-5 inline-flex items-center gap-2 font-sans text-sm font-semibold text-brand-red underline decoration-paper-300 underline-offset-4 hover:decoration-brand-red" href="/analitik">Lihat analitik lengkap →</Link>
  </>;
}

export function BroadsheetGrid({ data, items }: BroadsheetGridProps) {
  if (!items.length) return <StateCard variant="empty" title="Belum ada berita dalam 24 jam terakhir." description="Feed belum mengembalikan artikel pada snapshot terbaru." action={<Link className="inline-flex min-h-11 items-center border-b border-brand-red px-3 font-sans text-sm font-semibold text-brand-red" href="/hari-ini">Coba lagi</Link>} />;
  const latency = computeLatency(data.items);
  const others = items.slice(9, 20);
  const topSources = groupByPublisher(data.items);
  return <div id="berita-lainnya">
    <div className="grid grid-cols-1 gap-x-8 lg:grid-cols-12">
      {items[0] ? <div className="lg:col-span-6"><BroadsheetItem item={items[0]} size="lead" /></div> : null}
      {items[1] ? <div className="lg:col-span-3"><BroadsheetItem item={items[1]} size="secondary" /></div> : null}
      {items[2] ? <div className="lg:col-span-3"><BroadsheetItem item={items[2]} size="secondary" /></div> : null}
    </div>
    {items.length > 3 ? <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2 lg:grid-cols-12">{items.slice(3, 9).map((item) => <div className="lg:col-span-2" key={item.id}><BroadsheetItem item={item} size="compact" /></div>)}</div> : null}
    <div className="mt-8 grid grid-cols-1 gap-10 border-t border-paper-300 pt-7 lg:grid-cols-12">
      <section className="lg:col-span-8">
        <h2 className="mb-3 font-sans text-h3 text-ink-900">Berita Lainnya</h2>
        <div className="divide-y divide-paper-300">{others.map((item) => <BroadsheetItem item={item} key={item.id} size="compact" />)}</div>
      </section>
      <details className="frontpage-sidebar border-t border-paper-300 pt-4 lg:hidden">
        <summary className="cursor-pointer font-sans text-h3 text-ink-900">Ringkasan dan sumber</summary>
        <SidebarContent data={data} latency={latency} topSources={topSources} />
      </details>
      <aside className="frontpage-sidebar hidden border-t border-paper-300 pt-6 lg:col-span-4 lg:block lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
        <h2 className="font-sans text-h3 text-ink-900">Ringkasan</h2>
        <SidebarContent data={data} latency={latency} topSources={topSources} />
      </aside>
    </div>
  </div>;
}
