
'use client';

import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { ExplainTrigger } from '@/components/features/explain/ExplainTrigger';
import { formatPercent } from '@/lib/utils/format';
import { computeSummaryCompleteness } from '@/lib/transformers';
import type { NewsData } from '@/lib/types/api';

function PanelHead({ title }: { title: string }) {
  return (
    <div className="mb-5">
      <div className="flex items-center gap-1">
        <h3 className="font-sans text-h3 text-ink-900">{title}</h3>
        <ExplainTrigger metricId="summary-completeness" />
      </div>
      <p className="mt-1 text-xs text-ink-500">Artikel dengan ringkasan tidak kosong dari backend.</p>
    </div>
  );
}

function Empty({ children }: { children: string }) {
  return <p className="text-xs text-ink-500">{children}</p>;
}

export function SummaryCompletenessPanel({ data }: { data: NewsData }) {
  const result = computeSummaryCompleteness(data.items);
  return (
    <SurfaceCard>
      <PanelHead title="Kelengkapan Ringkasan" />
      {result.insufficient ? (
        <Empty>Belum ada artikel pada snapshot ini.</Empty>
      ) : (
        <>
          <p className="font-mono text-2xl font-semibold text-brand-red">
            {formatPercent(result.pct)}
          </p>
          <p className="mt-2 font-mono text-[11px] text-ink-500">
            {result.withSummary.toLocaleString('id-ID')} dari {result.total.toLocaleString('id-ID')} artikel punya ringkasan
          </p>
        </>
      )}
    </SurfaceCard>
  );
}
