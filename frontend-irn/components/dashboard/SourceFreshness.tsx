'use client';

import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { ExplainTrigger } from '@/components/features/explain/ExplainTrigger';
import { formatNumber, formatPercent } from '@/lib/utils/format';
import { computeSourceFreshness } from '@/lib/transformers';
import type { NewsData } from '@/lib/types/api';

function PanelHead({ title }: { title: string }) {
  return (
    <div className="mb-5">
      <div className="flex items-center gap-1">
        <h3 className="font-sans text-h3 text-ink-900">{title}</h3>
        <ExplainTrigger metricId="source-freshness" />
      </div>
      <p className="mt-1 text-xs text-ink-500">Median jeda publish ke fetch per sumber yang berstatus ok.</p>
    </div>
  );
}

function Empty({ children }: { children: string }) {
  return <p className="text-xs text-ink-500">{children}</p>;
}

export function SourceFreshness({ data }: { data: NewsData }) {
  const result = computeSourceFreshness(data.sources, data.items);
  const top = result.sources[0];
  return (
    <SurfaceCard>
      <PanelHead title="Kesegaran sumber" />
      {result.insufficient ? (
        <Empty>Belum ada data sumber yang berhasil.</Empty>
      ) : (
        <>
          <p className="font-mono text-2xl font-semibold text-ink-900">{top.publisher} · {formatNumber(top.medianMinutes)} menit</p>
          <p className="mt-1 text-xs text-ink-500">{formatNumber(top.itemCount)} artikel</p>
        </>
      )}
    </SurfaceCard>
  );
}
