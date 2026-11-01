import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { CoverageDonut } from '@/components/features/publisher/CoverageDonut';
import { PublisherCompareControl } from '@/components/features/publisher/PublisherCompareControl';
import { PublisherArticleList } from '@/components/features/publisher/PublisherArticleList';
import { RelatedPublishers } from '@/components/features/publisher/RelatedPublishers';
import { TrustScorePanel } from '@/components/features/publisher/TrustScorePanel';
import { ExplainTrigger } from '@/components/features/explain/ExplainTrigger';
import { LatencySection } from '@/components/analytics/AnalyticsView';
import { Badge } from '@/components/ui/Badge';
import { StateCard } from '@/components/ui/StateCard';
import { BackendRequestError, getNews } from '@/lib/api/server';
import { computeTrustScore } from '@/lib/transformers';
import type { NewsData } from '@/lib/types/api';

export const revalidate = 60;
export const dynamicParams = true;

type PageProps = { params: { domain: string } };

export async function generateStaticParams(): Promise<{ domain: string }[]> {
  try {
    const response = await getNews('since=24h&max_items=200');
    if (!response.ok || !response.data) return [];
    const counts = new Map<string, number>();
    for (const item of response.data.items) counts.set(item.publisher_domain, (counts.get(item.publisher_domain) ?? 0) + 1);
    return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 20).map(([domain]) => ({ domain }));
  } catch { return []; }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  return { title: `Publisher ${params.domain}`, description: `Profil feed, kategori, dan latensi ${params.domain}.` };
}

function PublisherProfile({ domain, data }: { domain: string; data: NewsData }) {
  const items = data.items.filter((item) => item.publisher_domain === domain).sort((a, b) => Date.parse(b.published_at) - Date.parse(a.published_at) || a.title.localeCompare(b.title));
  if (!items.length) return <div className="mx-auto max-w-7xl px-5 py-16 lg:px-8"><StateCard variant="empty" title={`Publisher ${domain} tidak aktif dalam 24 jam terakhir.`} description="Profil hanya tersedia untuk publisher yang ada di snapshot terbaru." action={<Link className="inline-flex min-h-11 items-center gap-2 border-b border-brand-red px-3 font-sans text-sm font-semibold text-brand-red" href="/analitik">Kembali ke analitik <ArrowUpRight aria-hidden="true" className="size-4" /></Link>} /></div>;

  const publisher = items[0].publisher;
  const score = computeTrustScore(domain, data.items, data.sources);
  const publisherSources = data.sources.filter((source) => source.url.includes(domain) || source.publisher === domain);
  const healthy = publisherSources.filter((source) => source.status === 'ok').length;
  const status = publisherSources.length === 0 ? 'unknown' : healthy === publisherSources.length ? 'ok' : 'error';
  const validDomain = /^[a-z0-9.-]+$/i.test(domain);
  const compareOptions = [...new Map(data.items.map((item) => [item.publisher_domain, { domain: item.publisher_domain, name: item.publisher }])).values()];

  return <div className="mx-auto max-w-7xl px-5 py-12 lg:px-8 lg:py-16">
    <header className="mb-10 border-b border-paper-300 pb-7">
      <p className="font-mono text-eyebrow uppercase text-brand-red">Profil Publisher · 08</p>
      <h1 className="mt-3 font-sans text-h1 text-ink-900">{publisher}</h1>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <span className="font-mono text-xs text-ink-500">{domain}</span>
        {validDomain ? <a aria-label={`Buka ${domain}`} className="inline-flex size-7 items-center justify-center rounded-btn text-ink-500 hover:bg-paper-200 hover:text-brand-red" href={`https://${domain}`} rel="noreferrer" target="_blank"><ArrowUpRight aria-hidden="true" className="size-4" /></a> : null}
        <Badge variant={status === 'ok' ? 'success' : status === 'error' ? 'danger' : 'neutral'}>{status === 'ok' ? 'Sehat' : status === 'error' ? 'Gagal' : 'Tidak diketahui'}</Badge>
        <span className="flex items-center gap-1 font-mono text-xs text-ink-500">{items.length} artikel <ExplainTrigger context={{ publisherDomain: domain }} metricId="items-kept" /> · {data.date}</span>
        <ExplainTrigger context={{ publisherDomain: domain }} metricId="trust-score" />
        <PublisherCompareControl currentDomain={domain} options={compareOptions} />
      </div>
    </header>
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
      <div className="lg:col-span-5"><TrustScorePanel score={score} /><section className="mt-8"><div className="mb-4 flex items-center gap-1"><h2 className="font-sans text-h3 text-ink-900">Cakupan kategori</h2><ExplainTrigger context={{ publisherDomain: domain }} metricId="publisher-coverage" /></div><CoverageDonut items={items} /></section></div>
      <div className="space-y-10 lg:col-span-7"><section><h2 className="mb-4 font-sans text-h3 text-ink-900">Latensi terbit ke fetch</h2><LatencySection items={items} /></section><RelatedPublishers domain={domain} items={data.items} /></div>
      <section className="lg:col-span-12"><PublisherArticleList items={items} /></section>
    </div>
  </div>;
}

export default async function PublisherPage({ params }: PageProps) {
  try {
    const response = await getNews('since=24h&max_items=200');
    if (response.ok && response.data) return <PublisherProfile data={response.data} domain={params.domain} />;
    return <div className="mx-auto max-w-7xl px-5 py-16 lg:px-8"><StateCard variant="empty" title={`Publisher ${params.domain} tidak aktif dalam 24 jam terakhir.`} description={response.error?.message ?? 'Snapshot feed belum menyediakan publisher ini.'} /></div>;
  } catch (error) {
    const message = error instanceof BackendRequestError ? error.message : 'Layanan berita tidak dapat dijangkau.';
    return <div className="mx-auto max-w-7xl px-5 py-16 lg:px-8"><StateCard variant="error" title="Profil publisher tidak dapat dimuat" description={message} /></div>;
  }
}
