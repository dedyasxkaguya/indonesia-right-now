import type { NewsItem } from '@/lib/types/api';

export function computeSummaryCompleteness(items: NewsItem[]): { withSummary: number; total: number; pct: number; insufficient: boolean } {
  const total = items.length;
  const withSummary = items.filter((item) => item.summary !== null && item.summary.trim().length > 0).length;
  const pct = total === 0 ? 0 : Math.round((withSummary / total) * 1000) / 10;
  return { withSummary, total, pct, insufficient: total === 0 };
}
