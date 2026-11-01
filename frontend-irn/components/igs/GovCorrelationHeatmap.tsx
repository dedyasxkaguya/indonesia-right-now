'use client';

import type { EChartsOption } from 'echarts';
import { EChartPanel, type ChartTableRow } from './EChartPanel';
import type { DatasetRow, MetricDefinition } from '@/lib/data/schemas';
import { pearsonCorrelation } from '@/lib/data/statistics';
import { getIgsLabel } from '@/lib/igs-labels';

export function GovCorrelationHeatmap({
  rows,
  metrics,
  year,
  onSelect,
}: {
  rows: DatasetRow[];
  metrics: MetricDefinition[];
  year: number;
  onSelect: (xMetric: string, yMetric: string) => void;
}) {
  const labels = metrics.map((metric) => getIgsLabel(metric.id));
  const correlations = metrics.flatMap((rowMetric, y) => metrics.map((columnMetric, x) => ({
    x,
    y,
    rowId: rowMetric.id,
    columnId: columnMetric.id,
    value: pearsonCorrelation(rows, rowMetric.id, columnMetric.id),
  })));
  const cells = correlations.filter((cell) => cell.value !== null).map((cell) => [cell.x, cell.y, cell.value as number]);
  const option: EChartsOption = {
    tooltip: { position: 'top', formatter: (params) => {
      const point = params as { data?: [number, number, number] };
      const [x, y, value] = point.data ?? [0, 0, 0];
      return `${labels[y]} × ${labels[x]}<br/>Pearson r: ${value.toFixed(2)}`;
    } },
    grid: { left: 165, right: 25, top: 35, bottom: 125 },
    xAxis: { type: 'category', data: labels, name: 'Indikator (sumbu X)', nameLocation: 'middle', nameGap: 85, axisLabel: { rotate: 45, interval: 0, fontSize: 9 } },
    yAxis: { type: 'category', data: labels, name: 'Indikator (sumbu Y)', nameLocation: 'middle', nameGap: 145, axisLabel: { fontSize: 9 } },
    visualMap: { min: -1, max: 1, calculable: true, orient: 'horizontal', left: 'center', bottom: 8, inRange: { color: ['#B45309', '#F2EDE3', '#0E4A6F'] } },
    series: [{
      type: 'heatmap',
      data: cells,
      label: { show: labels.length <= 8, formatter: (params) => {
        const point = params as { data?: [number, number, number] };
        return point.data?.[2].toFixed(2) ?? '';
      } },
      emphasis: { itemStyle: { shadowBlur: 8, shadowColor: 'rgba(0,0,0,0.25)' } },
    }],
  };
  const tableRows: ChartTableRow[] = correlations.map((cell) => ({
    metrik_baris: metrics[cell.y].label,
    metrik_kolom: metrics[cell.x].label,
    pearson_r: cell.value,
  }));
  const onPointClick = ({ data }: { data?: unknown }) => {
    if (!Array.isArray(data) || typeof data[0] !== 'number' || typeof data[1] !== 'number') return;
    const column = metrics[data[0]];
    const row = metrics[data[1]];
    if (column && row) onSelect(column.id, row.id);
  };

  return <EChartPanel
    title={`Heatmap korelasi metrik turunan · ${year}`}
    description="Pearson r dihitung per pasangan dari provinsi dengan kedua nilai tersedia. Klik sel untuk memilih pasangan pada sebaran; korelasi tidak menyatakan sebab-akibat."
    option={option}
    rows={tableRows}
    columns={[{ key: 'metrik_baris', label: 'Metrik baris' }, { key: 'metrik_kolom', label: 'Metrik kolom' }, { key: 'pearson_r', label: 'Pearson r' }]}
    height={650}
    minWidth={560}
    onPointClick={onPointClick}
  />;
}
