import type { NewsItem } from '@/lib/types/api';

export type RateRow = { publisher: string; last1h: number; last6h: number };

const HOUR_MS = 60 * 60 * 1000;

export function computeRecentPublishRate(items: NewsItem[], now: number): { publishers: RateRow[]; insufficient: boolean } {
  const oneHourAgo = now - HOUR_MS;
  const sixHoursAgo = now - 6 * HOUR_MS;
  const counts = new Map<string, RateRow>();

  for (const item of items) {
    const timestamp = Date.parse(item.published_at);
    if (!Number.isFinite(timestamp)) continue;
    const row = counts.get(item.publisher) ?? { publisher: item.publisher, last1h: 0, last6h: 0 };
    if (timestamp >= oneHourAgo) row.last1h += 1;
    if (timestamp >= sixHoursAgo) row.last6h += 1;
    counts.set(item.publisher, row);
  }

  const publishers = [...counts.values()]
    .sort((a, b) => b.last1h - a.last1h || b.last6h - a.last6h || a.publisher.localeCompare(b.publisher))
    .slice(0, 10);

  return { publishers, insufficient: items.length === 0 };
}
