import type { Metadata } from 'next';
import { PublisherIndexView } from '@/components/features/publisher/PublisherIndexView';
import { BackendRequestError, postNews } from '@/lib/api/server';
import type { NewsData } from '@/lib/types/api';

export const revalidate = 60;
export const metadata: Metadata = {
  title: 'Publisher',
  description: 'Indeks sumber berita dan komunitas dengan statistik kontribusi dan skor reliabilitas.',
};

export default async function PublisherIndexPage() {
  let data: NewsData | null = null;
  try {
    const response = await postNews({
      since: '24h',
      max_items: 200,
    });
    data = response.ok ? response.data : null;
  } catch (error) {
    if (!(error instanceof BackendRequestError)) data = null;
  }

  return <PublisherIndexView initialData={data} />;
}
