import type { Metadata } from 'next';
import { UrlForm } from '@/components/url-analysis/UrlForm';

export const metadata: Metadata = {
  title: 'Analisis URL',
  description: 'Analisis konten URL publik dan tinjau hasil ekstraksi berita serta kualitas pipeline.',
};

export default function UrlAnalysisPage({ searchParams }: { searchParams: { url?: string | string[] } }) {
  const initialUrl = Array.isArray(searchParams.url) ? searchParams.url[0] ?? '' : searchParams.url ?? '';
  return <div className="mx-auto max-w-7xl px-5 py-12 lg:px-8 lg:py-16">
    <header className="mb-12 border-b border-paper-300 pb-7">
      <p className="font-mono text-eyebrow uppercase text-brand-red">Analisis · 02</p>
      <h1 className="mt-3 font-sans text-h1 text-ink-900">Analisis URL</h1>
      <p className="mt-3 max-w-2xl text-body text-ink-500">Kirim URL publik ke backend dan periksa item berita yang berhasil diekstrak beserta metadata pipeline.</p>
    </header>
    <UrlForm initialUrl={initialUrl} />
  </div>;
}
