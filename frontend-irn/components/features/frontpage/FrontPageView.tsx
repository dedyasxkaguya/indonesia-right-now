'use client';

import { useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Masthead } from '@/components/features/frontpage/Masthead';
import { BroadsheetGrid } from '@/components/features/frontpage/BroadsheetGrid';
import { FilterChips } from '@/components/features/search/FilterChips';
import { FilterPopover } from '@/components/features/search/FilterPopover';
import { SearchBar } from '@/components/features/search/SearchBar';
import { Button } from '@/components/ui/Button';
import { StateCard } from '@/components/ui/StateCard';
import { useFilterState } from '@/hooks/useFilterState';
import { computeImpactScore, computeTopicClusters } from '@/lib/transformers';
import type { NewsData } from '@/lib/types/api';

export function FrontPageView({ data, printMode, since = '24h' }: { data: NewsData | null; printMode: boolean; since?: string }) {
  useEffect(() => {
    document.body.classList.toggle('print-mode', printMode);
    return () => document.body.classList.remove('print-mode');
  }, [printMode]);

  const filters = useFilterState({ since });
  const { q, categories, publishers, since: selectedSince } = filters;
  const availableCategories = useMemo(() => Array.from(new Set(data?.items.flatMap((item) => item.categories) ?? [])).sort(), [data]);
  const availablePublishers = useMemo(() => Array.from(new Set(data?.items.map((item) => item.publisher) ?? [])).sort(), [data]);
  const filteredItems = useMemo(() => {
    if (!data) return [];
    return data.items.filter((item) => {
      if (q.trim()) {
        const query = q.toLowerCase();
        const matches = item.title.toLowerCase().includes(query)
          || (item.summary?.toLowerCase().includes(query) ?? false)
          || item.publisher.toLowerCase().includes(query)
          || item.categories.some((category) => category.toLowerCase().includes(query));
        if (!matches) return false;
      }
      if (categories.length && !item.categories.some((category) => categories.includes(category))) return false;
      if (publishers.length && !publishers.includes(item.publisher)) return false;
      const hours = (Date.now() - Date.parse(item.published_at)) / 3_600_000;
      const maxHours = selectedSince === '7d' ? 168 : selectedSince === '30d' ? 720 : 24;
      return !(Number.isFinite(hours) && hours > maxHours);
    });
  }, [categories, data, publishers, q, selectedSince]);
  const clusters = useMemo(() => computeTopicClusters(filteredItems, 0.5), [filteredItems]);
  const ordered = useMemo(() => {
    if (!data) return [];
    const byId = new Map(filteredItems.map((item) => [item.id, item]));
    return computeImpactScore(filteredItems, clusters, Date.parse(data.generated_at))
      .map((entry) => byId.get(entry.id))
      .filter((item) => item !== undefined)
      .slice(0, 20);
  }, [clusters, data, filteredItems]);

  if (!data) return <div className="mx-auto max-w-7xl px-5 py-16 lg:px-8"><StateCard variant="error" title="Edisi hari ini tidak dapat dimuat" description="Layanan berita belum mengembalikan snapshot terbaru." action={<Link className="inline-flex min-h-11 items-center border-b border-brand-red px-3 font-sans text-sm font-semibold text-brand-red" href="/hari-ini">Coba lagi</Link>} /></div>;

  const publisherCount = new Set(data.items.map((item) => item.publisher_domain)).size;

  return <div className={`mx-auto max-w-7xl px-5 py-12 lg:px-8 lg:py-16 ${printMode ? 'frontpage-print' : ''}`}>
    {!printMode ? <a className="sr-only rounded-btn bg-paper-50 px-3 py-2 text-sm text-brand-red focus:not-sr-only" href="#berita-lainnya">Langsung ke Berita Lainnya</a> : null}
    <Masthead date={data.date} items={filteredItems.length} sources={publisherCount} since={selectedSince} />
    {!printMode ? <div className="mb-8 space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-[220px] flex-1"><SearchBar onChange={filters.setQ} value={q} /></div>
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
      <div className="flex items-center justify-between gap-3 font-mono text-xs text-ink-500">
        <span aria-live="polite">Menampilkan {filteredItems.length} artikel</span>
        {filters.hasFilters ? <Button onClick={filters.reset} variant="ghost">Reset filter</Button> : null}
      </div>
    </div> : null}
    {filteredItems.length ? <BroadsheetGrid data={data} items={ordered} /> : <StateCard variant="empty" title="Tidak ada berita yang cocok" description="Coba ubah pencarian atau filter yang digunakan." action={<Button onClick={filters.reset} variant="secondary">Reset filter</Button>} />}
  </div>;
}
