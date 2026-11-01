import type { NewsItem } from '@/lib/types/api';

export type CoverageMatrix = { rows: string[]; cols: string[]; cells: number[][]; max: number; insufficient: boolean };

export function computeCoverageMatrix(items: NewsItem[]): CoverageMatrix {
  if (items.length === 0) return { rows: [], cols: [], cells: [], max: 0, insufficient: true };
  const publisherCounts = new Map<string, number>();
  for (const item of items) publisherCounts.set(item.publisher, (publisherCounts.get(item.publisher) ?? 0) + 1);
  const rows = [...publisherCounts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 10).map(([publisher]) => publisher);

  const categoryCounts = new Map<string, number>();
  for (const item of items) for (const category of new Set(item.categories)) categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1);
  const cols = [...categoryCounts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 8).map(([category]) => category);

  const cells = rows.map((publisher) => cols.map((category) => items.filter((item) => item.publisher === publisher && item.categories.includes(category)).length));
  const max = Math.max(1, ...cells.flat());
  return { rows, cols, cells, max, insufficient: false };
}
