'use client';

import { useRouter } from 'next/navigation';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  LabelList,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ArrowDown, ArrowUp, Minus } from 'lucide-react';
import { ExplainTrigger } from '@/components/features/explain/ExplainTrigger';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { formatMinutes, formatNumber, formatPercent } from '@/lib/utils/format';
import {
  computeCategoryAffinity,
  computeCategorySourceDiversity,
  computeCrossSourceEcho,
  computeDateConfidenceDistribution,
  computeHeadlineLength,
  computeHeuristicVelocity,
  computePublisherAffinity,
  computePublisherErrorRecovery,
  computeRecentPublishRate,
  computeSourceFreshness,
  computeTrendForecast,
  computeTrustScore,
} from '@/lib/transformers';
import type { NewsData } from '@/lib/types/api';

const CONTAINER_BG = '#FDFBF6';

function resolveNow(data: NewsData): number {
  const generated = Date.parse(data.generated_at);
  if (Number.isFinite(generated)) return generated;
  const itemTimes = data.items.map((item) => Date.parse(item.published_at)).filter(Number.isFinite);
  return itemTimes.length ? Math.max(...itemTimes) : 0;
}

function SectionHead({ title, caption, metricId }: { title: string; caption: string; metricId: string }) {
  return <div className="mb-5">
    <div className="flex items-center gap-1"><h2 className="font-sans text-h3 text-ink-900">{title}</h2><ExplainTrigger metricId={metricId} /></div>
    <p className="mt-1 text-xs text-ink-500">{caption}</p>
  </div>;
}

function Empty({ children }: { children: string }) {
  return <p className="text-xs text-ink-500">{children}</p>;
}

export function SourceFreshnessSection({ data }: { data: NewsData }) {
  const result = computeSourceFreshness(data.sources, data.items);
  return <section className="border-t border-paper-300 pt-7">
    <SectionHead caption="Median jeda publish ke fetch per sumber berstatus ok." metricId="source-freshness" title="Kesegaran Sumber" />
    {result.insufficient ? <Empty>Belum ada sumber dengan timestamp yang dapat dihitung.</Empty> : <ul className="grid min-w-0 grid-cols-1 gap-2 sm:block sm:divide-y sm:border-y sm:border-paper-300">
      {result.sources.map((row) => <li className="min-w-0 flex flex-wrap items-center justify-between gap-2 border border-paper-300 bg-paper-50 p-3 sm:border-0 sm:bg-transparent sm:px-0 sm:py-2.5" key={row.sourceUrl}>
        <span className="min-w-0 flex-1 truncate text-xs text-ink-700">{row.publisher}</span>
        <span className="ml-auto font-mono text-[11px] text-ink-900">{formatMinutes(row.medianMinutes)}</span>
        <span className="w-20 text-right font-mono text-[10px] text-ink-400">{formatNumber(row.itemCount)} item</span>
      </li>)}
    </ul>}
  </section>;
}

export function CategoryAffinitySection({ items }: { items: NewsData['items'] }) {
  const result = computeCategoryAffinity(items);
  return <section className="border-t border-paper-300 pt-7">
    <SectionHead caption="Co-occurrence dalam satu artikel, bukan korelasi statistik." metricId="category-affinity" title="Afinitas Kategori" />
    {result.insufficient ? <Empty>Belum ada artikel dengan dua kategori atau lebih.</Empty> : <ul className="grid gap-x-8 gap-y-2 sm:grid-cols-2">
      {result.pairs.map((pair) => <li className="flex items-center justify-between gap-3 border-b border-paper-300 py-1.5" key={`${pair.a}:${pair.b}`}>
        <span className="min-w-0 truncate text-xs text-ink-700">{pair.a} + {pair.b}</span>
        <span className="shrink-0 font-mono text-[10px] text-ink-500">{formatNumber(pair.count)}</span>
      </li>)}
    </ul>}
  </section>;
}

