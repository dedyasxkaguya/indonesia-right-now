'use client';

import Link from 'next/link';
import type { EChartsOption } from 'echarts';
import { EChartPanel, type ChartTableRow } from './EChartPanel';
import { useGovYear } from './GovYearProvider';
import type { DatasetRow, MetricDefinition } from '@/lib/data/schemas';
import { getIgsLabel } from '@/lib/igs-labels';

export type CrossDatasetView = {
  id: string;
  title: string;
  x_metric: string;
  y_metric: string;
  rows: DatasetRow[];
};

const rawMetricLabels: Record<string, string> = {
  persentase_penduduk_miskin_persen: 'Penduduk miskin (%)',
  tingkat_pengangguran_terbuka_tpt_persen: 'Tingkat pengangguran terbuka (%)',
  indeks_pembangunan_manusia_ipm: 'Indeks pembangunan manusia',
};

const relatedRoutes: Record<string, { href: string; label: string }> = {
  'fiscal-welfare': { href: '/gov/daerah', label: 'Bidang daerah' },
  'budget-service': { href: '/gov/daerah', label: 'Bidang daerah' },
  'procurement-resilience': { href: '/gov/daerah', label: 'Bidang daerah' },
  'governance-poverty': { href: '/gov/pemerintahan', label: 'Pemerintahan' },
  'education-unemployment': { href: '/gov/pendidikan', label: 'Pendidikan' },
  'budget-outcome-gap': { href: '/gov/ekonomi', label: 'Ekonomi' },
  'regional-trends': { href: '/gov/ekonomi', label: 'Ekonomi' },
  'quadrant-timeline': { href: '/gov/perbandingan', label: 'Perbandingan wilayah' },
};

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function getMetricLabel(id: string, metrics: MetricDefinition[]) {
  const definition = metrics.find((metric) => metric.id === id.replace(/^_derived_/, ''));
  return definition ? getIgsLabel(definition.id) : rawMetricLabels[id] ?? getIgsLabel(id);
}

