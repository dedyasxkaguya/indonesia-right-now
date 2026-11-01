import type { NewsStats } from '@/lib/types/api';

export function computeDedupRate(stats: NewsStats): { rate: number; deduped: number; fetched: number; insufficient: boolean } {
  return {
    rate: stats.items_fetched === 0 ? 0 : stats.items_deduped / stats.items_fetched,
    deduped: stats.items_deduped,
    fetched: stats.items_fetched,
    insufficient: stats.items_fetched === 0,
  };
}
