'use client';

import Fuse from 'fuse.js';
import useSWR from 'swr';
import { useMemo, useState } from 'react';
import { Archive, BookmarkX, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { StateCard } from '@/components/ui/StateCard';
import { useDrawer } from '@/components/layout/DrawerProvider';
import { useBookmarks } from '@/hooks/useBookmarks';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useRouter } from 'next/navigation';
import { fetchNewsClient } from '@/lib/api/client';
import { formatDateTime } from '@/lib/utils/format';
import { getNewsItemSnippet } from '@/lib/api/news-item';
import { NewsItemSourceMeta } from '@/components/features/news/NewsItemSourceMeta';
import type { NewsData, NewsResponse } from '@/lib/types/api';
import type { NotebookEntry } from '@/lib/types/storage';

type SortMode = 'newest' | 'oldest' | 'title';

export function SavedArticlesView() {
  const bookmarks = useBookmarks();
  const { openReader } = useDrawer();
const isMobile = useIsMobile();
const router = useRouter();
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortMode>('newest');
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const { data: feedResponse } = useSWR<NewsResponse, Error>('/api/news?since=24h&max_items=200', fetchNewsClient, { revalidateOnFocus: false, shouldRetryOnError: false });
  const feed = feedResponse?.data ?? null;

  const fuse = useMemo(() => new Fuse(bookmarks.bookmarks, {
    keys: ['title', 'article.summary', 'article.publisher'],
    threshold: 0.35,
    ignoreLocation: true,
  }), [bookmarks.bookmarks]);
  const entries = useMemo(() => {
    const found = query.trim() ? fuse.search(query).map((result) => result.item) : [...bookmarks.bookmarks];
    return found.sort((a, b) => sort === 'title' ? a.title.localeCompare(b.title, 'id') : sort === 'oldest' ? a.savedAt.localeCompare(b.savedAt) : b.savedAt.localeCompare(a.savedAt));
  }, [fuse, query, sort, bookmarks.bookmarks]);

  async function removeSelected() {
    try {
      await bookmarks.removeMany([...selected]);
      setSelected(new Set());
      toast.success('Artikel terpilih dihapus dari tersimpan.');
    } catch { toast.error('Artikel tidak dapat dihapus.'); }
  }

  function selectVisible(checked: boolean) {
    setSelected((current) => {
      const next = new Set(current);
      for (const entry of entries) checked ? next.add(entry.url) : next.delete(entry.url);
      return next;
    });
  }

  const feedUrls = new Set(feed?.items.map((item) => item.url) ?? []);
  const feedIds = new Set(feed?.items.map((item) => item.id) ?? []);
  const isArchived = (entry: NotebookEntry) => Boolean(feed) && !feedUrls.has(entry.url) && !feedIds.has(entry.article?.id ?? '');

  return <div className="mx-auto max-w-7xl px-5 py-12 lg:px-8 lg:py-16">
    <header className="mb-10 flex flex-col justify-between gap-5 border-b border-paper-300 pb-7 sm:flex-row sm:items-end">
      <div><p className="font-mono text-eyebrow uppercase text-brand-red">Perpustakaan · 03</p><h1 className="mt-3 font-sans text-h1 text-ink-900">Tersimpan</h1><p className="mt-2 text-sm text-ink-500">Bookmark tersimpan di perangkat ini.</p></div>
      <p className="font-mono text-xs text-ink-500">{bookmarks.count} artikel</p>
    </header>
    {!bookmarks.ready ? <StateCard variant="loading" title="Membuka penyimpanan" description="Memeriksa bookmark lokal." /> : null}
    {bookmarks.ready && bookmarks.bookmarks.length === 0 ? <StateCard variant="empty" title="Belum ada artikel tersimpan" description="Simpan artikel dari dashboard atau Reader untuk membacanya kembali." action={<a className="inline-flex min-h-11 items-center border-b border-brand-red px-3 font-sans text-sm font-semibold text-brand-red" href="/dashboard">Lihat dashboard</a>} /> : null}
    {bookmarks.ready && bookmarks.bookmarks.length > 0 ? <>
      <div className="mb-6 grid grid-cols-1 gap-4 border-b border-paper-300 pb-5 md:grid-cols-[minmax(0,1fr)_180px_auto] md:items-end">
        <label className="block"><span className="mb-2 block font-mono text-[10px] uppercase tracking-[0.12em] text-ink-500">Cari bookmark</span><span className="flex min-h-11 items-center gap-2 border border-paper-300 bg-paper-50 px-3"><Search aria-hidden="true" className="size-4 text-ink-400" /><input className="min-w-0 flex-1 bg-transparent text-sm text-ink-900 outline-none placeholder:text-ink-400" onChange={(event) => setQuery(event.target.value)} placeholder="Judul, publisher, ringkasan" type="search" value={query} /></span></label>
        <label className="block"><span className="mb-2 block font-mono text-[10px] uppercase tracking-[0.12em] text-ink-500">Urutkan</span><select className="min-h-11 w-full border border-paper-300 bg-paper-50 px-3 text-sm text-ink-900 focus-visible:ring-2 focus-visible:ring-brand-red" onChange={(event) => setSort(event.target.value as SortMode)} value={sort}><option value="newest">Terbaru disimpan</option><option value="oldest">Terlama disimpan</option><option value="title">Judul A–Z</option></select></label>
        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex items-center gap-2 text-xs text-ink-700"><input checked={entries.length > 0 && entries.every((entry) => selected.has(entry.url))} onChange={(event) => selectVisible(event.target.checked)} type="checkbox" /> Pilih terlihat</label>
          <Button disabled={selected.size === 0} onClick={() => void removeSelected()} variant="secondary"><Trash2 aria-hidden="true" className="size-4" /> Hapus {selected.size || ''}</Button>
        </div>
      </div>
      {entries.length === 0 ? <StateCard variant="empty" title="Tidak ada hasil pencarian" description="Coba kata kunci lain." /> : <div className="divide-y divide-paper-300 border-y border-paper-300">
        {entries.map((entry) => {
          const archived = isArchived(entry);
          const article = entry.article;
          const snippet = article ? getNewsItemSnippet(article) : null;
          return <article className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 py-5 sm:gap-5" key={entry.url}>
            <input aria-label={`Pilih ${entry.title}`} checked={selected.has(entry.url)} className="mt-2 size-4 accent-[#D32F2F]" onChange={(event) => setSelected((current) => { const next = new Set(current); event.target.checked ? next.add(entry.url) : next.delete(entry.url); return next; })} type="checkbox" />
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                {archived ? <Badge variant="ochre"><Archive aria-hidden="true" className="mr-1 inline size-3" />ARSIP</Badge> : null}
                {article?.categories.map((category) => <Badge key={category}>{category}</Badge>)}
                {feed ? null : <span className="font-mono text-[10px] text-ink-400">status feed belum diperiksa</span>}
              </div>
              <button className="text-left font-sans text-base font-semibold leading-6 text-ink-900 underline decoration-transparent underline-offset-4 hover:text-brand-red hover:decoration-brand-red" onClick={() => openReader(entry.url, article)} type="button">{entry.title}</button>
              <p className="mt-2 flex flex-wrap items-center gap-1.5 font-mono text-[10px] text-ink-500">{article ? <NewsItemSourceMeta item={article} /> : 'Sumber tidak tersedia'} · Disimpan {formatDateTime(entry.savedAt)}</p>
              {snippet ? <p className="mt-2 line-clamp-2 text-sm leading-6 text-ink-500">{snippet}</p> : null}
            </div>
            <button aria-label={`Hapus ${entry.title}`} className="inline-flex size-9 items-center justify-center rounded-btn text-ink-500 hover:bg-paper-200 hover:text-data-danger" onClick={() => void bookmarks.removeMany([entry.url]).then(() => toast.success('Artikel dihapus.')).catch(() => toast.error('Artikel tidak dapat dihapus.'))} type="button"><BookmarkX aria-hidden="true" className="size-4" /></button>
          </article>;
        })}
      </div>}
      {!feed ? <p className="mt-4 text-xs text-ink-500">Feed saat ini tidak tersedia; status arsip belum bisa dibandingkan.</p> : null}
    </> : null}
  </div>;
}
