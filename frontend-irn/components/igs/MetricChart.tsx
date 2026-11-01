'use client';

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useId } from 'react';
import type { DatasetRow } from '@/lib/data/schemas';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { getIgsLabel } from '@/lib/igs-labels';
import { formatDecimal, formatRupiahByUnit } from '@/lib/utils/format-number';

export type ChartKind = 'bar' | 'line' | 'area' | 'scatter';

type MetricChartProps = {
  title: string;
  description: string;
  data: DatasetRow[];
  xKey: string;
  yKey: string;
  kind?: ChartKind;
  color?: string;
  barColors?: string[];
  unit?: string;
  currencyUnit?: string;
  className?: string;
};

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function MetricChart({
  title,
  description,
  data,
  xKey,
  yKey,
  kind = 'bar',
  color = '#0E4A6F',
  barColors,
  unit = '',
  currencyUnit,
  className,
}: MetricChartProps) {
  const id = useId().replaceAll(':', '');
  const titleId = `${id}-title`;
  const descriptionId = `${id}-description`;
  const chartData = data.filter((row) => row[xKey] !== null && isNumber(row[yKey]));
  const formatMetric = (value: number) => currencyUnit
    ? formatRupiahByUnit(value, currencyUnit)
    : `${formatDecimal(value, 4)}${unit ? ` ${unit}` : ''}`;
  const formatTableMetric = (value: unknown) => typeof value === 'number'
    ? currencyUnit ? formatRupiahByUnit(value, currencyUnit, 'full') : `${formatDecimal(value, 4)}${unit ? ` ${unit}` : ''}`
    : 'Data tidak tersedia';
  const common = (
    <>
      <CartesianGrid stroke="#D9D2C4" strokeDasharray="3 3" vertical={false} />
      <XAxis dataKey={xKey} type={kind === 'scatter' ? 'number' : 'category'} tick={{ fontSize: 10 }} tickLine={false} axisLine={{ stroke: '#D9D2C4' }} tickFormatter={kind === 'scatter' ? (value: number) => formatDecimal(value, 4) : undefined} />
      <YAxis dataKey={kind === 'scatter' ? yKey : undefined} type="number" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={currencyUnit ? 82 : 52} tickFormatter={(value: number) => formatMetric(value)} />
      <Tooltip formatter={(value: number | string) => [typeof value === 'number' ? formatMetric(value) : value, title]} />
    </>
  );

  return (
    <SurfaceCard className={`min-w-0 ${className ?? ''}`}>
      <h2 id={titleId} className="font-sans text-h3 text-ink-900">{title}</h2>
      <p id={descriptionId} className="mt-1 text-caption text-ink-500">{description}</p>
      <svg className="sr-only" role="img" aria-labelledby={`${titleId} ${descriptionId}`} viewBox="0 0 1 1"><title>{title}</title><desc>{description}</desc></svg>
      <div role="img" aria-labelledby={`${titleId} ${descriptionId}`} aria-label={`${title}. ${description}`} className="mt-5 w-full overflow-x-auto">
        <div className="h-72 min-w-[360px]">
          <ResponsiveContainer width="100%" height="100%">
            {kind === 'line' ? (
              <LineChart data={chartData}>{common}<Line type="monotone" dataKey={yKey} stroke={color} strokeWidth={2} dot={false} connectNulls={false} /></LineChart>
            ) : kind === 'area' ? (
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id={`${id}-area-fill`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={0.4} />
                    <stop offset="100%" stopColor={color} stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                {common}<Area type="monotone" dataKey={yKey} stroke={color} fill={`url(#${id}-area-fill)`} connectNulls={false} />
              </AreaChart>
            ) : kind === 'scatter' ? (
              <ScatterChart>{common}<Scatter data={chartData} dataKey={yKey} fill={color} /></ScatterChart>
            ) : (
              <BarChart data={chartData}>{common}<Bar dataKey={yKey} fill={color} radius={[2, 2, 0, 0]}>{chartData.map((row, index) => <Cell key={`${String(row[xKey])}-${index}`} fill={barColors?.[index % barColors.length] ?? color} />)}</Bar></BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>
      <p className="mt-2 text-xs text-ink-500">Cara membaca: {description}</p>
      <details className="mt-3 border-t border-paper-200 pt-3">
        <summary className="cursor-pointer font-mono text-[11px] text-ink-500">Lihat sebagai tabel ({chartData.length} baris)</summary>
        <div className="mt-3 max-h-60 overflow-auto">
          <table className="w-full text-left text-xs">
            <thead><tr className="border-b border-paper-300"><th className="py-2 pr-3 font-semibold">{getIgsLabel(xKey)}</th><th className="py-2 font-semibold">{getIgsLabel(yKey)}{currencyUnit ? ' (Rupiah)' : unit ? ` (${unit})` : ''}</th></tr></thead>
            <tbody>{chartData.map((row, index) => <tr key={`${String(row[xKey])}-${index}`} className="border-b border-paper-200"><td className="py-1.5 pr-3">{String(row[xKey])}</td><td className="py-1.5 font-mono">{formatTableMetric(row[yKey])}</td></tr>)}</tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-ink-500">Tabel memuat nilai yang digunakan pada grafik; data yang tidak tersedia tidak diisi dengan angka pengganti.</p>
      </details>
    </SurfaceCard>
  );
}
