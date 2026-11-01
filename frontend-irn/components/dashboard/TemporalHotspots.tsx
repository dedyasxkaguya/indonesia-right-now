'use client';

import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { ExplainTrigger } from '@/components/features/explain/ExplainTrigger';
import { formatNumber } from '@/lib/utils/format';
import { computeTemporalHotspots } from '@/lib/transformers';
import type { NewsData } from '@/lib/types/api';

function PanelHead({ title }: { title: string }) {
  return (
    <div className="mb-5">
      <div className="flex items-center gap-1">
        <h3 className="font-sans text-h3 text-ink-900">{title}</h3>
        <ExplainTrigger metricId="temporal-hotspots" />
      </div>
      <p className="mt-1 text-xs text-ink-500">
        Zona waktu Asia/Jakarta. Jam sibuk ≠ jam penting editorial.
      </p>
    </div>
  );
}

function Empty({ children }: { children: string }) {
  return <p className="text-xs text-ink-500">{children}</p>;
}

export function TemporalHotspots({ data }: { data: NewsData }) {
  const result = computeTemporalHotspots(data.items);
  const max = Math.max(1, ...result.hours.map((h) => h.count));
  const top = new Set(result.top3);

  return (
    <SurfaceCard>
      <PanelHead title="Jam Sibuk" />
      {result.insufficient ? (
        <Empty>Belum ada timestamp terbit yang dapat dibaca.</Empty>
      ) : (
        <>
          <div className="grid gap-px" style={{ gridTemplateColumns: 'repeat(24, minmax(0, 1fr))' }}>
            {result.hours.map((hour) => (
              <div className="min-w-0" key={hour.hour}>
                <p className={`mb-1 text-center font-mono text-[8px] ${top.has(hour.hour) ? 'text-brand-red' : 'text-transparent'}`}>
                  {String(hour.hour).padStart(2, '0')}
                </p>
                <div
                  aria-label={`${String(hour.hour).padStart(2, '0')}:00, ${formatNumber(hour.count)} artikel`}
                  className="h-10 bg-brand-red"
                  role="img"
                  style={{ opacity: hour.count === 0 ? 0.08 : Math.max(0.15, hour.count / max) }}
                />
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-between font-mono text-[9px] text-ink-400">
            <span>00</span>
            <span>06</span>
            <span>12</span>
            <span>18</span>
            <span>23</span>
          </div>
        </>
      )}
    </SurfaceCard>
  );
}
