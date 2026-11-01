'use client';

import type { EChartsOption } from 'echarts';
import { EChartPanel, type ChartTableRow } from '@/components/igs/EChartPanel';
import { IGS_SERIES_COLORS, igsAxis, igsLegend, igsTooltip } from '@/lib/charts/igs-theme';
import type { TrendSeries } from '@/lib/gov/phase-b-views';

export function TrendAllYears({
  series,
  slugLabel,
}: {
  series: TrendSeries[];
  slugLabel: string;
}) {
  const years = [...new Set(series.flatMap((entry) => entry.points.map((point) => point.year)))]
    .sort((a, b) => a - b);

  const option: EChartsOption = {
    color: IGS_SERIES_COLORS,
    tooltip: {
      ...igsTooltip({ trigger: 'axis' }),
      valueFormatter: (value) => (typeof value === 'number' ? new Intl.NumberFormat('id-ID', { maximumFractionDigits: 3 }).format(value) : 'Data belum tersedia'),
    },
    legend: igsLegend({ top: 0 }),
    grid: { left: 48, right: 20, top: 40, bottom: 40 },
    xAxis: { type: 'category', data: years.map(String), name: 'Tahun', ...igsAxis({ boundaryGap: true }) },
    yAxis: { type: 'value', name: 'Nilai (satuan per indikator)', ...igsAxis() },
    series: series.map((entry) => ({
      name: entry.label,
      type: 'line' as const,
      data: years.map((year) => entry.points.find((point) => point.year === year)?.value ?? null),
      connectNulls: false,
      symbolSize: 6,
    })),
  };

  const tableRows: ChartTableRow[] = years.flatMap((year) => series.map((entry) => ({
    tahun: year,
    indikator: entry.label,
    [`nilai_${entry.label}`]: entry.points.find((point) => point.year === year)?.value ?? null,
    satuan: entry.unit,
  })));

  const columns = [
    { key: 'tahun', label: 'Tahun' },
    { key: 'indikator', label: 'Indikator' },
    ...series.map((entry) => ({ key: `nilai_${entry.label}`, label: `${entry.label} (${entry.unit})` })),
    { key: 'satuan', label: 'Satuan' },
  ];

  return (
    <EChartPanel
      title={`Ringkasan lintas tahun · ${slugLabel}`}
      description="Setiap garis memakai satuan indikatornya masing-masing; tahun tanpa data tidak dihubungkan dan tidak diisi nol. Nilai adalah rata-rata tertimbang penduduk dari provinsi yang berdata pada tahun tersebut."
      option={option}
      rows={tableRows}
      columns={columns}
    />
  );
}
