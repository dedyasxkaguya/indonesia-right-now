'use client';

import { Bookmark } from 'lucide-react';
import { toast } from 'sonner';
import { useBookmarks } from '@/hooks/useBookmarks';
import type { NewsItem } from '@/lib/types/api';

type BookmarkButtonProps = { article: NewsItem; className?: string };

export function BookmarkButton({ article, className }: BookmarkButtonProps) {
  const watchlist = useBookmarks();
  const saved = watchlist.isBookmarked(article.url);
  const pending = watchlist.isPending(article.url);
  async function toggle() {
    try {
      await watchlist.toggle(article);
      toast.success(saved ? 'Artikel dihapus dari tersimpan.' : 'Artikel disimpan.');
    } catch {
      toast.error('Perubahan bookmark tidak dapat disimpan di perangkat ini.');
    }
  }
  return <button aria-label={saved ? 'Hapus bookmark' : 'Simpan artikel'} aria-pressed={saved} className={`inline-flex size-9 items-center justify-center rounded-btn text-ink-500 transition-colors hover:bg-paper-200 hover:text-brand-red focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red disabled:opacity-50 ${className ?? ''}`} data-feed-bookmark disabled={!watchlist.ready || pending} onClick={() => void toggle()} title={saved ? 'Hapus bookmark' : 'Simpan artikel'} type="button">
    <Bookmark aria-hidden="true" className="size-4" fill={saved ? 'currentColor' : 'none'} />
  </button>;
}
