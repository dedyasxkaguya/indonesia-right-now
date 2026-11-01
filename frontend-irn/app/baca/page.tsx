'use client';
import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import { StateCard } from '@/components/ui/StateCard';
import { ShareButton } from '@/components/ui/ShareButton';
import { Skeleton } from '@/components/ui/Skeleton';
import { ArrowLeft } from 'lucide-react';

function BacaContent() {
  const params = useSearchParams();
  const router = useRouter();
  const url = params?.get('url');
  const [content, setContent] = useState<string | null>(null);
  const [title, setTitle] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!url) {
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch('/api/fetch', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url, mode: 'markdown', include_raw: true }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.ok && d.data?.raw) {
          setContent(d.data.raw);
          setTitle(d.data.title ?? '');
        } else {
          setError(d.error?.message ?? 'Gagal memuat artikel');
        }
      })
      .catch(() => setError('Gagal memuat artikel'))
      .finally(() => setLoading(false));
  }, [url]);

  if (!url) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <StateCard
          variant="empty"
          title="URL tidak ada"
          description="Pilih artikel dari daftar."
        />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-caption text-ink-500 hover:text-ink-900"
          type="button"
        >
          <ArrowLeft size={16} /> Kembali
        </button>
        <ShareButton title={title} url={url} />
      </div>
      {loading && (
        <div className="space-y-4">
          <Skeleton variant="line" className="h-8 w-3/4" />
          <Skeleton variant="line" count={3} />
          <Skeleton variant="block" className="h-64 w-full" />
        </div>
      )}
      {error && <StateCard variant="error" title="Gagal memuat" description={error} />}
      {!loading && !error && content && (
        <>
          {title && <h1 className="mb-6 text-2xl font-bold">{title}</h1>}
          <article className="prose max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
              {content}
            </ReactMarkdown>
          </article>
        </>
      )}
    </main>
  );
}

export default function BacaPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-3xl px-4 py-6">
          <div className="space-y-4">
            <Skeleton variant="line" className="h-8 w-3/4" />
            <Skeleton variant="line" count={3} />
            <Skeleton variant="block" className="h-64 w-full" />
          </div>
        </main>
      }
    >
      <BacaContent />
    </Suspense>
  );
}