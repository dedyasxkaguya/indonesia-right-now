import type { NewsData, NewsSource } from '@/lib/types/api';

export type SourceHealth = {
  healthPct: number;
  byStatus: { status: 'ok' | 'error'; count: number }[];
  errorCodes: { code: string; count: number }[];
  worstOffenders: NewsSource[];
  insufficient: boolean;
};

export function computeSourceHealth(data: Pick<NewsData, 'stats' | 'sources'>): SourceHealth {
  const total = data.sources.length || data.stats.sources_total;
  const errors = new Map<string, number>();
  for (const source of data.sources) {
    if (source.error) errors.set(source.error.code, (errors.get(source.error.code) ?? 0) + 1);
  }
  return {
    healthPct: total === 0 ? 0 : Math.round((data.stats.sources_ok / total) * 100),
    byStatus: [
      { status: 'ok', count: data.stats.sources_ok },
      { status: 'error', count: data.stats.sources_failed },
    ],
    errorCodes: [...errors].map(([code, count]) => ({ code, count })).sort((a, b) => b.count - a.count || a.code.localeCompare(b.code)),
    worstOffenders: data.sources.filter((source) => source.status === 'error'),
    insufficient: total === 0,
  };
}
