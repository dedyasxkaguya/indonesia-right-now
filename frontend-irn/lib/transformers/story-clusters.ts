import type { NewsItem } from '@/lib/types/api';
import { computeTopicClusters } from '@/lib/transformers/topic-clusters';
import type { TopicClusterResult } from '@/lib/transformers/topic-clusters';

/**
 * Metric 10 — story clusters.
 * Reuses the F10 Jaccard + Union-Find implementation with a looser threshold (0.4 vs 0.5).
 * Do not duplicate the clustering algorithm here.
 */
export function computeStoryClusters(items: NewsItem[]): TopicClusterResult {
  const result = computeTopicClusters(items, 0.4);
  const hasRealCluster = result.clusters.some((cluster) => cluster.size > 1);
  return { clusters: result.clusters, insufficient: items.length < 2 || !hasRealCluster };
}
