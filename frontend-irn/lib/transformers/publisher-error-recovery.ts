import type { NewsSource } from '@/lib/types/api';

export type ErrorCodeRow = { code: string; count: number; publishers: string[] };

export function computePublisherErrorRecovery(sources: NewsSource[]): { codes: ErrorCodeRow[]; insufficient: boolean } {
  const groups = new Map<string, { count: number; publishers: string[] }>();

  for (const source of sources) {
    if (source.status !== 'error' || source.error === null) continue;
    const group = groups.get(source.error.code) ?? { count: 0, publishers: [] };
    group.count += 1;
    group.publishers.push(source.publisher);
    groups.set(source.error.code, group);
  }

  const codes = [...groups.entries()]
    .map(([code, group]) => ({ code, count: group.count, publishers: group.publishers }))
    .sort((a, b) => b.count - a.count || a.code.localeCompare(b.code));

  return { codes, insufficient: codes.length === 0 };
}
