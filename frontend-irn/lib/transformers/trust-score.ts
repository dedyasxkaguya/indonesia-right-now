import type { NewsItem, NewsSource } from '@/lib/types/api';

export type TrustScore = {
  publisherDomain: string;
  score: number;
  subScores: { freshness: number; completeness: number; reliability: number };
  medianLatency: number;
  itemCount: number;
  sourceCount: number;
  insufficient: boolean;
};

export function quantile(values: number[], q: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil(sorted.length * q) - 1)];
}

export function computeTrustScore(publisherDomain: string, items: NewsItem[], sources: NewsSource[]): TrustScore {
  const publisherItems = items.filter((item) => item.publisher_domain === publisherDomain);
  const publisherSources = sources.filter((source) => source.url.includes(publisherDomain) || source.publisher === publisherDomain);
  if (publisherItems.length === 0) {
    return { publisherDomain, score: 0, subScores: { freshness: 0, completeness: 0, reliability: 0 }, medianLatency: 0, itemCount: 0, sourceCount: publisherSources.length, insufficient: true };
  }

  const latencies = publisherItems
    .map((item) => (Date.parse(item.fetched_at) - Date.parse(item.published_at)) / 60_000)
    .filter((minutes) => Number.isFinite(minutes) && minutes >= 0);
  const medianLatency = latencies.length ? quantile(latencies, 0.5) : 999;
  const freshness = Math.max(0, 1 - Math.min(medianLatency / 120, 1));
  const complete = publisherItems.filter((item) => item.summary !== null && Number.isFinite(Date.parse(item.published_at))).length;
  const completeness = complete / publisherItems.length;
  const reliability = publisherSources.length === 0 ? 0.5 : publisherSources.filter((source) => source.status === 'ok').length / publisherSources.length;

  return {
    publisherDomain,
    score: Math.round((0.4 * freshness + 0.3 * completeness + 0.3 * reliability) * 100),
    subScores: { freshness: Math.round(freshness * 100), completeness: Math.round(completeness * 100), reliability: Math.round(reliability * 100) },
    medianLatency,
    itemCount: publisherItems.length,
    sourceCount: publisherSources.length,
    insufficient: false,
  };
}
