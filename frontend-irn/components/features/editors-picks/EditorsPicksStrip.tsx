'use client';

import { formatDistanceToNow } from 'date-fns';
import { id } from 'date-fns/locale';
import { ExplainTrigger } from '@/components/features/explain/ExplainTrigger';
import { useExplain } from '@/components/features/explain/ExplainProvider';
import { computeEditorsPicks } from '@/lib/transformers';
import type { NewsData } from '@/lib/types/api';

export function EditorsPicksStrip({ data }: { data: NewsData }) {
  const { openExplain } = useExplain();
  const referenceTime = Date.parse(data.generated_at);
  const picks = computeEditorsPicks(data.items, 5, referenceTime);
  if (!picks.length) return null;
  return <section aria-label="Pilihan editor" className="mb-8">
    <div className="flex items-center gap-2 border-l border-brand-red pl-3">
      <h3 className="font-mono text-eyebrow uppercase text-ink-500">Pilihan editor</h3>
      <ExplainTrigger context={{ itemId: picks[0].itemId }} metricId="editors-pick-reason" />
    </div>
    <div className="mt-3 flex snap-x gap-0 overflow-x-auto border-y border-paper-300">
      {picks.map((pick, index) => <button className={`min-w-[220px] max-w-[320px] flex-1 snap-start py-4 pr-5 text-left ${index ? 'border-l border-paper-300 pl-5' : ''}`} key={pick.itemId} onClick={() => openExplain('editors-pick-reason', { itemId: pick.itemId })} type="button">
        <span className="line-clamp-2 block font-sans text-h3 text-ink-900">{pick.title}</span>
        <span className="mt-2 block font-sans text-caption text-ink-500">{pick.publisher} · {formatDistanceToNow(new Date(pick.publishedAt), { addSuffix: true, locale: id })}</span>
      </button>)}
    </div>
  </section>;
}
