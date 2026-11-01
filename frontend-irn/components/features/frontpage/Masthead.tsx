import { ExplainTrigger } from '@/components/features/explain/ExplainTrigger';

export function Masthead({ date, items, sources, since = '24h' }: { date: string; items: number; sources: number; since?: string }) {
  const parsed = new Date(`${date}T12:00:00+07:00`);
  const formatted = Number.isFinite(parsed.getTime()) ? new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' }).format(parsed) : date;
  const rangeLabel = since === '7d' ? '7 hari' : since === '30d' ? '30 hari' : '24 jam';
  return <header className="mb-10">
    <p className="font-mono text-eyebrow uppercase tracking-[0.14em] text-ink-500">{formatted}</p>
    <h1 className="mt-3 font-sans text-[28px] text-ink-900 sm:text-[32px]">Hari Ini</h1>
    <div aria-hidden="true" className="mt-6 h-0.5 w-full bg-brand-red" />
    <p className="mt-3 flex flex-wrap items-center gap-1 font-mono text-caption text-ink-500">Edisi {rangeLabel} terakhir · {items.toLocaleString('id-ID')} artikel <ExplainTrigger metricId="items-kept" /> dari {sources.toLocaleString('id-ID')} sumber <ExplainTrigger metricId="publisher-count" /></p>
  </header>;
}
