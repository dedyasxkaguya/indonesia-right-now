'use client';

import { useEffect, useId, useRef } from 'react';
import ReactEChartsCore from 'echarts-for-react/lib/core';
import type { EChartsOption } from 'echarts';
import { echarts } from './echarts-runtime';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { getIgsLabel } from '@/lib/igs-labels';

export type ChartTableRow = Record<string, string | number | null>;

function formatCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return 'Data tidak tersedia';
  return typeof value === 'number'
    ? new Intl.NumberFormat('id-ID', { maximumFractionDigits: 4 }).format(value)
    : value;
}

export function EChartPanel({
  title,
  description,
  option,
  rows,
  columns,
  height = 340,
  minWidth = 360,
  className,
  onPointClick,
}: {
  title: string;
  description: string;
  option: EChartsOption;
  rows: ChartTableRow[];
  columns: { key: string; label: string }[];
  height?: number;
  minWidth?: number;
  className?: string;
  onPointClick?: (params: { data?: unknown }) => void;
}) {
  const id = useId().replaceAll(':', '');
  const titleId = `${id}-title`;
  const descId = `${id}-description`;
  const chartRef = useRef<ReactEChartsCore>(null);
  const chartHostRef = useRef<HTMLDivElement>(null);
  const onEvents = onPointClick ? { click: onPointClick } : undefined;
  const isTallChart = height >= 600;

  useEffect(() => {
    const host = chartHostRef.current;
    if (!host) return;
    const resize = () => chartRef.current?.getEchartsInstance().resize();
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    window.addEventListener('orientationchange', resize);
    return () => {
      observer.disconnect();
      window.removeEventListener('orientationchange', resize);
    };
  }, []);

  return (
    <SurfaceCard className={`min-w-0 ${className ?? ''}`}>
      <h2 id={titleId} className="font-sans text-h3 text-ink-900">{title}</h2>
      <p id={descId} className="mt-1 text-caption text-ink-500">{description}</p>
      <svg className="sr-only" role="img" aria-labelledby={`${titleId} ${descId}`} viewBox="0 0 1 1">
        <title>{title}</title>
        <desc>{description}</desc>
      </svg>
      <div
        ref={chartHostRef}
        role="img"
        aria-labelledby={`${titleId} ${descId}`}
        aria-label={`${title}. ${description}`}
        className={`mt-4 w-full overflow-x-auto ${isTallChart ? 'h-[min(65dvh,600px)] min-h-[400px] md:min-h-[600px]' : ''}`}
        style={isTallChart ? undefined : { height }}
      >
        <ReactEChartsCore
          ref={chartRef}
          echarts={echarts}
          option={option}
          notMerge
          lazyUpdate
          autoResize
          onEvents={onEvents}
          opts={{ renderer: 'svg' }}
          style={{ height: '100%', minWidth, width: '100%' }}
          className="w-full"
        />
      </div>
      <p className="mt-2 text-xs text-ink-500">Cara membaca: {description}</p>
      <details className="mt-3 border-t border-paper-200 pt-3">
        <summary className="cursor-pointer font-mono text-[11px] text-ink-500">Lihat data sebagai tabel ({rows.length} baris)</summary>
        <div className="mt-3 max-h-64 overflow-auto">
          <table className="w-full min-w-max text-left text-xs">
            <thead><tr className="border-b border-paper-300">{columns.map((column) => <th key={column.key} className="whitespace-nowrap py-2 pr-4 font-semibold">{getIgsLabel(column.label)}</th>)}</tr></thead>
            <tbody>{rows.map((row, index) => <tr key={`${String(row[columns[0]?.key ?? ''])}-${index}`} className="border-b border-paper-200">
              {columns.map((column) => <td key={column.key} className="whitespace-nowrap py-1.5 pr-4 font-mono">{formatCell(row[column.key])}</td>)}
            </tr>)}</tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-ink-500">Tabel memuat nilai sumber yang digunakan pada visualisasi; data yang tidak tersedia tidak diisi dengan angka pengganti.</p>
      </details>
    </SurfaceCard>
  );
}