export function PublisherAffinitySection({ items }: { items: NewsData['items'] }) {
  const result = computePublisherAffinity(items);
  return <section className="border-t border-paper-300 pt-7">
    <SectionHead caption="Berdasarkan kategori yang keduanya liput, bukan volume atau kesamaan editorial." metricId="publisher-affinity" title="Afinitas Publisher" />
    {result.insufficient ? <Empty>Belum ada dua publisher yang berbagi kategori.</Empty> : <ul className="divide-y divide-paper-300 border-y border-paper-300">
      {result.pairs.map((pair) => <li className="flex flex-wrap items-center gap-2 py-2.5" key={`${pair.a}:${pair.b}`}>
        <span className="text-xs font-semibold text-ink-900">{pair.a} ↔ {pair.b}</span>
        <span className="flex flex-wrap gap-1">{pair.sharedCategories.map((category) => <span className="rounded-pill bg-brand-ochre/10 px-2 py-0.5 font-mono text-[10px] text-brand-ochre" key={`${pair.a}:${pair.b}:${category}`}>{category}</span>)}</span>
        <span className="ml-auto font-mono text-[10px] text-ink-500">{formatNumber(pair.weight)}</span>
      </li>)}
    </ul>}
  </section>;
}

export function TrendForecastSection({ items, now }: { items: NewsData['items']; now: number }) {
  const result = computeTrendForecast(items, now);
  const chart: { label: string; actual: number | null; projected: number | null }[] = result.actuals.map((point) => ({ label: String(point.hour), actual: point.count, projected: null }));
  chart.push({ label: '13', actual: null, projected: result.projectedNextHour });
  return <section className="border-t border-paper-300 pt-7">
    <SectionHead caption="Regresi linear sederhana atas 12 jam terakhir; indikator arah, bukan prediksi." metricId="heuristic-trend-forecast" title="Tren 12 Jam" />
    {result.insufficient ? <Empty>Butuh setidaknya tiga jam dengan artikel di dalam jendela 12 jam.</Empty> : <>
      <div aria-label="Jumlah artikel per jam dan proyeksi satu jam ke depan" className="h-56" role="img">
        <ResponsiveContainer height="100%" width="100%">
          <ComposedChart data={chart} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
            <CartesianGrid stroke="#EDE8DF" strokeDasharray="2 4" vertical={false} />
            <XAxis dataKey="label" fontSize={9} stroke="#8C8882" tickLine={false} />
            <YAxis allowDecimals={false} fontSize={9} stroke="#8C8882" tickLine={false} width={36} />
            <Tooltip contentStyle={{ background: CONTAINER_BG, border: '1px solid #D9D2C4', fontFamily: 'var(--font-mono)', fontSize: 11 }} />
            <Line connectNulls={false} dataKey="actual" dot={false} isAnimationActive={false} name="Aktual" stroke="#D32F2F" strokeWidth={2} type="monotone" />
            <Line connectNulls={false} dataKey="projected" dot={{ r: 3, fill: CONTAINER_BG, stroke: '#D32F2F', strokeWidth: 2 }} isAnimationActive={false} name="Proyeksi" stroke="#D32F2F" strokeDasharray="4 4" strokeWidth={1.5} type="monotone" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 font-mono text-[10px] text-ink-400">Heuristik — proyeksi, bukan prediksi. Proyeksi jam ke-13: {result.projectedNextHour.toLocaleString('id-ID', { maximumFractionDigits: 1 })} artikel.</p>
    </>}
  </section>;
}

export function HeadlineLengthSection({ items }: { items: NewsData['items'] }) {
  const result = computeHeadlineLength(items);
  return <section className="border-t border-paper-300 pt-7">
    <SectionHead caption="Rata-rata kata per judul, bukan panjang karakter." metricId="headline-length-pattern" title="Panjang Judul per Kategori" />
    {result.insufficient ? <Empty>Belum ada judul pada snapshot ini.</Empty> : <>
      <ul className="space-y-2 sm:hidden">{result.categories.map((row) => <li className="border border-paper-300 bg-paper-50 p-3" key={row.category}>
        <h3 className="font-sans text-sm font-semibold text-ink-900">{row.category}</h3>
        <div className="mt-2 flex items-baseline justify-between gap-3"><span className="text-xs text-ink-500">Rata-rata kata</span><span className="font-mono text-sm text-ink-900">{row.meanWords.toLocaleString('id-ID', { maximumFractionDigits: 1 })}</span></div>
        <p className="mt-1 text-right font-mono text-[10px] text-ink-500">n = {formatNumber(row.n)}</p>
      </li>)}</ul>
      <div className="hidden overflow-x-auto border-y border-paper-300 sm:block">
        <table className="w-full min-w-[420px] border-collapse text-left text-xs"><thead><tr className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-500"><th className="py-3 pr-4 font-medium">Kategori</th><th className="py-3 pr-4 text-right font-medium">Rata-rata kata</th><th className="py-3 text-right font-medium">n</th></tr></thead><tbody>{result.categories.map((row) => <tr className="border-t border-paper-300" key={row.category}><td className="py-2.5 pr-4 text-ink-700">{row.category}</td><td className="py-2.5 pr-4 text-right font-mono text-ink-900">{row.meanWords.toLocaleString('id-ID', { maximumFractionDigits: 1 })}</td><td className="py-2.5 text-right font-mono text-ink-500">{formatNumber(row.n)}</td></tr>)}</tbody></table>
      </div>
    </>}
  </section>;
}

