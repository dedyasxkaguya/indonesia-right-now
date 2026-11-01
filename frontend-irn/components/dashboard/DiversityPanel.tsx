'use client';

import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { ExplainTrigger } from '@/components/features/explain/ExplainTrigger';
import { formatNumber } from '@/lib/utils/format';
import { computeCategorySourceDiversity } from '@/lib/transformers';
import type { NewsData } from '@/lib/types/api';

function PanelHead({ title }: { title: string }) {
  return (
    <div className="mb-5">
      <div className="flex items-center gap-1">
        <h3 className="font-sans text-h3 text-ink-900">{title}</h3>
        <ExplainTrigger metricId="category-source-diversity" />
      </div>
      <p className="mt-1 text-xs text-ink-500">Jumlah publisher berbeda per kategori. Banyak publisher ≠ banyak perspektif.</p>
    </div>
  );
}

function Empty({ children }: { children: string }) {
  return <p className="text-xs text-ink-500">{children}</p>;
}

export function DiversityPanel({ data }: { data: NewsData }) {
  const result = computeCategorySourceDiversity(data.items);
  const max = Math.max(1, ...result.categories.map((row) => row.publisherCount));
  return (
    <SurfaceCard>
      <PanelHead title="Keberagaman Sumber per Kategori" />
      {result.insufficient ? (
        <Empty>Belum ada kategori pada snapshot ini.</Empty>
      ) : (
        <ul className="space-y-3">
          {result.categories.map((row) => (
            <li key={row.category}>
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="min-w-0 truncate text-ink-700">{row.category}</span>
                <span className="shrink-0 font-mono text-[10px] text-ink-500">{formatNumber(row.itemCount)} artikel</span>
              </div>
              <div
                aria-label={`${row.category}: ${formatNumber(row.publisherCount)} publisher`}
                className="mt-1 h-1.5 bg-paper-200"
                role="img"
              >
                <div
                  className="h-full bg-brand-red"
                  style={{ width: `${(row.publisherCount / max) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </SurfaceCard>
  );
}
