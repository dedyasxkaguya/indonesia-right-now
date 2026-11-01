'use client';

import type { EChartsOption } from 'echarts';
import { EChartPanel } from '@/components/igs/EChartPanel';
import { IGS_PALETTE, igsAxis, igsAxisLabel, igsTooltip } from '@/lib/charts/igs-theme';
import type { CrossInsight, InsightPairRow } from '@/lib/gov/cross-insights';
import { medianOf } from '@/lib/gov/cross-insights';

const MONO = '"IBM Plex Mono", ui-monospace, monospace';

function formatNumberId(value: number): string {
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(value);
}

type PanelRow = Record<string, string | number | null>;

function toTableRows(rows: InsightPairRow[]): { tableRows: PanelRow[]; quadrants: (string | null)[] } {
  const medianA = medianOf(rows.map((row) => row.a));
  const medianB = medianOf(rows.map((row) => row.b));
  const quadrants = rows.map((row) => {
    const rightA = row.a >= medianA;
    const topB = row.b >= medianB;
    if (rightA && topB) return 'Kanan atas';
    if (!rightA && topB) return 'Kiri atas';
    if (!rightA && !topB) return 'Kiri bawah';
    return 'Kanan bawah';
  });
  const tableRows = rows.map((row, index) => ({
    provinsi: row.name,
    metrik_a: Number(row.a.toFixed(4)),
    metrik_b: Number(row.b.toFixed(4)),
    kuadran: quadrants[index],
  }));
  return { tableRows, quadrants };
}

function buildQuadrantOption(insight: CrossInsight) {
  const rows = insight.data.rows;
  const medianA = medianOf(rows.map((row) => row.a));
  const medianB = medianOf(rows.map((row) => row.b));
  const labels = insight.quadrant_labels ?? {
    tl: 'Kiri atas', tr: 'Kanan atas', bl: 'Kiri bawah', br: 'Kanan bawah',
  };

  const option: EChartsOption = {
    color: [IGS_PALETTE.navy],
    tooltip: igsTooltip({
      trigger: 'item',
      formatter: (params: unknown) => {
        const point = params as { data?: { value?: [number, number]; name?: string } };
        const value = point.data?.value;
        if (!value) return '';
        return [
          `<strong>${point.data?.name ?? ''}</strong>`,
          `${insight.metric_a.label}: ${formatNumberId(value[0])}`,
          `${insight.metric_b.label}: ${formatNumberId(value[1])}`,
        ].join('<br/>');
      },
    }),
    grid: { left: 70, right: 30, top: 30, bottom: 46 },
    xAxis: {
      type: 'value',
      scale: true,
      name: insight.metric_a.label,
      nameLocation: 'middle',
      nameGap: 30,
      ...igsAxis({ axisLabel: igsAxisLabel({ formatter: (value: number) => new Intl.NumberFormat('id-ID', { notation: 'compact' }).format(value) }) }),
    },
    yAxis: {
      type: 'value',
      scale: true,
      name: insight.metric_b.label,
      ...igsAxis({ axisLabel: igsAxisLabel({ fontSize: 10 }) }),
    },
    series: [
      {
        type: 'scatter',
        symbolSize: 12,
        data: rows.map((row) => ({
          name: row.name,
          value: [row.a, row.b] as [number, number],
          itemStyle: {
            color: row.a >= medianA
              ? (row.b >= medianB ? IGS_PALETTE.navy : IGS_PALETTE.cyan)
              : (row.b >= medianB ? IGS_PALETTE.hairline : IGS_PALETTE.amber),
          },
        })),
        markLine: {
          silent: true,
          symbol: 'none',
          lineStyle: { color: IGS_PALETTE.muted, type: 'dashed', width: 1 },
          label: { fontFamily: MONO, fontSize: 10, formatter: 'median' },
          data: [
            { xAxis: medianA },
            { yAxis: medianB },
          ],
        },
      },
    ],
    graphic: [
      { type: 'text', left: 90, top: 40, style: { text: labels.tl, fill: IGS_PALETTE.muted, fontSize: 10, fontFamily: MONO } },
      { type: 'text', right: 40, top: 40, style: { text: labels.tr, fill: IGS_PALETTE.muted, fontSize: 10, fontFamily: MONO } },
      { type: 'text', left: 90, bottom: 60, style: { text: labels.bl, fill: IGS_PALETTE.muted, fontSize: 10, fontFamily: MONO } },
      { type: 'text', right: 40, bottom: 60, style: { text: labels.br, fill: '#B45309', fontSize: 10, fontFamily: MONO } },
    ],
  };
  return option;
}

