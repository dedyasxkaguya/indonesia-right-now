import type { Metadata } from 'next';
import { ArtikelView } from '@/components/features/article/ArtikelView';
import { BackendRequestError, postNews } from '@/lib/api/server';
import type { NewsData } from '@/lib/types/api';

export const revalidate = 60;
export const metadata: Metadata = {
  title: 'Artikel',
  description: 'Jelajahi artikel berita dan diskusi komunitas dari sumber yang tersedia.',
};

export default async function ArtikelPage() {
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

  return <ArtikelView initialData={data} />;
}
