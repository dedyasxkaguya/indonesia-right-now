import type { NewsItem } from '@/lib/types/api';

export type EditorsPick = {
  itemId: string;
  title: string;
  publisher: string;
  publishedAt: string;
  score: number;
  components: { categoryImportance: number; publisherBreadth: number; recency: number; summaryFactor: number };
};

export function computeEditorsPicks(items: NewsItem[], n = 5, now?: number): EditorsPick[] {
  if (items.length === 0) return [];
  const publisherCategories = new Map<string, Set<string>>();
  const categoryPublishers = new Map<string, Set<string>>();
  const allCategories = new Set<string>();
  for (const item of items) {
    const categories = publisherCategories.get(item.publisher) ?? new Set<string>();
    for (const category of item.categories) {
      categories.add(category);
      allCategories.add(category);
      const publishers = categoryPublishers.get(category) ?? new Set<string>();
      publishers.add(item.publisher);
      categoryPublishers.set(category, publishers);
    }
    publisherCategories.set(item.publisher, categories);
  }

  const totalPublishers = publisherCategories.size;
  const totalCategoryCount = allCategories.size;
  const referenceTime = now ?? Math.max(0, ...items.map((item) => Date.parse(item.published_at)).filter(Number.isFinite));
  const safeLimit = Math.max(0, Math.floor(n));
  return items.map((item) => {
    const topCategory = item.categories[0] ?? '';
    const categoryImportance = totalPublishers === 0 ? 0 : (categoryPublishers.get(topCategory)?.size ?? 0) / totalPublishers;
    const publisherBreadth = totalCategoryCount === 0 ? 0 : (publisherCategories.get(item.publisher)?.size ?? 0) / totalCategoryCount;
    const hoursSince = (referenceTime - Date.parse(item.published_at)) / 3_600_000;
    const recency = Number.isFinite(hoursSince) ? Math.max(0, 1 - Math.min(hoursSince / 24, 1)) : 0;
    const summaryFactor = Math.min((item.summary?.length ?? 0) / 200, 1);
    const score = categoryImportance * publisherBreadth * recency * summaryFactor;
    return { item, score, components: { categoryImportance, publisherBreadth, recency, summaryFactor } };
  }).filter((entry) => entry.score > 0 && entry.item.summary !== null)
    .sort((a, b) => b.score - a.score || Date.parse(b.item.published_at) - Date.parse(a.item.published_at) || a.item.title.localeCompare(b.item.title))
    .slice(0, safeLimit)
    .map(({ item, score, components }) => ({ itemId: item.id, title: item.title, publisher: item.publisher, publishedAt: item.published_at, score, components }));
}
