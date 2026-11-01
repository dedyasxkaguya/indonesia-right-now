'use client';

import { useEffect, useState } from 'react';
import type { EChartsOption } from 'echarts';
import type { FetchAIStats } from '@/lib/types/api';
import { fetchDataSchema } from '@/lib/api/schemas';
import { EChartPanel, type ChartTableRow } from './EChartPanel';

type SnapshotState = 'loading' | 'available' | 'missing' | 'invalid' | 'storage-error';

const metrics = [
  { key: 'guard_confidence', label: 'Keyakinan guard', formula: 'guard_confidence × 100' },
  { key: 'chunk_success_rate', label: 'Keberhasilan chunk', formula: 'chunks_ok ÷ chunks_total × 100' },
  { key: 'items_kept_rate', label: 'Item dipertahankan', formula: 'items_kept ÷ items_raw × 100' },
] as const;

function percentage(value: number, denominator = 1) {
  if (!Number.isFinite(value) || !Number.isFinite(denominator) || denominator <= 0) return null;
  const result = (value / denominator) * 100;
  return result >= 0 && result <= 100 ? result : null;
}

function toMetricValues(ai: FetchAIStats | null) {
  if (!ai) return [null, null, null];
  return [
    Number.isFinite(ai.guard_confidence) && ai.guard_confidence >= 0 && ai.guard_confidence <= 1
      ? percentage(ai.guard_confidence)
      : null,
    ai.chunks_ok >= 0 && ai.chunks_total >= ai.chunks_ok
      ? percentage(ai.chunks_ok, ai.chunks_total)
      : null,
    ai.items_kept >= 0 && ai.items_raw >= ai.items_kept
      ? percentage(ai.items_kept, ai.items_raw)
      : null,
  ];
}

export function FetchQualityGauges() {
  const [snapshot, setSnapshot] = useState<FetchAIStats | null>(null);
  const [state, setState] = useState<SnapshotState>('loading');

  useEffect(() => {
    let raw: string | null;
    try {
      raw = window.sessionStorage.getItem('irn:lastFetch:v1');
    } catch {
      setState('storage-error');
      return;
    }
    if (raw === null) {
      setState('missing');
      return;
    }

    let candidate: unknown;
    try {
      candidate = JSON.parse(raw);
    } catch {
      setState('invalid');
      return;
    }
    const parsed = fetchDataSchema.safeParse(candidate);
    if (!parsed.success) {
      setState('invalid');
      return;
    }
    setSnapshot(parsed.data.ai);
    setState('available');
  }, []);

  const values = toMetricValues(snapshot);
  const descriptions: Record<SnapshotState, string> = {
    loading: 'Membaca snapshot /fetch dari sesi browser.',
    available: 'Nilai berasal dari snapshot /fetch terakhir pada sesi browser; rasio dihitung dari penghitung di dalam snapshot.',
    missing: 'Snapshot /fetch belum tersedia pada sesi ini. Gauge tetap ditampilkan tanpa mengisi angka contoh.',
    invalid: 'Snapshot sesi tidak cocok dengan skema /fetch dan tidak ditampilkan.',
    'storage-error': 'Penyimpanan sesi tidak dapat dibaca; nilai tidak tersedia.',
  };
  const rows: ChartTableRow[] = metrics.map((metric, index) => ({
    metrik: metric.label,
    nilai_persen: values[index] === null ? null : Number(values[index]?.toFixed(2)),
    rumus: metric.formula,
  }));
  const option: EChartsOption = {
    tooltip: { formatter: (params) => {
      const point = params as { name?: string; value?: number };
      return point.value === undefined ? `${point.name ?? ''}: data belum tersedia` : `${point.name ?? ''}: ${point.value.toFixed(2)}%`;
    } },
    series: metrics.map((metric, index) => ({
      type: 'gauge',
      name: metric.label,
      center: [`${17 + index * 33}%`, '56%'],
      radius: '76%',
      min: 0,
      max: 100,
      startAngle: 210,
      endAngle: -30,
      axisLine: { lineStyle: { width: 9, color: [[0.5, '#0E4A6F'], [0.8, '#0891B2'], [1, '#C69C4B']] } },
      axisTick: { show: false },
      splitLine: { show: false },
      axisLabel: { show: false },
      pointer: { show: values[index] !== null, length: '58%', width: 4 },
      anchor: { show: values[index] !== null, size: 6 },
      title: { show: true, offsetCenter: [0, '68%'], fontSize: 11 },
      detail: {
        show: true,
        offsetCenter: [0, '40%'],
        valueAnimation: true,
        formatter: values[index] === null ? '—' : '{value}%',
        fontSize: 14,
      },
      data: values[index] === null ? [] : [{ value: values[index] as number, name: metric.label }],
    })),
  };

  return <EChartPanel
    title="Indikator kualitas pipeline AI"
    description={descriptions[state]}
    option={option}
    rows={rows}
    columns={[
      { key: 'metrik', label: 'Metrik' },
      { key: 'nilai_persen', label: 'Nilai (%)' },
      { key: 'rumus', label: 'Rumus / sumber' },
    ]}
    height={280}
  />;
}
