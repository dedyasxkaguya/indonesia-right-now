import type { NewsItem } from '@/lib/types/api';

export type PublisherShare = { publisher: string; count: number; sharePct: number; domains: string[] };

export function computePublisherDominance(items: NewsItem[]): { publishers: PublisherShare[]; insufficient: boolean } {
  const counts = new Map<string, { count: number; domains: Set<string> }>();
  for (const item of items) {
    const entry = counts.get(item.publisher) ?? { count: 0, domains: new Set<string>() };
    entry.count += 1;
    entry.domains.add(item.publisher_domain);
    counts.set(item.publisher, entry);
  }
  const publishers = [...counts].map(([publisher, entry]) => ({
    publisher,
    count: entry.count,
    sharePct: items.length === 0 ? 0 : (entry.count / items.length) * 100,
    domains: [...entry.domains].sort(),
  })).sort((a, b) => b.count - a.count || a.publisher.localeCompare(b.publisher)).slice(0, 8);
  return { publishers, insufficient: publishers.length === 0 };
}
