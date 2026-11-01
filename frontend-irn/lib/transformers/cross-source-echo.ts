import type { NewsItem } from '@/lib/types/api';

export type EchoCluster = {
  normalizedTitle: string;
  displayTitle: string;
  publishers: string[];
  itemIds: string[];
  publisherCount: number;
};

export type CrossSourceEchoResult = { echoes: EchoCluster[]; totalEchoes: number; insufficient: boolean };

function normalizeTitle(title: string): string {
  return title
    .toLocaleLowerCase('id')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .sort()
    .join(' ');
}

export function computeCrossSourceEcho(items: NewsItem[]): CrossSourceEchoResult {
  const groups = new Map<string, NewsItem[]>();
  for (const item of items) {
    const key = normalizeTitle(item.title);
    if (!key) continue;
    const group = groups.get(key) ?? [];
    group.push(item);
    groups.set(key, group);
  }

  const echoes = [...groups.entries()]
    .map(([normalizedTitle, group]) => {
      const publishers = [...new Set(group.map((item) => item.publisher))];
      return {
        normalizedTitle,
        displayTitle: group[0].title,
        publishers,
        itemIds: group.map((item) => item.id),
        publisherCount: publishers.length,
      };
    })
    .filter((echo) => echo.publisherCount >= 2)
    .sort((a, b) => b.publisherCount - a.publisherCount || a.normalizedTitle.localeCompare(b.normalizedTitle))
    .slice(0, 20);

  const totalEchoes = echoes.reduce((sum, echo) => sum + echo.itemIds.length, 0);
  return { echoes, totalEchoes, insufficient: items.length < 2 || echoes.length === 0 };
}
