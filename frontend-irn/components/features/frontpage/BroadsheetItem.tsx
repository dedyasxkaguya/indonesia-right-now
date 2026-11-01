'use client';

import { useDrawer } from '@/components/layout/DrawerProvider';
import { CategoryPill } from '@/components/ui/CategoryPill';
import { NewsItemSourceMeta } from '@/components/features/news/NewsItemSourceMeta';
import { useIsMobile } from '@/hooks/useIsMobile';
import type { NewsItem } from '@/lib/types/api';

type BroadsheetItemProps = { item: NewsItem; size: 'lead' | 'secondary' | 'compact' };

export function BroadsheetItem({ item, size }: BroadsheetItemProps) {
  const { openReader } = useDrawer();
  const isMobile = useIsMobile();
  const titleClass = size === 'lead' ? 'text-5xl leading-[1.05] lg:text-display' : size === 'secondary' ? 'text-3xl leading-tight lg:text-h1' : 'text-h3 leading-snug';
  return <article className="min-w-0 border-t border-paper-300 py-5">
    <div className="mb-2 flex flex-wrap gap-2">{(item.categories ?? []).slice(0, 3).map((category) => (<CategoryPill category={category} key={category} />))}</div>
    <button className={`block w-full text-left font-sans font-semibold text-ink-900 underline decoration-transparent underline-offset-4 hover:text-brand-red hover:decoration-brand-red ${titleClass}`} data-feed-item data-feed-reader data-reader-title={item.title} data-reader-url={item.url} onClick={() => {
      if (isMobile) window.location.href = `/baca?url=${encodeURIComponent(item.url)}`;
      else openReader(item.url, item);
    }} type="button">{item.title}</button>
    <p className="mt-3 flex flex-wrap items-center gap-1.5 font-sans text-caption text-ink-500"><NewsItemSourceMeta item={item} /> · {new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }).format(new Date(item.published_at))} WIB</p>
  </article>;
}
