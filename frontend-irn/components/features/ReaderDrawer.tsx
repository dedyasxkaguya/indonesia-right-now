'use client';

import { useEffect, useState } from 'react';
import { ArrowUpRight, BookmarkPlus, Copy, ExternalLink, LoaderCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';
import { toast } from 'sonner';
import { BookmarkButton } from '@/components/features/BookmarkButton';
import { ShareButton } from '@/components/ui/ShareButton';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { StateCard } from '@/components/ui/StateCard';
import { fetchUrlClient } from '@/lib/api/client';
import { storage } from '@/lib/storage';
import type { NewsItem } from '@/lib/types/api';

type ReaderDrawerProps = { url: string | null; article?: NewsItem | null; fallbackTitle?: string; onClose: () => void };

export function ReaderDrawer({ url, article, fallbackTitle, onClose }: ReaderDrawerProps) {
  const [title, setTitle] = useState(article?.title ?? fallbackTitle ?? 'Reader');
  const [content, setContent] = useState(article?.content ?? article?.summary ?? '');
  const [loading, setLoading] = useState(false);
  const [cacheHit, setCacheHit] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!url) return;
    const readerUrl = url;
    let active = true;
    setTitle(article?.title ?? fallbackTitle ?? url);
    setContent(article?.content ?? article?.summary ?? '');
    setLoading(true);
    setCacheHit(false);
    setError('');

    async function load() {
      try {
        const cached = await storage.dexie.getReaderCache(readerUrl);
        if (cached) {
          if (!active) return;
          setTitle(cached.title || article?.title || fallbackTitle || readerUrl);
          setContent(cached.content);
          setCacheHit(true);
          return;
        }
        const data = await fetchUrlClient(readerUrl, 'markdown');
        const markdown = data.raw ?? data.news_items.map((item) => `## ${item.title}\n\n${item.snippet ?? ''}`).join('\n\n');
        if (!active) return;
        setTitle(data.title || article?.title || fallbackTitle || readerUrl);
        setContent(markdown);
        await storage.dexie.saveReaderCache({ url: readerUrl, title: data.title, finalUrl: data.final_url, content: markdown, fetchedAt: new Date().toISOString() });
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : 'Konten tidak dapat diambil.');
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => { active = false; };
  }, [article, fallbackTitle, url]);

  async function copyUrl() {
    if (!url) return;
    try { await navigator.clipboard.writeText(url); toast.success('URL disalin.'); } catch { toast.error('URL tidak dapat disalin.'); }
  }

  async function saveToNotebook() {
    if (!url) return;
    try {
      await storage.dexie.saveNote({ url, title, note: content, article: article ?? undefined });
      toast.success('Konten disimpan ke notebook.');
    } catch { toast.error('Konten tidak dapat disimpan di perangkat ini.'); }
  }

  const externalUrl = url && (url.startsWith('http://') || url.startsWith('https://')) ? url : null;

  return <div className="flex h-full min-h-0 flex-col bg-paper-100">
    <header className="border-b border-paper-300 px-5 py-4 sm:px-7">
      <div aria-hidden="true" className={`-mx-5 -mt-4 mb-4 h-0.5 sm:-mx-7 ${loading ? 'animate-pulse bg-brand-red' : 'bg-transparent'}`} />
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0"><p className="font-mono text-[10px] uppercase tracking-[0.14em] text-brand-red">Reader</p><h2 className="mt-1 truncate font-sans text-lg font-semibold text-ink-900">{title}</h2></div>
        <Badge variant={cacheHit ? 'success' : 'neutral'}>{cacheHit ? 'cache · 24 jam' : 'konten publik'}</Badge>
      </div>
      {externalUrl ? <p className="mt-2 truncate font-mono text-[10px] text-ink-500">{externalUrl}</p> : null}
    </header>
    <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-7">
      {loading ? <StateCard variant="loading" title="Mengambil halaman" description="Konten reader diminta melalui proxy backend." /> : null}
      {error ? <StateCard variant="error" title="Konten tidak dapat dimuat" description={error} /> : null}
      {!loading && !error && content ? <article className="prose prose-sm max-w-none font-sans text-ink-700 prose-headings:font-sans prose-a:text-brand-red prose-pre:overflow-x-auto prose-pre:bg-paper-200 prose-code:font-mono">
        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>{content}</ReactMarkdown>
      </article> : null}
      {!loading && !error && !content ? <StateCard variant="empty" title="Konten teks tidak tersedia" description="Backend tidak mengembalikan konten untuk URL ini." /> : null}
    </div>
    <footer className="flex flex-wrap items-center gap-2 border-t border-paper-300 bg-paper-50 px-5 py-3 sm:px-7">
      {article ? <BookmarkButton article={article} /> : null}
      {url ? <ShareButton title={title} url={url} /> : null}
      <Button className="gap-2" onClick={() => void copyUrl()} variant="ghost"><Copy aria-hidden="true" className="size-4" /><span className="sr-only sm:not-sr-only">Salin URL</span></Button>
      <Button className="gap-2" onClick={() => void saveToNotebook()} variant="ghost"><BookmarkPlus aria-hidden="true" className="size-4" /><span className="sr-only sm:not-sr-only">Simpan ke notebook</span></Button>
      {externalUrl ? <a aria-label="Buka sumber di tab baru" className="inline-flex size-10 items-center justify-center rounded-btn text-ink-700 hover:bg-paper-200" href={externalUrl} rel="noreferrer" target="_blank"><ExternalLink aria-hidden="true" className="size-4" /></a> : null}
      <span className="ml-auto" />
      {loading ? <LoaderCircle aria-label="Sedang memuat" className="size-4 animate-spin text-brand-red" /> : null}
      <button className="inline-flex items-center gap-2 px-3 py-2 font-sans text-xs font-semibold text-brand-red hover:bg-paper-200" onClick={onClose} type="button">Tutup <ArrowUpRight aria-hidden="true" className="size-3 rotate-45" /></button>
    </footer>
  </div>;
}
