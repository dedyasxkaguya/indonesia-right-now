'use client';

import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { ExplainTrigger } from '@/components/features/explain/ExplainTrigger';
import { formatNumber } from '@/lib/utils/format';
import { computeRecentPublishRate, type RateRow } from '@/lib/transformers';
import type { NewsData } from '@/lib/types/api';

function PanelHead({ title }: { title: string }) {
  return (
    <div className="mb-5">
      <div className="flex items-center gap-1">
        <h3 className="font-sans text-h3 text-ink-900">{title}</h3>
        <ExplainTrigger metricId="recent-publish-rate" />
      </div>
      <p className="mt-1 text-xs text-ink-500">Aktivitas terbaru per publisher, bukan kualitas atau kepentingan.</p>
    </div>
  );
}

function Empty({ children }: { children: string }) {
  return <p className="text-xs text-ink-500">{children}</p>;
}

export function PublishRatePanel({ data }: { data: NewsData }) {
  const result = computeRecentPublishRate(data.items, Date.now());
  const max = Math.max(1, ...result.publishers.map((row: RateRow) => row.last6h));
  return (
    <SurfaceCard>
      <PanelHead title="Laju Publikasi Terbaru" />
      {result.insufficient ? (
        <Empty>Belum ada publisher pada snapshot ini.</Empty>
      ) : (
        <ul className="space-y-3">
          {result.publishers.map((row) => (
            <li key={row.publisher}>
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="min-w-0 truncate text-ink-700">{row.publisher}</span>
                <span className="shrink-0 font-mono text-[10px] text-ink-500">
                  {formatNumber(row.last1h)} / {formatNumber(row.last6h)}
                </span>
              </div>
              <div className="mt-1 space-y-0.5">
                <div
                  aria-label={`${row.publisher}, 1 jam: ${formatNumber(row.last1h)}`}
                  className="h-1 bg-paper-200"
                  role="img"
                >
                  <div className="h-full bg-brand-red" style={{ width: `${(row.last1h / max) * 100}%` }} />
                </div>
                <div
                  aria-label={`${row.publisher}, 6 jam: ${formatNumber(row.last6h)}`}
                  className="h-1 bg-paper-200"
                  role="img"
                >
                  <div className="h-full bg-ink-400" style={{ width: `${(row.last6h / max) * 100}%` }} />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 font-mono text-[10px] text-ink-400">merah: 1 jam·abu: 6 jam</p>
    </SurfaceCard>
  );
}
