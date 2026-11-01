'use client';

import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { ExplainTrigger } from '@/components/features/explain/ExplainTrigger';
import { formatNumber, formatPercent } from '@/lib/utils/format';
import { computeStoryClusters } from '@/lib/transformers';
import { useState } from 'react';
import type { NewsData } from '@/lib/types/api';

function PanelHead({ title }: { title: string }) {
  return (
    <div className="mb-5">
      <div className="flex items-center gap-1">
        <h3 className="font-sans text-h3 text-ink-900">{title}</h3>
        <ExplainTrigger metricId="story-clusters" />
      </div>
      <p className="mt-1 text-xs text-ink-500">
        Token judul dengan ambang Jaccard 0,4 — lebih longgar dari halaman depan (0,5).
      </p>
    </div>
  );
}

function Empty({ children }: { children: string }) {
  return <p className="text-xs text-ink-500">{children}</p>;
}

export function StoryClustersPanel({ data }: { data: NewsData }) {
  const result = computeStoryClusters(data.items);
  const [expanded, setExpanded] = useState<string | null>(null);
  const titleById = useState(() => new Map(data.items.map((item) => [item.id, item.title])))[0];

  return (
    <SurfaceCard>
      <PanelHead title="Klaster Cerita" />
      {result.insufficient ? (
        <Empty>Belum ada klaster berisi lebih dari satu artikel.</Empty>
      ) : (
        <ul className="divide-y divide-paper-300">
          {result.clusters
            .filter((c) => c.size > 1)
            .slice(0, 10)
            .map((cluster) => {
              const open = expanded === cluster.representativeTitle;
              return (
                <li className="py-2.5" key={cluster.representativeTitle}>
                  <button
                    aria-expanded={open}
                    className="flex w-full items-start justify-between gap-3 text-left"
                    onClick={() => setExpanded(open ? null : cluster.representativeTitle)}
                    type="button"
                  >
                    <span className="min-w-0 text-xs leading-5 text-ink-900">
                      {cluster.representativeTitle}
                    </span>
                    <span className="shrink-0 rounded-pill bg-brand-red/10 px-2 py-0.5 font-mono text-[10px] text-brand-red">
                      {formatNumber(cluster.size)} artikel
                    </span>
                  </button>
                  {open && (
                    <ul className="mt-2 space-y-1 border-l border-paper-300 pl-3">
                      {cluster.ids.map((id) => (
                        <li className="text-[11px] leading-5 text-ink-500" key={id}>
                          {titleById.get(id) ?? id}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
        </ul>
      )}
    </SurfaceCard>
  );
}
