import type { NewsItem } from '@/lib/types/api';

const stopwords = new Set(['yang', 'dan', 'di', 'ke', 'dari', 'untuk', 'pada', 'dengan', 'dalam', 'ini', 'itu', 'akan', 'jadi', 'ada', 'oleh', 'the', 'of', 'to', 'a', 'an', 'in', 'on', 'at', 'for', 'as', 'and', 'or', 'is', 'was', 'with', 'from']);

export type KeywordGraph = {
  nodes: { id: string; weight: number; category: string }[];
  edges: { source: string; target: string; weight: number }[];
  insufficient: boolean;
};

export function computeKeywordGraph(items: NewsItem[], options: { topN?: number } = {}): KeywordGraph {
  const topN = Math.max(2, Math.min(50, Math.floor(options.topN ?? 20)));
  const weights = new Map<string, number>();
  const categories = new Map<string, Map<string, number>>();
  const pairs = new Map<string, number>();
  for (const item of items) {
    const tokens = [...new Set(item.title.toLocaleLowerCase('id').match(/[\p{L}\p{N}]{3,}/gu) ?? [])].filter((word) => !stopwords.has(word)).sort();
    for (const token of tokens) {
      weights.set(token, (weights.get(token) ?? 0) + 1);
      const categoryCounts = categories.get(token) ?? new Map<string, number>();
      for (const category of item.categories) categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1);
      categories.set(token, categoryCounts);
    }
    for (let first = 0; first < tokens.length; first += 1) {
      for (let second = first + 1; second < tokens.length; second += 1) {
        const key = `${tokens[first]}\u0000${tokens[second]}`;
        pairs.set(key, (pairs.get(key) ?? 0) + 1);
      }
    }
  }
  const selected = [...weights].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, topN);
  const selectedIds = new Set(selected.map(([id]) => id));
  const nodes = selected.map(([id, weight]) => {
    const category = [...(categories.get(id) ?? new Map())].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ?? 'lainnya';
    return { id, weight, category };
  });
  const edges = [...pairs].map(([key, weight]) => {
    const [source, target] = key.split('\u0000');
    return { source, target, weight };
  }).filter((edge) => selectedIds.has(edge.source) && selectedIds.has(edge.target))
    .sort((a, b) => b.weight - a.weight || a.source.localeCompare(b.source) || a.target.localeCompare(b.target));
  return { nodes, edges, insufficient: nodes.length < 2 };
}