function CrossDatasetCard({
  view,
  metrics,
  year,
}: {
  view: CrossDatasetView;
  metrics: MetricDefinition[];
  year: number;
}) {
  const xLabel = getMetricLabel(view.x_metric, metrics);
  const yLabel = getMetricLabel(view.y_metric, metrics);
  const related = relatedRoutes[view.id] ?? { href: '/gov/analytics', label: 'Analitik wilayah' };
  const tableRows: ChartTableRow[] = [];
  let option: EChartsOption;
  let chartTitle: string;
  let description: string;
  let columns: { key: string; label: string }[];

  if (view.id === 'quadrant-timeline') {
    const years = [...new Set(view.rows.map((row) => row.tahun_anggaran).filter(isNumber))].sort((a, b) => a - b);
    const quadrants = [...new Set(view.rows.map((row) => row.kuadran).filter((value): value is string => typeof value === 'string'))].sort();
    const counts = quadrants.map((quadrant) => ({
      quadrant,
      values: years.map((targetYear) => view.rows.filter((row) => row.tahun_anggaran === targetYear && row.kuadran === quadrant).length),
    }));
    counts.forEach(({ quadrant, values }) => values.forEach((value, index) => {
      tableRows.push({ tahun: years[index], kuadran: quadrant, jumlah_provinsi: value });
    }));
    chartTitle = 'Jumlah provinsi per kuadran';
    description = 'Garis bertangga menghitung provinsi pada setiap kategori kuadran fiskal-kesejahteraan per tahun; kategori mengikuti data turunan.';
    columns = [
      { key: 'tahun', label: 'Tahun' },
      { key: 'kuadran', label: 'Kuadran' },
      { key: 'jumlah_provinsi', label: 'Jumlah provinsi' },
    ];
    option = {
      tooltip: { trigger: 'axis' },
      legend: { type: 'scroll', bottom: 0 },
      grid: { left: 55, right: 20, top: 25, bottom: 65 },
      xAxis: { type: 'category', data: years.map(String), name: 'Tahun' },
      yAxis: { type: 'value', name: 'Provinsi', minInterval: 1 },
      series: counts.map(({ quadrant, values }) => ({
        name: quadrant,
        type: 'line',
        step: 'end',
        data: values,
      })),
    };
  } else {
    const annualRows = view.rows.filter((row) => row.tahun_anggaran === year && isNumber(row.x) && isNumber(row.y));
    if (view.id === 'regional-trends') {
      const rankedRows = [...annualRows].sort((a, b) => Number(b.x) - Number(a.x));
      rankedRows.forEach((row) => tableRows.push({
        wilayah: String(row.nama_daerah ?? row.kode_wilayah ?? ''),
        kode_wilayah: String(row.kode_wilayah ?? ''),
        tahun: year,
        [xLabel]: row.x as number,
      }));
      chartTitle = `${xLabel} menurut provinsi · ${year}`;
      description = `Peringkat deskriptif provinsi berdasarkan nilai ${xLabel} pada ${year}; nilai hilang tidak ditampilkan.`;
      columns = [
        { key: 'wilayah', label: 'Provinsi' },
        { key: 'kode_wilayah', label: 'Kode' },
        { key: 'tahun', label: 'Tahun' },
        { key: xLabel, label: xLabel },
      ];
      option = {
        tooltip: { trigger: 'axis' },
        grid: { left: 65, right: 20, top: 20, bottom: 100 },
        xAxis: { type: 'category', data: rankedRows.map((row) => String(row.nama_daerah ?? row.kode_wilayah ?? '')), axisLabel: { rotate: 35, interval: 0 } },
        yAxis: { type: 'value', name: xLabel },
        series: [{ type: 'bar', name: xLabel, data: rankedRows.map((row) => row.x as number), itemStyle: { color: '#0E4A6F' } }],
      };
    } else {
      annualRows.forEach((row) => tableRows.push({
        wilayah: String(row.nama_daerah ?? row.kode_wilayah ?? ''),
        kode_wilayah: String(row.kode_wilayah ?? ''),
        tahun: year,
        [xLabel]: row.x as number,
        [yLabel]: row.y as number,
      }));
      chartTitle = `${xLabel} × ${yLabel} · ${year}`;
      description = `Sebaran deskriptif antara ${xLabel} dan ${yLabel} pada provinsi yang memiliki kedua nilai; hubungan tidak menyatakan sebab-akibat.`;
      columns = [
        { key: 'wilayah', label: 'Provinsi' },
        { key: 'kode_wilayah', label: 'Kode' },
        { key: 'tahun', label: 'Tahun' },
        { key: xLabel, label: xLabel },
        { key: yLabel, label: yLabel },
      ];
      option = {
        tooltip: {
          trigger: 'item',
          formatter: (params) => {
            const point = params as { name?: string; value?: [number, number] };
            const value = point.value;
            return value
              ? `${point.name ?? ''}<br/>${xLabel}: ${value[0].toLocaleString('id-ID')}<br/>${yLabel}: ${value[1].toLocaleString('id-ID')}`
              : '';
          },
        },
        grid: { left: 70, right: 20, top: 25, bottom: 55 },
        xAxis: { type: 'value', name: xLabel, nameLocation: 'middle', nameGap: 32 },
        yAxis: { type: 'value', name: yLabel },
        series: [{
          type: 'scatter',
          data: annualRows.map((row) => ({
            name: String(row.nama_daerah ?? row.kode_wilayah ?? ''),
            value: [row.x as number, row.y as number],
          })),
          itemStyle: { color: '#0891B2', opacity: 0.8 },
        }],
      };
    }
  }

  return <article className="min-w-0">
    <EChartPanel title={view.title} description={`${chartTitle}. ${description}`} option={option} rows={tableRows} columns={columns} height={350} />
    <p className="mt-2 text-right text-xs">
      <Link href={related.href} className="font-semibold text-gov-primary hover:underline">{related.label} →</Link>
    </p>
  </article>;
}

export function CrossDatasetViews({
  views,
  metrics,
}: {
  views: CrossDatasetView[];
  metrics: MetricDefinition[];
}) {
  const { year } = useGovYear();

  return <section aria-labelledby="cross-dataset-title" className="space-y-4">
    <div>
      <h2 id="cross-dataset-title" className="font-sans text-2xl font-semibold text-ink-900">Delapan pandangan lintas dataset</h2>
      <p className="mt-1 text-sm text-ink-500">Tampilan deskriptif memakai pasangan kolom yang tersedia; tabel setiap kartu memuat nilai yang digunakan.</p>
    </div>
    <div className="grid min-w-0 gap-5 lg:grid-cols-2">
      {views.map((view) => <CrossDatasetCard key={view.id} view={view} metrics={metrics} year={year} />)}
    </div>
  </section>;
}