const CONFIDENCE_COLORS = { exact: '#D32F2F', approx: '#B45309', unknown: '#8C8882' };

export function DateConfidenceSection({ items }: { items: NewsData['items'] }) {
  const result = computeDateConfidenceDistribution(items);
  const chart = [
    { name: 'exact', value: result.exact, pct: result.pctExact, color: CONFIDENCE_COLORS.exact },
    { name: 'approx', value: result.approx, pct: result.pctApprox, color: CONFIDENCE_COLORS.approx },
    { name: 'unknown', value: result.unknown, pct: result.pctUnknown, color: CONFIDENCE_COLORS.unknown },
  ];
  return <section className="border-t border-paper-300 pt-7">
    <SectionHead caption="approx berarti tanggal terbit adalah perkiraan; unknown = tidak tersedia." metricId="date-confidence-distribution" title="Distribusi Keyakinan Tanggal" />
    {result.insufficient ? <Empty>Belum ada artikel pada snapshot ini.</Empty> : <div className="grid grid-cols-1 items-center gap-6 sm:grid-cols-2">
      <div aria-label="Donut distribusi keyakinan tanggal" className="h-44" role="img">
        <ResponsiveContainer height="100%" width="100%">
          <PieChart>
            <Pie data={chart} dataKey="value" innerRadius={38} isAnimationActive={false} nameKey="name" outerRadius={62}>
              {chart.map((row) => <Cell fill={row.color} key={row.name} />)}
            </Pie>
            <Tooltip contentStyle={{ background: CONTAINER_BG, border: '1px solid #D9D2C4', fontFamily: 'var(--font-mono)', fontSize: 11 }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="space-y-2">
        {chart.map((row) => <li className="flex items-center justify-between gap-3 text-xs" key={row.name}>
          <span className="flex items-center gap-2 text-ink-700"><span aria-hidden="true" className="size-2 rounded-full" style={{ background: row.color }} />{row.name}</span>
          <span className="font-mono text-ink-900">{formatNumber(row.value)} · {formatPercent(row.pct)}</span>
        </li>)}
      </ul>
    </div>}
  </section>;
}

export function PublisherErrorRecoverySection({ data }: { data: NewsData }) {
  const result = computePublisherErrorRecovery(data.sources);
  return <section className="border-t border-paper-300 pt-7">
    <SectionHead caption="Error code dari backend untuk sumber yang gagal pada snapshot ini." metricId="publisher-error-recovery" title="Kode Error Sumber" />
    {result.insufficient ? <Empty>Tidak ada sumber berstatus error pada snapshot ini.</Empty> : <div className="overflow-x-auto border-y border-paper-300">
      <table className="w-full min-w-[480px] border-collapse text-left text-xs"><thead><tr className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-500"><th className="py-3 pr-2 font-medium">Kode</th><th className="py-3 pr-2 text-right font-medium">Jumlah</th><th className="py-3 font-medium">Publisher terdampak</th></tr></thead><tbody>{result.codes.map((row) => <tr className="border-t border-paper-300" key={row.code}><td className="py-2.5 pr-2 font-mono text-ink-900">{row.code}</td><td className="py-2.5 pr-2 text-right font-mono text-ink-900">{formatNumber(row.count)}</td><td className="py-2.5"><span className="flex flex-wrap gap-1">{row.publishers.map((publisher) => <span className="rounded-pill bg-paper-200 px-2 py-0.5 font-mono text-[10px] text-ink-700" key={`${row.code}:${publisher}`}>{publisher}</span>)}</span></td></tr>)}</tbody></table>
    </div>}
  </section>;
}

export function SupportingAnalytics({ data, now }: { data: NewsData; now?: number }) {
  const reference = now ?? resolveNow(data);
  return <div className="space-y-12">
    <CategoryAffinitySection items={data.items} />
    <PublisherAffinitySection items={data.items} />
    <TrendForecastSection items={data.items} now={reference} />
    <HeadlineLengthSection items={data.items} />
    {/* Date confidence and error code sections are hidden from the UI; their components remain available. */}
  </div>;
}

function EchoHealthPanel({ data }: { data: NewsData }) {
  const echo = computeCrossSourceEcho(data.items);
  const counts = new Map<string, number>();
  for (const cluster of echo.echoes) for (const publisher of cluster.publishers) counts.set(publisher, (counts.get(publisher) ?? 0) + 1);
  const points = [...counts.entries()].map(([publisher, echoCount]) => {
    const sources = data.sources.filter((source) => source.publisher === publisher);
    const failed = sources.length > 0 && sources.every((source) => source.status === 'error');
    return { publisher, label: publisher.length > 14 ? `${publisher.slice(0, 14)}…` : publisher, echoCount, health: failed ? 0 : 1, status: failed ? 'error' : 'ok' };
  }).sort((a, b) => b.echoCount - a.echoCount || a.publisher.localeCompare(b.publisher));
  return <SurfaceCard>
    <div className="mb-4"><div className="flex items-center gap-1"><h3 className="font-sans text-h3 text-ink-900">Gema × Kesehatan Sumber</h3><ExplainTrigger metricId="cross-source-echo" /></div><p className="mt-1 text-xs text-ink-500">Jumlah gema per publisher dan status sumbernya saat snapshot.</p></div>
    {echo.insufficient || points.length < 2 ? <Empty>Butuh setidaknya dua publisher dengan data gema.</Empty> : <div aria-label="Sebaran jumlah gema per publisher dan status kesehatan sumber" className="h-56" role="img">
      <ResponsiveContainer height="100%" width="100%">
        <ScatterChart margin={{ top: 12, right: 16, bottom: 28, left: -12 }}>
          <CartesianGrid stroke="#EDE8DF" strokeDasharray="2 4" />
          <XAxis allowDecimals={false} dataKey="echoCount" fontSize={9} name="Gema" stroke="#8C8882" tickLine={false} type="number" />
          <YAxis dataKey="health" domain={[0, 1]} fontSize={9} name="Status" stroke="#8C8882" tickFormatter={(value: number) => value === 1 ? 'ok' : 'error'} tickLine={false} ticks={[0, 1]} type="number" width={40} />
          <Tooltip contentStyle={{ background: CONTAINER_BG, border: '1px solid #D9D2C4', fontFamily: 'var(--font-mono)', fontSize: 11 }} />
          <Scatter data={points} dataKey="health" isAnimationActive={false}>
            <LabelList dataKey="label" position="bottom" style={{ fontSize: 9, fontFamily: 'var(--font-mono)', fill: '#5C5852' }} />
            {points.map((point) => <Cell fill={point.status === 'ok' ? '#15803D' : '#B91C1C'} key={point.publisher} />)}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>}
    <p className="mt-2 font-mono text-[10px] text-ink-400">Jendela: snapshot saat ini · hijau = ok, merah = error</p>
  </SurfaceCard>;
}

function VelocityDiversityPanel({ data, now }: { data: NewsData; now: number }) {
  const router = useRouter();
  const velocity = computeHeuristicVelocity(data.items, now);
  const diversity = computeCategorySourceDiversity(data.items);
  const rows = velocity.categories.slice(0, 5).map((row) => ({
    ...row,
    publisherCount: diversity.categories.find((entry) => entry.category === row.category)?.publisherCount ?? 0,
  }));
  const icon = (direction: 'up' | 'down' | 'flat') => direction === 'up' ? <ArrowUp aria-hidden="true" className="size-3 text-brand-red" /> : direction === 'down' ? <ArrowDown aria-hidden="true" className="size-3 text-ink-500" /> : <Minus aria-hidden="true" className="size-3 text-ink-400" />;
  return <SurfaceCard>
    <div className="mb-4"><div className="flex items-center gap-1"><h3 className="font-sans text-h3 text-ink-900">Kecepatan × Keberagaman</h3><ExplainTrigger metricId="heuristic-velocity" /><ExplainTrigger metricId="category-source-diversity" /></div><p className="mt-1 text-xs text-ink-500">Kategori teratas menurut perubahan 4 jam, dengan jumlah publisher peliput.</p></div>
    {velocity.insufficient || rows.length === 0 ? <Empty>Belum ada kategori yang dapat dibandingkan.</Empty> : <table className="w-full border-collapse text-left text-xs"><thead><tr className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-500"><th className="py-2 pr-2 font-medium">Kategori</th><th className="py-2 pr-2 text-right font-medium">Δ%</th><th className="py-2 text-right font-medium">Publisher</th></tr></thead><tbody>{rows.map((row) => <tr className="cursor-pointer border-t border-paper-300 hover:bg-paper-100" key={row.category} onClick={() => router.push(`/dashboard?cat=${encodeURIComponent(row.category)}`)}>
        <td className="py-2.5 pr-2 text-ink-700">{row.category}</td>
        <td className="py-2.5 pr-2 text-right font-mono text-ink-900"><span className="inline-flex items-center gap-1">{icon(row.direction)}{formatPercent(row.deltaPct)}</span></td>
        <td className="py-2.5 text-right font-mono text-ink-500">{formatNumber(row.publisherCount)}</td>
      </tr>)}</tbody></table>}
    <p className="mt-2 font-mono text-[10px] text-ink-400">Jendela: 4 jam vs 4 jam sebelumnya · klik baris untuk membuka dashboard terfilter</p>
  </SurfaceCard>;
}

