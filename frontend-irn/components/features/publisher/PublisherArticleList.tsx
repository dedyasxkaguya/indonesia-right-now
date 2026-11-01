'use client';

import { useState } from 'react';
import { useDrawer } from '@/components/layout/DrawerProvider';
import { Button } from '@/components/ui/Button';
import { NewsItemSourceMeta } from '@/components/features/news/NewsItemSourceMeta';
import { getNewsItemSnippet } from '@/lib/api/news-item';
import { formatDateTime, formatNumber } from '@/lib/utils/format';
import type { NewsItem } from '@/lib/types/api';

export function PublisherArticleList({ items }: { items: NewsItem[] }) {
  const [visible, setVisible] = useState(20);
  const { openReader } = useDrawer();
  const shown = items.slice(0, visible);
  return <section>
    <div className="mb-4 flex items-baseline justify-between gap-3"><h2 className="font-sans text-h3 text-ink-900">Artikel terkini</h2><span className="font-mono text-[10px] text-ink-400">{formatNumber(items.length)} artikel</span></div>
    <div className="divide-y divide-paper-300 border-y border-paper-300">{shown.map((item) => {
      const snippet = getNewsItemSnippet(item);
      return <article className="py-4" data-feed-item key={item.id} tabIndex={-1}>
        <button className="text-left font-sans text-base font-semibold leading-6 text-ink-900 underline decoration-transparent underline-offset-4 hover:text-brand-red hover:decoration-brand-red" data-feed-reader onClick={() => openReader(item.url, item)} type="button">{item.title}</button>
        {snippet ? <p className="mt-2 line-clamp-2 text-sm leading-6 text-ink-500">{snippet}</p> : null}
        <p className="mt-2 flex flex-wrap items-center gap-1.5 font-mono text-[10px] text-ink-400"><NewsItemSourceMeta item={item} /> · {formatDateTime(item.published_at)} · {item.date_confidence}</p>
      </article>;
    })}</div>
    {shown.length < items.length ? <Button className="mt-4" onClick={() => setVisible((current) => current + 20)} variant="ghost">Muat lebih banyak</Button> : null}
  </section>;
}
