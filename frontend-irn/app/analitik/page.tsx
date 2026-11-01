import Link from 'next/link';
import type { Metadata } from 'next';
import { AnalyticsView } from '@/components/analytics/AnalyticsView';
import type { AnalyticsTimeRange } from '@/components/analytics/TimeRangeToggle';
import { StateCard } from '@/components/ui/StateCard';
import { BackendRequestError, getNews } from '@/lib/api/server';

export const revalidate = 60;
export const metadata: Metadata = {
  title: 'Analitik',
  description: 'Snapshot kesehatan sumber, distribusi berita, dan latensi feed.',
};

export default async function AnalyticsPage({ searchParams }: { searchParams: { since?: string | string[] } }) {
  const requestedSince = Array.isArray(searchParams.since) ? searchParams.since[0] : searchParams.since;
  const since: AnalyticsTimeRange = requestedSince === '12h' || requestedSince === '72h' ? requestedSince : '24h';
  try {
    const response = await getNews(new URLSearchParams({ since, max_items: '200' }).toString());
    if (!response.ok || !response.data) {
      return <div className="mx-auto max-w-7xl px-5 py-16 lg:px-8"><StateCard variant="empty" title="Snapshot analitik belum tersedia" description={response.error?.message ?? 'Belum ada data feed untuk dianalisis.'} action={<Link className="inline-flex min-h-11 items-center rounded-btn border border-paper-300 bg-paper-50 px-5 py-3 text-sm font-semibold text-ink-900 hover:bg-paper-200" href="/analitik">Muat ulang</Link>} /></div>;
    }
    return <AnalyticsView data={response.data} since={since} />;
  } catch (error) {
    const message = error instanceof BackendRequestError ? error.message : 'Layanan berita tidak dapat dijangkau. Coba lagi beberapa saat lagi.';
    return <div className="mx-auto max-w-7xl px-5 py-16 lg:px-8"><StateCard variant="error" title="Data analitik tidak dapat dimuat" description={message} action={<Link className="inline-flex min-h-11 items-center rounded-btn border border-paper-300 bg-paper-50 px-5 py-3 text-sm font-semibold text-ink-900 hover:bg-paper-200" href="/analitik">Coba lagi</Link>} /></div>;
  }
}
