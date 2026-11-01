'use client';

import { useEffect, useMemo, useState } from 'react';
import Papa from 'papaparse';
import * as Tooltip from '@radix-ui/react-tooltip';
import { Download, ChevronDown, ChevronUp } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ExplainTrigger } from '@/components/features/explain/ExplainTrigger';
import { CoverageLegend } from '@/components/features/heatmap/CoverageLegend';
import { Button } from '@/components/ui/Button';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { StateCard } from '@/components/ui/StateCard';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { computeCoverageMatrix } from '@/lib/transformers';
import { formatNumber } from '@/lib/utils/format';
import type { NewsData } from '@/lib/types/api';

export function CoverageMatrixPanel({ data }: { data: NewsData }) {
  const router = useRouter();
  const matrix = useMemo(() => computeCoverageMatrix(data.items), [data.items]);
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    try { setExpanded(window.localStorage.getItem('irn:heatmapOpen:v1') === 'true'); } catch { setExpanded(false); }
  }, []);
  function toggle() {
    const next = !expanded;
    setExpanded(next);
    try { window.localStorage.setItem('irn:heatmapOpen:v1', String(next)); } catch { /* Optional preference marker. */ }
  }
  function exportCsv() {
    try {
      const rows = matrix.rows.map((publisher, rowIndex) => ({ Publisher: publisher, ...Object.fromEntries(matrix.cols.map((category, columnIndex) => [category, matrix.cells[rowIndex]?.[columnIndex] ?? 0])) }));
      const csv = `\uFEFF${Papa.unparse(rows, { columns: ['Publisher', ...matrix.cols] })}`;
      const blobUrl = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
      const anchor = document.createElement('a');
      anchor.href = blobUrl;
      anchor.download = `coverage_${data.date}.csv`;
      anchor.click();
      URL.revokeObjectURL(blobUrl);
    } catch { toast.error('CSV tidak dapat diekspor.'); }
  }
  function filterUrl(publisher?: string, category?: string) {
    const params = new URLSearchParams();
    if (publisher) params.set('pub', publisher);
    if (category) params.set('cat', category);
    router.push(`/dashboard?${params.toString()}`);
  }

  return <SurfaceCard className="mt-8 p-5 sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-1"><SectionHeader className="mb-0" index="04" title="Cakupan Kategori × Publisher" /><ExplainTrigger metricId="coverage-matrix" /></div>
      <div className="flex items-center gap-2">{expanded && !matrix.insufficient ? <Button onClick={exportCsv} variant="ghost"><Download aria-hidden="true" className="size-4" /> Ekspor CSV</Button> : null}<Button onClick={toggle} variant="secondary">{expanded ? <ChevronUp aria-hidden="true" className="size-4" /> : <ChevronDown aria-hidden="true" className="size-4" />}{expanded ? 'Sembunyikan' : 'Tampilkan Heatmap'}</Button></div>
    </div>
    {expanded ? matrix.insufficient ? <div className="mt-5"><StateCard variant="empty" title="Data tidak cukup untuk heatmap." /></div> : <Tooltip.Provider delayDuration={200}><div className="mt-6 overflow-x-auto pb-2">
      <div aria-label="Matriks cakupan kategori dan publisher" className="grid min-w-[760px] gap-px bg-paper-300" role="grid" style={{ gridTemplateColumns: `minmax(140px, 1.4fr) repeat(${matrix.cols.length}, minmax(0, 1fr))` }}>
        <div className="bg-paper-100" role="columnheader" />
        {matrix.cols.map((category) => <button className="min-w-0 bg-paper-100 px-1 py-2 text-center font-mono text-[10px] text-ink-500 hover:text-brand-red" key={`heading:${category}`} onClick={() => filterUrl(undefined, category)} role="columnheader" title={`Filter kategori ${category}`} type="button">{category}</button>)}
        {matrix.rows.flatMap((publisher, rowIndex) => {
          const domain = data.items.find((item) => item.publisher === publisher)?.publisher_domain;
          return [<button className="min-w-0 truncate bg-paper-100 px-2 py-2 text-left font-mono text-[10px] text-ink-700 hover:text-brand-red" key={`publisher:${publisher}`} onClick={() => { if (domain) router.push(`/publisher/${encodeURIComponent(domain)}`); }} role="rowheader" title={publisher} type="button">{publisher}</button>, ...matrix.cols.map((category, columnIndex) => {
            const value = matrix.cells[rowIndex]?.[columnIndex] ?? 0;
            const ratio = value / matrix.max;
            const color = value === 0 ? '#EDE8DF' : `color-mix(in oklch, #FDFBF6, #D32F2F ${ratio * 100}%)`;
            const searchParams = new URLSearchParams();
            searchParams.set('pub', publisher);
            searchParams.set('cat', category);
            return <Tooltip.Root key={`cell:${publisher}:${category}`}><Tooltip.Trigger asChild><button aria-label={`${publisher} · ${category} · ${formatNumber(value)} artikel`} className={`flex min-h-11 items-center justify-center bg-paper-100 font-mono text-caption transition-colors hover:ring-2 hover:ring-inset hover:ring-brand-red ${value ? 'cursor-pointer' : 'cursor-default'}`} onClick={() => { if (value) router.push(`/dashboard?${searchParams.toString()}`); }} role="gridcell" style={{ backgroundColor: color, color: ratio >= 0.5 ? '#E8E5E0' : '#141414' }} type="button">{value ? value : null}</button></Tooltip.Trigger><Tooltip.Portal><Tooltip.Content className="z-[70] border border-paper-300 bg-paper-50 px-3 py-2 font-mono text-[10px] text-ink-700 shadow-lg" sideOffset={4}>{publisher} · {category}<span className="block">{formatNumber(value)} artikel</span><Tooltip.Arrow className="fill-paper-50" /></Tooltip.Content></Tooltip.Portal></Tooltip.Root>;
          })];
        })}
      </div>
    </div><CoverageLegend categories={matrix.cols.length} max={matrix.max} publishers={matrix.rows.length} /></Tooltip.Provider> : null}
  </SurfaceCard>;
}
