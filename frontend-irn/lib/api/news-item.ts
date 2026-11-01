import type { NewsItem } from '@/lib/types/api';

export function getNewsItemSnippet(item: Pick<NewsItem, 'summary' | 'content'>, maxLength = 200) {
  const text = item.summary?.trim() || item.content?.replace(/\s+/g, ' ').trim() || '';
  if (!text) return null;
  return text.length > maxLength ? `${text.slice(0, maxLength - 1).trimEnd()}…` : text;
}