function TrustRatePanel({ data, now }: { data: NewsData; now: number }) {
  const recent = computeRecentPublishRate(data.items, now);
  const rows = recent.publishers.slice(0, 5).map((row) => {
    const domain = data.items.find((item) => item.publisher === row.publisher)?.publisher_domain;
    const trust = domain ? computeTrustScore(domain, data.items, data.sources) : null;
    return { publisher: row.publisher, last1h: row.last1h, last6h: row.last6h, trust: trust && !trust.insufficient ? trust.score : 0, insufficient: !trust || trust.insufficient };
  });
  const max1h = Math.max(1, ...rows.map((row) => row.last1h));
  const chart = rows.map((row) => ({ ...row, label: row.publisher.length > 14 ? `${row.publisher.slice(0, 14)}…` : row.publisher, rate: (row.last1h / max1h) * 100 }));
  const insufficient = recent.insufficient || rows.every((row) => row.insufficient);
  return <SurfaceCard>
    <div className="mb-4"><div className="flex items-center gap-1"><h3 className="font-sans text-h3 text-ink-900">Kepercayaan × Laju Publikasi</h3><ExplainTrigger metricId="trust-score" /><ExplainTrigger metricId="recent-publish-rate" /></div><p className="mt-1 text-xs text-ink-500">Skor kepercayaan (0–100) dibanding laju publikasi 1 jam terakhir yang dinormalisasi.</p></div>
    {insufficient ? <Empty>Skor kepercayaan atau laju publikasi belum tersedia.</Empty> : <div aria-label="Perbandingan skor kepercayaan dan laju publikasi per publisher" className="h-56" role="img">
      <ResponsiveContainer height="100%" width="100%">
        <BarChart data={chart} margin={{ top: 8, right: 8, bottom: 28, left: 0 }}>
          <CartesianGrid stroke="#EDE8DF" strokeDasharray="2 4" vertical={false} />
          <XAxis dataKey="label" fontSize={8} interval={0} stroke="#8C8882" tickLine={false} />
          <YAxis domain={[0, 100]} fontSize={9} stroke="#8C8882" tickLine={false} width={40} />
          <Tooltip contentStyle={{ background: CONTAINER_BG, border: '1px solid #D9D2C4', fontFamily: 'var(--font-mono)', fontSize: 11 }} />
          <Bar dataKey="trust" fill="#D32F2F" isAnimationActive={false} name="Kepercayaan" />
          <Bar dataKey="rate" fill="#8C8882" isAnimationActive={false} name="Laju 1 jam" />
        </BarChart>
      </ResponsiveContainer>
    </div>}
    <p className="mt-2 font-mono text-[10px] text-ink-400">Jendela: 1 jam terakhir · merah = kepercayaan, abu = laju ternormalisasi</p>
  </SurfaceCard>;
}

export function CorrelationSection({ data, now }: { data: NewsData; now?: number }) {
  const reference = now ?? resolveNow(data);
  return <section className="border-t border-paper-300 pt-7">
    <div className="mb-5 flex items-center gap-1"><h2 className="font-sans text-h3 text-ink-900">Korelasi Lintas Fitur</h2><ExplainTrigger metricId="cross-source-echo" /></div>
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <EchoHealthPanel data={data} />
      <VelocityDiversityPanel data={data} now={reference} />
      <TrustRatePanel data={data} now={reference} />
    </div>
  </section>;
}
