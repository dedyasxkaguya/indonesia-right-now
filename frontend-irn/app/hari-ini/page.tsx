import type { Metadata } from 'next';
import { FrontPageView } from '@/components/features/frontpage/FrontPageView';
import { BackendRequestError, postNews } from '@/lib/api/server';
import type { NewsData } from '@/lib/types/api';

export const revalidate = 60;
export const metadata: Metadata = {
  title: 'Hari Ini',
  description: 'Edisi broadsheet 24 jam terakhir dari feed berita yang tersedia.',
};

type PageProps = { searchParams: { mode?: string | string[]; since?: string | string[] } };

export default async function TodayPage({ searchParams }: PageProps) {
  const printMode = (Array.isArray(searchParams.mode) ? searchParams.mode[0] : searchParams.mode) === 'print';
  const requestedSince = Array.isArray(searchParams.since) ? searchParams.since[0] : searchParams.since;
  const since = requestedSince === '7d' || requestedSince === '30d' ? requestedSince : '24h';
  let data: NewsData | null = null;
  try { const response = await postNews({ since, max_items: 200 }); data = response.ok ? response.data : null; }
  catch (error) { if (!(error instanceof BackendRequestError)) data = null; }
  return <FrontPageView data={data} printMode={printMode} since={since} />;
}
