import type { Metadata } from 'next';
import { DashboardView } from '@/components/dashboard/DashboardView';
import { BackendRequestError, getNews } from '@/lib/api/server';
import type { NewsData } from '@/lib/types/api';

type DashboardSearchParams = { since?: string | string[]; category?: string | string[]; categories?: string | string[]; cat?: string | string[]; publisher?: string | string[]; publishers?: string | string[]; pub?: string | string[] };

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Pantau aliran berita, kesehatan sumber, dan distribusi sumber dari feed terkini.',
};

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function listValue(value: string | string[] | undefined): string[] {
  const values = Array.isArray(value) ? value : [value ?? ''];
  return values.flatMap((entry) => entry.split(',')).map((entry) => entry.trim()).filter(Boolean);
}

export default async function DashboardPage({ searchParams }: { searchParams: DashboardSearchParams }) {
  const allowedSince = new Set(['24h', '7d', '30d']);
  const requestedSince = firstValue(searchParams.since) ?? '24h';
  const since = allowedSince.has(requestedSince) ? requestedSince : '24h';
  const categories = listValue(searchParams.category ?? searchParams.cat ?? searchParams.categories);
  const publishers = listValue(searchParams.publisher ?? searchParams.pub ?? searchParams.publishers);
  const params = new URLSearchParams({ since, max_items: '200' });

  let initialData: NewsData | null = null;
  let initialError: { code: string; message: string } | null = null;
  try {
    const response = await getNews(params.toString());
    initialData = response.ok ? response.data : null;
    initialError = response.error;
  } catch (error) {
    initialError = error instanceof BackendRequestError
      ? { code: error.code, message: error.message }
      : { code: 'BACKEND_OFFLINE', message: 'Layanan berita tidak dapat dijangkau. Coba lagi beberapa saat lagi.' };
  }

  return <DashboardView initialData={initialData} initialError={initialError} initialSince={since} initialCategories={categories} initialPublishers={publishers} />;
}
