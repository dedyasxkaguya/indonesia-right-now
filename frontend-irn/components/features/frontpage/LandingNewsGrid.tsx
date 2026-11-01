'use client';

import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { id } from 'date-fns/locale';
import { useDrawer } from '@/components/layout/DrawerProvider';
import { CategoryPill } from '@/components/ui/CategoryPill';
import { useIsMobile } from '@/hooks/useIsMobile';
import { computeTopicClusters } from '@/lib/transformers';
import { getNewsItemSnippet } from '@/lib/api/news-item';
import { NewsItemSourceMeta } from '@/components/features/news/NewsItemSourceMeta';
import type { NewsItem } from '@/lib/types/api';

export function LandingNewsGrid({ items }: { items: NewsItem[] }) {
  const { openReader } = useDrawer();
  const isMobile = useIsMobile();
  const itemById = new Map(items.map((item) => [item.id, item]));
  const latestItems = [...items]
    .sort((a, b) => Date.parse(b.published_at) - Date.parse(a.published_at))
    .slice(0, 6);
  const trendingClusters = computeTopicClusters(items, 0.5).clusters
    .flatMap((cluster) => {
      const representative = itemById.get(cluster.ids[0]);
      if (!representative) return [];
      const publishers = new Set(cluster.ids.map((id) => itemById.get(id)?.publisher).filter(Boolean));
      return publishers.size > 1 ? [{ cluster, representative, publisherCount: publishers.size }] : [];
    })
    .sort((a, b) => b.publisherCount - a.publisherCount || b.cluster.size - a.cluster.size)
    .slice(0, 4);

  const openArticle = (item: NewsItem) => {
    if (isMobile) window.location.href = `/baca?url=${encodeURIComponent(item.url)}`;
    else openReader(item.url, item);
  };

  return (
    <>
    <section className="mx-auto max-w-7xl px-5 py-16 lg:px-8 lg:py-20" aria-labelledby="latest-news-heading">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="font-mono text-eyebrow uppercase text-brand-red">01 — Berita Terkini</p>
          <h2 id="latest-news-heading" className="mt-2 font-sans text-h1 text-ink-900">Terbaru</h2>
        </div>
        <Link className="hidden shrink-0 font-sans text-sm font-semibold text-brand-red underline decoration-paper-300 underline-offset-4 hover:decoration-brand-red sm:inline" href="/artikel">
          Lihat semua artikel →
        </Link>
      </div>
      {latestItems.length > 0 ? (
        <div className="grid grid-cols-1 gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
          {latestItems.map((item) => {
            const shortSummary = getNewsItemSnippet(item, 80);

            return (
              <article key={item.id} className="min-w-0 border-t border-paper-300 py-5">
                <div className="mb-2 flex flex-wrap gap-2">
                  {item.categories.slice(0, 2).map((category) => <CategoryPill category={category} key={category} />)}
                </div>
                <h3 className="font-sans text-base font-semibold leading-snug text-ink-900">
                  <button
                    className="text-left underline decoration-transparent underline-offset-4 hover:text-brand-red hover:decoration-brand-red"
                    onClick={() => openArticle(item)}
                    type="button"
                  >
                    {item.title}
                  </button>
                </h3>
                <p className="mt-2 flex flex-wrap items-center gap-1.5 font-mono text-[10px] text-ink-500">
                  <NewsItemSourceMeta item={item} /> · {formatDistanceToNow(new Date(item.published_at), { addSuffix: true, locale: id })}
                </p>
                {shortSummary ? <p className="mt-2 text-sm leading-relaxed text-ink-500">{shortSummary}</p> : null}
              </article>
            );
          })}
        </div>
      ) : (
        <p className="border-t border-paper-300 py-6 text-sm text-ink-500">Belum ada artikel terbaru.</p>
      )}
      <Link className="mt-4 inline-flex font-sans text-sm font-semibold text-brand-red underline decoration-paper-300 underline-offset-4 hover:decoration-brand-red sm:hidden" href="/artikel">
        Lihat semua artikel →
      </Link>
    </section>
    <section className="mx-auto max-w-7xl px-5 pb-16 lg:px-8 lg:pb-20" aria-labelledby="trending-news-heading">
      <div className="mb-6">
        <p className="font-mono text-eyebrow uppercase text-brand-red">02 — Cross-source echo</p>
        <h2 id="trending-news-heading" className="mt-2 font-sans text-h1 text-ink-900">Ramai Dibicarakan</h2>
        <p className="mt-2 text-sm text-ink-500">Topik yang ramai dibahas oleh beberapa sumber dalam feed yang tersedia.</p>
      </div>
      {trendingClusters.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {trendingClusters.map(({ cluster, representative, publisherCount }) => (
            <article key={cluster.ids[0]} className="min-w-0 border-t border-paper-300 py-5">
              <div className="mb-3 flex flex-wrap gap-2">
                {representative.categories.slice(0, 2).map((category) => <CategoryPill category={category} key={category} />)}
              </div>
              <h3 className="font-sans text-lg font-semibold leading-snug text-ink-900">
                <button
                  className="text-left underline decoration-transparent underline-offset-4 hover:text-brand-red hover:decoration-brand-red"
                  onClick={() => openArticle(representative)}
                  type="button"
                >
                  {cluster.representativeTitle}
                </button>
              </h3>
              <p className="mt-2 font-mono text-[10px] text-ink-500">Muncul pada {publisherCount} sumber</p>
            </article>
          ))}
        </div>
      ) : (
        <p className="border-t border-paper-300 py-6 text-sm text-ink-500">Belum ada topik yang diliput oleh beberapa publisher.</p>
      )}
    </section>
    </>
  );
}
