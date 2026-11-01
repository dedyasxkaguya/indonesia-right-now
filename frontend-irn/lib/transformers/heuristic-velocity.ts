import type { NewsItem } from '@/lib/types/api';

export type VelocityRow = {
  category: string;
  last4h: number;
  prev4h: number;
  deltaPct: number;
  direction: 'up' | 'down' | 'flat';
};

const HOUR_MS = 60 * 60 * 1000;

export function computeHeuristicVelocity(items: NewsItem[], now: number): { categories: VelocityRow[]; insufficient: boolean } {
  const window1Start = now - 4 * HOUR_MS;
  const window2Start = now - 8 * HOUR_MS;
  const counts = new Map<string, { last4h: number; prev4h: number }>();

  for (const item of items) {
    const timestamp = Date.parse(item.published_at);
    if (!Number.isFinite(timestamp)) continue;
    let bucket: 'last4h' | 'prev4h' | null = null;
    if (timestamp > window1Start && timestamp <= now) bucket = 'last4h';
    else if (timestamp > window2Start && timestamp <= window1Start) bucket = 'prev4h';
    if (!bucket) continue;
    for (const category of new Set(item.categories)) {
      const entry = counts.get(category) ?? { last4h: 0, prev4h: 0 };
      entry[bucket] += 1;
      counts.set(category, entry);
    }
  }

  const rows: VelocityRow[] = [...counts.entries()].map(([category, entry]) => {
    const deltaPct = entry.prev4h === 0
      ? (entry.last4h > 0 ? 100 : 0)
      : ((entry.last4h - entry.prev4h) / entry.prev4h) * 100;
    const direction: VelocityRow['direction'] = Math.abs(deltaPct) < 5 ? 'flat' : deltaPct > 0 ? 'up' : 'down';
    return { category, last4h: entry.last4h, prev4h: entry.prev4h, deltaPct, direction };
  });

  return {
    categories: rows
      .sort((a, b) => Math.abs(b.deltaPct) - Math.abs(a.deltaPct) || a.category.localeCompare(b.category))
      .slice(0, 5),
    insufficient: items.length < 2,
  };
}
