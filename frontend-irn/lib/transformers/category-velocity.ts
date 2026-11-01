import type { NewsItem } from '@/lib/types/api';

export type CategoryVelocity = { category: string; hourly: number[]; deltaPct: number };
const HOUR_MS = 60 * 60 * 1000;

export function computeCategoryVelocity(items: NewsItem[], now?: number): { categories: CategoryVelocity[]; insufficient: boolean } {
  const categories = new Map<string, number[]>();
  const validTimestamps = items.map((item) => Date.parse(item.published_at)).filter(Number.isFinite);
  const windowEnd = now ?? Math.max(0, ...validTimestamps);
  const start = windowEnd - 24 * HOUR_MS;
  for (const item of items) {
    const timestamp = Date.parse(item.published_at);
    if (!Number.isFinite(timestamp) || timestamp < start || timestamp > windowEnd) continue;
    const hour = Math.min(23, Math.floor((timestamp - start) / HOUR_MS));
    for (const category of new Set(item.categories)) {
      const buckets = categories.get(category) ?? Array<number>(24).fill(0);
      buckets[hour] += 1;
      categories.set(category, buckets);
    }
  }
  const result = [...categories].map(([category, hourly]) => {
    const recent = hourly.slice(20).reduce((sum, count) => sum + count, 0);
    const previous = hourly.slice(16, 20).reduce((sum, count) => sum + count, 0);
    const deltaPct = previous === 0 ? (recent === 0 ? 0 : 100) : ((recent - previous) / previous) * 100;
    return { category, hourly, deltaPct };
  }).sort((a, b) => b.hourly.reduce((sum, count) => sum + count, 0) - a.hourly.reduce((sum, count) => sum + count, 0) || a.category.localeCompare(b.category));
  return { categories: result, insufficient: result.length === 0 };
}
