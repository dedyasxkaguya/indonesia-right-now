import type { NewsItem } from '@/lib/types/api';

export type HeadlineLengthRow = { category: string; meanWords: number; n: number };

export function computeHeadlineLength(items: NewsItem[]): { categories: HeadlineLengthRow[]; insufficient: boolean } {
  const groups = new Map<string, { total: number; n: number }>();

  for (const item of items) {
    const title = item.title.trim();
    if (title.length === 0) continue;
    const wordCount = title.split(/\s+/).length;
    const category = item.categories[0] ?? 'Lainnya';
    const group = groups.get(category) ?? { total: 0, n: 0 };
    group.total += wordCount;
    group.n += 1;
    groups.set(category, group);
  }

  const categories = [...groups.entries()]
    .map(([category, group]) => ({
      category,
      meanWords: Math.round((group.total / group.n) * 10) / 10,
      n: group.n,
    }))
    .sort((a, b) => b.meanWords - a.meanWords || a.category.localeCompare(b.category))
    .slice(0, 8);

  return { categories, insufficient: items.length === 0 };
}
