import type { NewsItem } from '@/lib/types/api';

export type AffinityPair = { a: string; b: string; count: number };

export function computeCategoryAffinity(items: NewsItem[]): { pairs: AffinityPair[]; insufficient: boolean } {
  const counts = new Map<string, number>();

  for (const item of items) {
    const categories = [...new Set(item.categories)].sort((a, b) => a.localeCompare(b));
    for (let first = 0; first < categories.length; first += 1) {
      for (let second = first + 1; second < categories.length; second += 1) {
        const a = categories[first];
        const b = categories[second];
        const key = `${a}\u0000${b}`;
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }
  }

  const pairs = [...counts.entries()]
    .map(([key, count]) => {
      const [a, b] = key.split('\u0000');
      return { a, b, count };
    })
    .sort((first, second) => second.count - first.count || first.a.localeCompare(second.a) || first.b.localeCompare(second.b))
    .slice(0, 10);

  return { pairs, insufficient: items.length < 2 || pairs.length === 0 };
}
