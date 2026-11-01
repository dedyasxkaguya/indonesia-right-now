import type { NewsItem } from '@/lib/types/api';
import type { TopicClusterResult } from '@/lib/transformers/topic-clusters';

export type ImpactScore = { id: string; score: number; components: { freshness: number; breadth: number; diversity: number; depth: number } };

export function computeImpactScore(items: NewsItem[], clusters: TopicClusterResult, now: number): ImpactScore[] {
  if (items.length === 0) return [];
  const itemToCluster = new Map<string, string[]>();
  for (const cluster of clusters.clusters) for (const id of cluster.ids) itemToCluster.set(id, cluster.ids);
  const itemById = new Map(items.map((item) => [item.id, item]));

  return items.map((item) => {
    const hoursSince = (now - Date.parse(item.published_at)) / 3_600_000;
    const freshness = Number.isFinite(hoursSince) ? Math.max(0, Math.min(1, 1 - Math.min(hoursSince / 24, 1))) : 0;
    const clusterItems = (itemToCluster.get(item.id) ?? [item.id]).map((id) => itemById.get(id)).filter((entry): entry is NewsItem => entry !== undefined);
    const publisherCount = new Set(clusterItems.map((entry) => entry.publisher)).size;
    const breadth = Math.min(publisherCount / 5, 1);
    const diversity = Math.min(item.categories.length / 3, 1);
    const depth = Math.min((item.summary?.length ?? 0) / 400, 1);
    const score = 0.35 * freshness + 0.25 * breadth + 0.2 * diversity + 0.2 * depth;
    return { id: item.id, score, components: { freshness, breadth, diversity, depth } };
  }).sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const itemA = itemById.get(a.id);
    const itemB = itemById.get(b.id);
    const publishedA = itemA ? Date.parse(itemA.published_at) : Number.NaN;
    const publishedB = itemB ? Date.parse(itemB.published_at) : Number.NaN;
    if (Number.isFinite(publishedA) && Number.isFinite(publishedB) && publishedB !== publishedA) return publishedB - publishedA;
    return (itemA?.title ?? '').localeCompare(itemB?.title ?? '');
  });
}
