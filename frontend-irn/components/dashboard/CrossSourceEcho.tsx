'use client';

import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { ExplainTrigger } from '@/components/features/explain/ExplainTrigger';
import { formatNumber } from '@/lib/utils/format';
import { computeCrossSourceEcho } from '@/lib/transformers';
import type { NewsData } from '@/lib/types/api';

function PanelHead({ title }: { title: string }) {
  return (
    <div className="mb-5">
      <div className="flex items-center gap-1">
        <h3 className="font-sans text-h3 text-ink-900">{title}</h3>
        <ExplainTrigger metricId="cross-source-echo" />
      </div>
      <p className="mt-1 text-xs text-ink-500">Judul yang sama setelah normalisasi, muncul di beberapa publisher.</p>
    </div>
  );
}

function Empty({ children }: { children: string }) {
  return <p className="text-xs text-ink-500">{children}</p>;
}

export function CrossSourceEcho({ data }: { data: NewsData }) {
  const result = computeCrossSourceEcho(data.items);
  const max = Math.max(1, ...result.echoes.map((e) => e.publisherCount));

  return (
    <SurfaceCard>
      <PanelHead title="Gema Lintas Sumber" />
      {result.insufficient ? (
        <Empty>Belum ada judul yang muncul di lebih dari satu publisher.</Empty>
      ) : (
        <ul className="space-y-4">
          {result.echoes.slice(0, 8).map((echo) => (
            <li key={echo.normalizedTitle}>
              <p className="truncate font-sans text-xs font-semibold text-ink-900" title={echo.displayTitle}>
                {echo.displayTitle.length > 40 ? `${echo.displayTitle.slice(0, 40)}…` : echo.displayTitle}
              </p>
              <div className="mt-1.5 flex items-center gap-2">
                <div aria-hidden="true" className="h-1.5 min-w-0 flex-1 bg-paper-200">
                  <div className="h-full bg-brand-red" style={{ width: `${(echo.publisherCount / max) * 100}%` }} />
                </div>
                <span className="shrink-0 font-mono text-[10px] text-ink-500">
                  {formatNumber(echo.publisherCount)}
                </span>
              </div>
              <p className="mt-1.5 flex flex-wrap gap-1">
                {echo.publishers.map((publisher) => (
                  <span
                    className="rounded-pill bg-paper-200 px-2 py-0.5 font-mono text-[10px] text-ink-700"
                    key={`${echo.normalizedTitle}:${publisher}`}
                  >
                    {publisher}
                  </span>
                ))}
              </p>
            </li>
          ))}
        </ul>
      )}
    </SurfaceCard>
  );
}
