'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { ArrowRight, ShieldCheck, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { StateCard } from '@/components/ui/StateCard';
import { computeTrustScore } from '@/lib/transformers/trust-score';
import { formatNumber } from '@/lib/utils/format';
import type { NewsData, NewsResponse } from '@/lib/types/api';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function PublisherIndexView({ initialData }: { initialData: NewsData | null }) {
  const { data: response, error, isLoading, mutate } = useSWR<NewsResponse>('/api/news', fetcher, {
    fallbackData: initialData ? { ok: true, data: initialData, error: null } : undefined,
    refreshInterval: 60_000,
  });

  const data = response?.data ?? initialData;

  const publisherList = useMemo(() => {
    if (!data || data.items.length === 0) return [];

    // Group items by publisher domain
    const pubMap = new Map<string, { domain: string; name: string; itemsCount: number; topCategory: string; trustScore: number }>();

    const domainGroups = new Map<string, typeof data.items>();
    for (const item of data.items) {
      const domain = item.publisher_domain || item.publisher;
      const group = domainGroups.get(domain) ?? [];
      group.push(item);
      domainGroups.set(domain, group);
    }

    for (const [domain, items] of domainGroups.entries()) {
      const name = items[0]?.publisher ?? domain;
      const trust = computeTrustScore(domain, data.items, data.sources);

      // Find top category
      const catCount = new Map<string, number>();
      for (const item of items) {
        for (const cat of item.categories) {
          catCount.set(cat, (catCount.get(cat) ?? 0) + 1);
        }
      }
      let topCategory = 'Umum';
      let maxCatCount = 0;
      for (const [cat, count] of catCount.entries()) {
        if (count > maxCatCount) {
          maxCatCount = count;
          topCategory = cat;
        }
      }

      pubMap.set(domain, {
        domain,
        name,
        itemsCount: items.length,
        topCategory,
        trustScore: trust.insufficient ? 0 : trust.score,
      });
    }

    return Array.from(pubMap.values()).sort((a, b) => b.itemsCount - a.itemsCount);
  }, [data]);

  return (
    <div className="py-10">
      <header className="mb-10 border-b border-paper-300 pb-6">
        <p className="font-mono text-eyebrow uppercase text-brand-red">Indeks · 06</p>
        <h1 className="mt-2 font-sans text-h1 text-ink-900">Publisher</h1>
        <p className="mt-2 text-sm text-ink-500">
          Daftar sumber berita dan komunitas aktif, metrik reliabilitas, dan cakupan kategori.
        </p>
      </header>

      {error && !data ? (
        <StateCard
          variant="error"
          title="Gagal memuat publisher"
          description="Terjadi kesalahan saat memuat data publisher."
          action={<Button onClick={() => void mutate()}>Coba lagi</Button>}
        />
      ) : null}

      {isLoading && !data ? (
        <StateCard variant="loading" title="Memuat publisher" description="Menghitung statistik publisher..." />
      ) : null}

      {data && publisherList.length === 0 ? (
        <StateCard
          variant="empty"
          title="Belum ada sumber aktif dalam 24 jam terakhir."
          description="Feed tidak memiliki item yang tercatat saat ini."
        />
      ) : null}

      {publisherList.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {publisherList.map((pub) => (
            <Link
              key={pub.domain}
              href={`/publisher/${encodeURIComponent(pub.domain)}`}
              className="group block border-t-2 border-paper-300 hover:border-brand-red pt-4 pb-6 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-sans text-lg font-bold text-ink-900 group-hover:text-brand-red transition-colors truncate">
                    {pub.name}
                  </h2>
                  <p className="font-mono text-xs text-ink-400 mt-0.5 truncate">
                    {pub.domain}
                  </p>
                </div>
                <ArrowRight
                  aria-hidden="true"
                  className="size-4 shrink-0 text-ink-300 group-hover:text-brand-red group-hover:translate-x-0.5 transition-all"
                />
              </div>

              <div className="mt-4 flex items-center justify-between gap-2 text-xs">
                <span className="flex items-center gap-1.5 font-mono text-ink-600">
                  <FileText aria-hidden="true" className="size-3.5 text-ink-400" />
                  {formatNumber(pub.itemsCount)} artikel
                </span>
                <span className="flex items-center gap-1.5 font-mono text-ink-600">
                  <ShieldCheck aria-hidden="true" className="size-3.5 text-data-success" />
                  Trust: {pub.trustScore}/100
                </span>
              </div>

              <div className="mt-3 flex items-center gap-2">
                <Badge>{pub.topCategory}</Badge>
              </div>
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
