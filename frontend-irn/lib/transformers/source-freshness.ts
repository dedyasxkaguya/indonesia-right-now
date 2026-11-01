import type { NewsItem, NewsSource } from '@/lib/types/api';
import { quantile } from '@/lib/transformers/trust-score';

export type SourceFreshnessRow = { sourceUrl: string; publisher: string; medianMinutes: number; itemCount: number };

type MeasuredRow = SourceFreshnessRow & { validCount: number };

export function computeSourceFreshness(sources: NewsSource[], items: NewsItem[]): { sources: SourceFreshnessRow[]; insufficient: boolean } {
  const measured: MeasuredRow[] = [];
  for (const source of sources) {
    if (source.status !== 'ok') continue;
    const sourceItems = items.filter((item) => item.source_url === source.url);
    const latencies = sourceItems
      .map((item) => (Date.parse(item.fetched_at) - Date.parse(item.published_at)) / 60_000)
      .filter((minutes) => Number.isFinite(minutes) && minutes >= 0);
    if (latencies.length === 0) continue;
    measured.push({
      sourceUrl: source.url,
      publisher: source.publisher,
      medianMinutes: quantile(latencies, 0.5),
      itemCount: sourceItems.length,
      validCount: latencies.length,
    });
  }

  const rows = measured
    .sort((a, b) => a.medianMinutes - b.medianMinutes || a.sourceUrl.localeCompare(b.sourceUrl))
    .slice(0, 10)
    .map(({ sourceUrl, publisher, medianMinutes, itemCount }) => ({ sourceUrl, publisher, medianMinutes, itemCount }));

  return { sources: rows, insufficient: rows.length === 0 };
}
