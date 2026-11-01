import type { NewsItem } from '@/lib/types/api';

export type TopicCluster = { ids: string[]; representativeTitle: string; size: number };
export type TopicClusterResult = { clusters: TopicCluster[]; insufficient: boolean };

const stopwords = new Set([
  'yang', 'dan', 'di', 'ke', 'dari', 'untuk', 'pada', 'dengan', 'dalam', 'ini', 'itu', 'akan', 'jadi', 'ada', 'oleh', 'atau', 'juga', 'tidak', 'bisa', 'dapat', 'sudah', 'belum', 'masih', 'saja', 'lebih', 'sangat', 'banyak',
  'the', 'of', 'to', 'a', 'an', 'in', 'on', 'at', 'for', 'as', 'and', 'or', 'is', 'was', 'with', 'from', 'be', 'are', 'by', 'this', 'that',
]);

export function normalizeTitle(title: string): string[] {
  return title.toLocaleLowerCase('id')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((token) => token.length >= 3 && !stopwords.has(token))
    .sort();
}

function jaccard(first: Set<string>, second: Set<string>): number {
  let intersection = 0;
  for (const token of first) if (second.has(token)) intersection += 1;
  const unionSize = new Set([...first, ...second]).size;
  return unionSize === 0 ? 0 : intersection / unionSize;
}

export function computeTopicClusters(items: NewsItem[], threshold = 0.5): TopicClusterResult {
  if (items.length === 0) return { clusters: [], insufficient: true };
  const tokenized = items.map((item) => ({ id: item.id, title: item.title, tokens: new Set(normalizeTitle(item.title)) }));
  const parent = new Map(tokenized.map(({ id }) => [id, id]));

  function find(id: string): string {
    const current = parent.get(id) ?? id;
    if (current === id) return id;
    const root = find(current);
    parent.set(id, root);
    return root;
  }

  function union(firstId: string, secondId: string): void {
    const firstRoot = find(firstId);
    const secondRoot = find(secondId);
    if (firstRoot === secondRoot) return;
    const [root, child] = [firstRoot, secondRoot].sort((a, b) => a.localeCompare(b));
    parent.set(child, root);
  }

  for (let first = 0; first < tokenized.length; first += 1) {
    for (let second = first + 1; second < tokenized.length; second += 1) {
      if (jaccard(tokenized[first].tokens, tokenized[second].tokens) >= threshold) union(tokenized[first].id, tokenized[second].id);
    }
  }

  const groups = new Map<string, string[]>();
  for (const { id } of tokenized) {
    const root = find(id);
    const members = groups.get(root) ?? [];
    members.push(id);
    groups.set(root, members);
  }
  const itemById = new Map(items.map((item) => [item.id, item]));
  const clusters = [...groups.values()].map((ids) => {
    const firstId = ids[0];
    return { ids, representativeTitle: itemById.get(firstId)?.title ?? '', size: ids.length };
  }).sort((a, b) => b.size - a.size || a.representativeTitle.localeCompare(b.representativeTitle));
  return { clusters, insufficient: false };
}
