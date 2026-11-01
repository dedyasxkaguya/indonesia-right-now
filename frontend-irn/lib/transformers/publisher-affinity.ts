import type { NewsItem } from '@/lib/types/api';

export type PublisherAffinityPair = { a: string; b: string; sharedCategories: string[]; weight: number };

export function computePublisherAffinity(items: NewsItem[]): { pairs: PublisherAffinityPair[]; insufficient: boolean } {
  const categories = new Map<string, Set<string>>();
  for (const item of items) {
    const set = categories.get(item.publisher) ?? new Set<string>();
    for (const category of item.categories) set.add(category);
    categories.set(item.publisher, set);
  }

  const publishers = [...categories.keys()].sort((a, b) => a.localeCompare(b));
  const pairs: PublisherAffinityPair[] = [];

  for (let first = 0; first < publishers.length; first += 1) {
    for (let second = first + 1; second < publishers.length; second += 1) {
      const a = publishers[first];
      const b = publishers[second];
      const setA = categories.get(a) ?? new Set<string>();
      const setB = categories.get(b) ?? new Set<string>();
      const sharedCategories = [...setA].filter((category) => setB.has(category)).sort((x, y) => x.localeCompare(y));
      if (sharedCategories.length >= 1) pairs.push({ a, b, sharedCategories, weight: sharedCategories.length });
    }
  }

  return {
    pairs: pairs
      .sort((first, second) => second.weight - first.weight || first.a.localeCompare(second.a) || first.b.localeCompare(second.b))
      .slice(0, 10),
    insufficient: publishers.length < 2 || pairs.length === 0,
  };
}