function buildBubbleOption(insight: CrossInsight) {
  const rows = insight.data.rows;
  const maxA = Math.max(...rows.map((row) => row.a), 1);
  const option: EChartsOption = {
    color: [IGS_PALETTE.navy],
    tooltip: igsTooltip({
      trigger: 'item',
      formatter: (params: unknown) => {
        const point = params as { data?: { value?: [number, number]; name?: string; a?: number } };
        const value = point.data?.value;
        if (!value) return '';
        return [
          `<strong>${point.data?.name ?? ''}</strong>`,
          `${insight.metric_a.label}: ${formatNumberId(point.data?.a ?? value[1])}`,
          `${insight.metric_b.label}: ${formatNumberId(value[0])}`,
        ].join('<br/>');
      },
    }),
    grid: { left: 70, right: 40, top: 30, bottom: 46 },
    xAxis: {
      type: 'value',
      scale: true,
      min: 40,
      max: 85,
      name: insight.metric_b.label,
      nameLocation: 'middle',
      nameGap: 30,
      ...igsAxis({ axisLabel: igsAxisLabel({ fontSize: 10 }) }),
    },
    yAxis: {
      type: 'value',
      scale: true,
      minInterval: 1,
      name: insight.metric_a.label,
      ...igsAxis({ axisLabel: igsAxisLabel({ fontSize: 10 }) }),
    },
    series: [
      {
        type: 'scatter',
        symbolSize: (value: unknown) => {
          const point = value as [number, number];
          // circle area encodes metric_a (jumlah TPA overcapacity), explicit scale
          return 8 + Math.sqrt(Math.max(point[1], 0)) * (28 / Math.sqrt(maxA));
        },
        itemStyle: { opacity: 0.55 },
        emphasis: { itemStyle: { opacity: 0.85 } },
        data: rows.map((row) => ({ name: row.name, value: [row.b, row.a], a: row.a })),
        markLine: { silent: true, symbol: 'none', lineStyle: { color: IGS_PALETTE.muted, type: 'dashed', width: 1 }, label: { formatter: '0' }, data: [{ yAxis: 0 }] },
      },
    ],
  };
  return option;
}

export function InsightChart({ insight }: { insight: CrossInsight }) {
  if (!insight.data.rows.length) {
    return null;
  }

  if (insight.chart === 'bubble') {
    const option = buildBubbleOption(insight);
    return (
      <EChartPanel
        title={insight.title}
        description={insight.description}
        option={option}
        rows={insight.data.rows.map((row) => ({ provinsi: row.name, metrik_a: Number(row.a.toFixed(2)), metrik_b: Number(row.b.toFixed(2)) }))}
        columns={[
          { key: 'provinsi', label: 'provinsi' },
          { key: 'metrik_a', label: insight.metric_a.label },
          { key: 'metrik_b', label: insight.metric_b.label },
        ]}
        height={420}
      />
    );
  }

  const option = buildQuadrantOption(insight);
  const { tableRows } = toTableRows(insight.data.rows);

  return (
    <EChartPanel
      title={insight.title}
      description={insight.description}
      option={option}
      rows={tableRows}
      columns={[
        { key: 'provinsi', label: 'provinsi' },
        { key: 'metrik_a', label: insight.metric_a.label },
        { key: 'metrik_b', label: insight.metric_b.label },
        { key: 'kuadran', label: 'Kuadran' },
      ]}
      height={460}
      minWidth={520}
    />
  );
}
