import type { FetchAIStats, NewsStats } from '@/lib/types/api';

export type PipelineReliability = { extractionYield: number; dedupeRate: number; fetchSuccessRate: number; insufficient: boolean };

export function computePipelineReliability(stats: NewsStats, ai?: FetchAIStats | null): PipelineReliability {
  const sourceTotal = stats.sources_total;
  const fetched = ai?.items_raw ?? stats.items_fetched;
  const kept = ai?.items_kept ?? stats.items_kept;
  return {
    extractionYield: fetched === 0 ? 0 : kept / fetched,
    dedupeRate: stats.items_fetched === 0 ? 0 : stats.items_deduped / stats.items_fetched,
    fetchSuccessRate: sourceTotal === 0 ? 0 : stats.sources_ok / sourceTotal,
    insufficient: sourceTotal === 0 && fetched === 0,
  };
}
