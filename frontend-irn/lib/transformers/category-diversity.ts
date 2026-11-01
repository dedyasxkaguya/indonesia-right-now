import type { NewsItem } from '@/lib/types/api';

export type DiversityRow = { category: string; publisherCount: number; itemCount: number };

export function computeCategorySourceDiversity(items: NewsItem[]): { categories: DiversityRow[]; insufficient: boolean } {
  const groups = new Map<string, { publishers: Set<string>; itemCount: number }>();

  for (const item of items) {
    for (const category of new Set(item.categories)) {
      const group = groups.get(category) ?? { publishers: new Set<string>(), itemCount: 0 };
      group.publishers.add(item.publisher);
      group.itemCount += 1;
      groups.set(category, group);
    }
  }

  const categories = [...groups.entries()]
    .map(([category, group]) => ({ category, publisherCount: group.publishers.size, itemCount: group.itemCount }))
    .sort((a, b) => b.publisherCount - a.publisherCount || b.itemCount - a.itemCount || a.category.localeCompare(b.category))
    .slice(0, 8);

  return { categories, insufficient: items.length === 0 };
}
