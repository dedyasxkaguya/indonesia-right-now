'use client';

import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import { ExternalLink } from 'lucide-react';
import { BookmarkButton } from '@/components/features/BookmarkButton';
import { SearchBar } from '@/components/features/search/SearchBar';
import { FilterChips } from '@/components/features/search/FilterChips';
import { FilterPopover } from '@/components/features/search/FilterPopover';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { StateCard } from '@/components/ui/StateCard';
import { useDrawer } from '@/components/layout/DrawerProvider';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useRouter } from 'next/navigation';
import { useFilterState } from '@/hooks/useFilterState';
import { formatDateTime, formatNumber } from '@/lib/utils/format';
import { getNewsItemSnippet } from '@/lib/api/news-item';
import { NewsItemSourceMeta } from '@/components/features/news/NewsItemSourceMeta';
import type { NewsData, NewsResponse } from '@/lib/types/api';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function HighlightedTitle({ title, query }: { title: string; query: string }) {
  if (!query.trim()) return <>{title}</>;
  const parts = title.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
  return (
    <>
      {parts.map((part, index) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={index} className="bg-brand-red/10 text-ink-900 rounded-sm px-0.5">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
}

export function ArtikelView({ initialData }: { initialData: NewsData | null }) {
  const { data: response, error, isLoading, mutate } = useSWR<NewsResponse>('/api/news', fetcher, {
    fallbackData: initialData ? { ok: true, data: initialData, error: null } : undefined,
    refreshInterval: 60_000,
  });

  const data = response?.data ?? initialData;
  const { openReader } = useDrawer();
  const router = useRouter();
  const isMobile = useIsMobile();
  const filters = useFilterState();
  const { q, since, categories, publishers } = filters;
  const [visibleCount, setVisibleCount] = useState(20);

  useEffect(() => {
    setVisibleCount(20);
  }, [categories, publishers, q, since]);

  const availableCategories = useMemo(() => {
    if (!data) return [];
    return Array.from(new Set(data.items.flatMap((item) => item.categories ?? []))).sort();
  }, [data]);

  const availablePublishers = useMemo(() => {
    if (!data) return [];
    return Array.from(new Set(data.items.map((item) => item.publisher))).sort();
  }, [data]);

  const filteredItems = useMemo(() => {
    if (!data) return [];
    return data.items.filter((item) => {
      if (q.trim()) {
        const queryLower = q.toLowerCase();
        const matchesTitle = item.title.toLowerCase().includes(queryLower);
        const matchesSummary = item.summary?.toLowerCase().includes(queryLower) ?? false;
        const matchesPublisher = item.publisher.toLowerCase().includes(queryLower);
        const matchesCategory = item.categories?.some((cat) => cat.toLowerCase().includes(queryLower)) ?? false;
        if (!matchesTitle && !matchesSummary && !matchesPublisher && !matchesCategory) return false;
      }
      if (categories.length > 0 && !item.categories.some((cat) => categories.includes(cat))) {
        return false;
      }
      if (publishers.length > 0 && !publishers.includes(item.publisher)) {
        return false;
      }
      if (since) {
        const published = Date.parse(item.published_at);
        const now = Date.now();
        const hours = (now - published) / 3_600_000;
        if (since === '24h' && hours > 24) return false;
        if (since === '7d' && hours > 168) return false;
        if (since === '30h' && hours > 30) return false;
      }
      return true;
    });
  }, [data, q, categories, publishers, since]);

  const uniquePublishersCount = useMemo(() => {
    if (!data) return 0;
    return new Set(data.items.map((i) => i.publisher)).size;
  }, [data]);
  const visibleItems = filteredItems.slice(0, visibleCount);

  return (
    <div className="py-10">
      <header className="mb-8 border-b border-paper-300 pb-6">
        <p className="font-mono text-eyebrow uppercase text-brand-red">Jelajah · 03</p>
        <h1 className="mt-2 font-sans text-h1 text-ink-900">Artikel</h1>
        {data ? (
          <p className="mt-2 font-mono text-xs text-ink-500">
            {formatNumber(data.items.length)} artikel dari {formatNumber(uniquePublishersCount)} sumber
          </p>
        ) : null}
      </header>

      {error && !data ? (
        <StateCard
          variant="error"
          title="Gagal memuat artikel"
          description="Terjadi kesalahan saat mengambil feed artikel."
          action={<Button onClick={() => void mutate()}>Coba lagi</Button>}
        />
      ) : null}

      {isLoading && !data ? (
        <StateCard variant="loading" title="Memuat artikel" description="Mengambil data feed terkini..." />
      ) : null}

      {data ? (
        <div className="space-y-6">
          {/* Search and Filters */}
          <div className="sticky top-[76px] z-10 space-y-3 bg-paper-100/95 py-3 backdrop-blur-sm">
            <div className="flex flex-wrap items-center gap-3">
              <div className="min-w-[240px] flex-1">
                <SearchBar onChange={filters.setQ} value={q} />
              </div>
              <FilterPopover
                categories={availableCategories}
                onChangeCategories={filters.setCategories}
                onChangePublishers={filters.setPublishers}
                onChangeSince={filters.setSince}
                publishers={availablePublishers}
                state={filters}
              />
            </div>
            <FilterChips onRemove={filters.remove} state={filters} />
            <div className="flex justify-between items-center text-xs text-ink-500 font-mono">
              <span aria-live="polite">
                Menampilkan {formatNumber(visibleItems.length)} dari {formatNumber(filteredItems.length)} artikel
              </span>
              {filters.hasFilters && (
                <button
                  type="button"
                  onClick={filters.reset}
                  className="text-brand-red hover:underline"
                >
                  Reset filter
                </button>
              )}
            </div>
          </div>

          {/* Empty filtered state */}
          {filteredItems.length === 0 ? (
            <StateCard
              variant="empty"
              title="Tidak ada artikel yang cocok"
              description="Coba gunakan kata kunci pencarian lain atau setel ulang filter."
              action={<Button onClick={filters.reset} variant="secondary">Reset filter</Button>}
            />
          ) : (
            /* Dense Article List */
            <div className="divide-y divide-paper-300 border-b border-paper-300">
              {visibleItems.map((item) => {
                const snippet = getNewsItemSnippet(item);
                return (
                <article
                  key={item.id}
                  className="grid grid-cols-1 gap-2 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start hover:bg-paper-50 transition-colors px-2 -mx-2 rounded-sm"
                >
                  <div className="min-w-0">
                    <div className="mb-1.5 flex flex-wrap items-center gap-2">
                      {(item.categories ?? []).slice(0, 3).map((category) => (
                        <Badge key={category}>{category}</Badge>
                      ))}
                      <span className="font-mono text-[10px] text-ink-400">
                        {item.date_confidence}
                      </span>
                    </div>
                    <h2 className="font-sans text-base font-semibold text-ink-900 leading-snug">
                      <button
                        type="button"
                        onClick={() => {
                          if (item.url) {
                            if (isMobile) window.location.href = `/baca?url=${encodeURIComponent(item.url)}`;
                            else openReader(item.url, item);
                          }
                        }}
                        className="text-left underline decoration-transparent underline-offset-2 hover:text-brand-red hover:decoration-brand-red"
                      >
                        <HighlightedTitle query={q} title={item.title} />
                      </button>
                    </h2>
                    {snippet ? <p className="mt-1 line-clamp-2 text-xs leading-5 text-ink-600">{snippet}</p> : null}
                    <p className="mt-2 flex flex-wrap items-center gap-1.5 font-mono text-[10px] text-ink-400">
                      <NewsItemSourceMeta item={item} /> · {formatDateTime(item.published_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 sm:mt-0.5">
                    <BookmarkButton article={item} />
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Buka artikel asli: ${item.title}`}
                      className="inline-flex size-8 items-center justify-center rounded-btn text-ink-400 hover:bg-paper-200 hover:text-brand-red transition-colors"
                    >
                      <ExternalLink aria-hidden="true" className="size-3.5" />
                    </a>
                  </div>
                </article>
                );
              })}
            </div>
          )}
          {visibleCount < filteredItems.length ? (
            <div className="pt-4 text-center">
              <Button onClick={() => setVisibleCount((count) => count + 20)} variant="secondary">
                Muat lebih banyak
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
