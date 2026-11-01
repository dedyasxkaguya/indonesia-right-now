'use client';

import Link from 'next/link';
import { ExplainTrigger } from '@/components/features/explain/ExplainTrigger';
import type { NewsItem } from '@/lib/types/api';

export function RelatedPublishers({ domain, items }: { domain: string; items: NewsItem[] }) {
  const categoriesByPublisher = new Map<string, Map<string, number>>();
  const domainsByPublisher = new Map<string, string>();
  for (const item of items) {
    const categories = categoriesByPublisher.get(item.publisher_domain) ?? new Map<string, number>();
    for (const category of new Set(item.categories)) categories.set(category, (categories.get(category) ?? 0) + 1);
    categoriesByPublisher.set(item.publisher_domain, categories);
    domainsByPublisher.set(item.publisher_domain, item.publisher);
  }
  const ownCategories = [...(categoriesByPublisher.get(domain) ?? new Map())].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 3).map(([category]) => category);
  const related = [...categoriesByPublisher.entries()].filter(([otherDomain]) => otherDomain !== domain).map(([otherDomain, categories]) => ({
    domain: otherDomain,
    name: domainsByPublisher.get(otherDomain) ?? otherDomain,
    overlap: ownCategories.filter((category) => categories.has(category)).length,
  })).sort((a, b) => b.overlap - a.overlap || a.name.localeCompare(b.name)).slice(0, 3);
  return <section className="border-t border-paper-300 pt-6">
    <h2 className="flex items-center gap-1 font-sans text-h3 text-ink-900">Publisher terkait <ExplainTrigger context={{ publisherDomain: domain }} metricId="publisher-overlap" /></h2>
    <p className="mt-1 text-xs text-ink-500">Berdasarkan irisan kategori teratas pada snapshot ini.</p>
    {related.length ? <ul className="mt-4 divide-y divide-paper-300 border-y border-paper-300">{related.map((entry) => <li key={entry.domain}><Link className="flex items-center justify-between gap-3 py-3 text-sm text-ink-700 hover:text-brand-red" href={`/publisher/${encodeURIComponent(entry.domain)}`}><span className="min-w-0 truncate">{entry.name}</span><span className="shrink-0 font-mono text-[10px] text-ink-400">{entry.overlap} kategori</span></Link></li>)}</ul> : <p className="mt-3 text-sm text-ink-500">Belum ada publisher terkait pada snapshot ini.</p>}
  </section>;
}
