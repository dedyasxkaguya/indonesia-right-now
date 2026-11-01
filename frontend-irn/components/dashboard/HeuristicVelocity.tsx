'use client';

import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { ExplainTrigger } from '@/components/features/explain/ExplainTrigger';
import { ArrowDown, ArrowRight, ArrowUp, Minus } from 'lucide-react';
import { formatNumber, formatPercent } from '@/lib/utils/format';
import { computeHeuristicVelocity } from '@/lib/transformers';
import type { NewsData } from '@/lib/types/api';

function PanelHead({ title }: { title: string }) {
  return (
    <div className="mb-5">
      <div className="flex items-center gap-1">
        <h3 className="font-sans text-h3 text-ink-900">{title}</h3>
        <ExplainTrigger metricId="heuristic-velocity" />
      </div>
      <p className="mt-1 text-xs text-ink-500">
        Heuristik 4 jam vs 4 jam sebelumnya. Selisih &lt; 5% dianggap flat.
      </p>
    </div>
  );
}

function Empty({ children }: { children: string }) {
  return <p className="text-xs text-ink-500">{children}</p>;
}

function icon(direction: 'up' | 'down' | 'flat') {
  return direction === 'up' ? (
    <ArrowUp aria-hidden="true" className="size-3 text-brand-red" />
  ) : direction === 'down' ? (
    <ArrowDown aria-hidden="true" className="size-3 text-ink-500" />
  ) : (
    <Minus aria-hidden="true" className="size-3 text-ink-400" />
  );
}

export function HeuristicVelocity({ data, now }: { data: NewsData; now: number }) {
  const result = computeHeuristicVelocity(data.items, now);
  return (
    <SurfaceCard>
      <PanelHead title="Kecepatan Kategori (Heuristik)" />
      {result.insufficient ? (
        <Empty>Butuh setidaknya dua artikel untuk membandingkan jendela waktu.</Empty>
      ) : (
        <ul className="divide-y divide-paper-300">
          {result.categories.map((row) => (
            <li className="flex items-center justify-between gap-3 py-2.5" key={row.category}>
              <span className="min-w-0 truncate text-xs text-ink-700">{row.category}</span>
              <span className="flex shrink-0 items-center gap-2">
                <span aria-hidden="true" className="flex h-3 items-end gap-0.5">
                  <span className="w-1 bg-ink-300" style={{ height: `${Math.max(2, (row.prev4h / Math.max(1, row.last4h, row.prev4h)) * 12)}px` }} />
                  <span className="w-1 bg-brand-red" style={{ height: `${Math.max(2, (row.last4h / Math.max(1, row.last4h, row.prev4h)) * 12)}px` }} />
                </span>
                <span className="flex items-center gap-1.5 font-mono text-[11px] text-ink-900">
                  <>{icon(row.direction)}{formatPercent(row.deltaPct)}</>
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 font-mono text-[10px] text-ink-400">proyeksi 4 jam ke depan jika laju berlanjut</p>
    </SurfaceCard>
  );
}
