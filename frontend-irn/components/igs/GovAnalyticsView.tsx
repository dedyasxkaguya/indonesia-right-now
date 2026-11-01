'use client';

import { Suspense, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { GovPageHeader } from './GovPageHeader';
import { IgsYearSelector, useGovYear } from './GovYearProvider';
import type { CrossDatasetView } from './CrossDatasetViews';
import { StateCard } from '@/components/ui/StateCard';
import { getMetricValue } from '@/lib/data/format';
import { pearsonCorrelation } from '@/lib/data/statistics';
import type { DatasetRow, MetricDefinition } from '@/lib/data/schemas';
import insights from '@/content/igs/insight.json';
import { getIgsLabel } from '@/lib/igs-labels';

const CrossDatasetViews = dynamic(() => import('./CrossDatasetViews').then((module) => module.CrossDatasetViews), {
  ssr: false,
  loading: () => <StateCard variant="loading" title="Memuat pandangan lintas dataset" description="Delapan visualisasi analitik dimuat terpisah." />,
});

const FetchQualityGauges = dynamic(() => import('./FetchQualityGauges').then((module) => module.FetchQualityGauges), {
  ssr: false,
  loading: () => <StateCard variant="loading" title="Memuat metrik kualitas AI" description="Gauge kualitas pipeline dimuat terpisah." />,
});

const MetricChart = dynamic(() => import('./MetricChart').then((module) => module.MetricChart), {
  ssr: false,
  loading: () => <StateCard variant="loading" title="Memuat sebaran metrik" description="Visualisasi sebaran dimuat terpisah." />,
});

const GovCorrelationHeatmap = dynamic(() => import('./GovCorrelationHeatmap').then((module) => module.GovCorrelationHeatmap), {
  ssr: false,
  loading: () => <StateCard variant="loading" title="Memuat heatmap korelasi" description="Visualisasi korelasi dimuat khusus untuk halaman analitik." />,
});

const TrajectoryFlowScene = dynamic(() => import('./TrajectoryFlowScene').then((module) => module.TrajectoryFlowScene), {
  ssr: false,
  loading: () => <StateCard variant="loading" title="Memuat lintasan tiga dimensi" description="Scene perjalanan indikator dimuat khusus untuk halaman analitik." />,
});

export function GovAnalyticsView({
  rows,
  metrics,
  datasets,
  crossDatasetViews,
}: {
  rows: DatasetRow[];
  metrics: MetricDefinition[];
  datasets: { id: string; filename: string; rows: number; fields: string[]; source: string; missing: boolean }[];
  crossDatasetViews: CrossDatasetView[];
}) {
  const { year } = useGovYear();
  const searchParams = useSearchParams();
  const numericMetrics = metrics.filter((metric) => metric.id !== 'fiscal_welfare_quadrant');
  const [xMetric, setXMetric] = useState(() => {
    const requestedMetric = searchParams?.get('metrik');
    return requestedMetric && numericMetrics.some((metric) => metric.id === requestedMetric)
      ? requestedMetric
      : 'fiscal_autonomy';
  });
  const [yMetric, setYMetric] = useState('welfare_composite');
  const current = rows.filter((row) => row.tahun_anggaran === year);
  const tableMetrics = useMemo(() => numericMetrics, [numericMetrics]);
  const points = current.filter((row) => getMetricValue(row, xMetric as Parameters<typeof getMetricValue>[1]) !== null && getMetricValue(row, yMetric as Parameters<typeof getMetricValue>[1]) !== null);
  const correlationValue = pearsonCorrelation(current, xMetric, yMetric);
  const labelFor = (id: string) => getIgsLabel(id);

  return (
    <div className="space-y-8 py-8">
      <GovPageHeader index="00" title="Analitik wilayah 2020–2025" description="Hubungan lintas dataset, matriks korelasi deskriptif, dan cakupan data sumber. Korelasi tidak menyatakan sebab-akibat." />
      <div className="flex flex-wrap items-end justify-between gap-5 border-y border-paper-300 py-4">
        <div><p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-ink-500">TAHUN</p><IgsYearSelector expanded /></div>
        <p className="font-mono text-xs text-ink-500">Dataset statis · build lokal</p>
      </div>
      <Suspense fallback={<StateCard variant="loading" title="Memuat lintasan tiga dimensi" description="Scene perjalanan indikator dimuat khusus untuk halaman analitik." />}>
        <TrajectoryFlowScene rows={rows} />
      </Suspense>
      <section>
        <h2 className="mb-3 font-sans text-2xl font-semibold text-ink-900">Kualitas pipeline AI</h2>
        <Suspense fallback={<StateCard variant="loading" title="Memuat metrik kualitas AI" description="Gauge kualitas pipeline dimuat terpisah." />}>
          <FetchQualityGauges />
        </Suspense>
      </section>
      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
          <div><h2 className="font-sans text-2xl font-semibold text-ink-900">Matriks hubungan antarindikator</h2><p className="mt-1 text-sm text-ink-500">Pilih pasangan melalui sel heatmap atau menu sumbu.</p></div>
          <div className="flex w-full gap-2 sm:w-auto">
            {[['X', xMetric, setXMetric], ['Y', yMetric, setYMetric]].map(([label, value, setter]) => (
              <label key={String(label)} className="flex min-w-0 flex-1 flex-col gap-1 font-mono text-[10px] text-ink-500 sm:flex-none">{String(label)}
                <select value={String(value)} onChange={(event) => (setter as (next: string) => void)(event.currentTarget.value)} className="min-h-11 w-full max-w-full border border-paper-300 bg-paper-50 px-2 font-sans text-xs text-ink-900 sm:max-w-48">
                  {numericMetrics.map((metric) => <option key={metric.id} value={metric.id}>{getIgsLabel(metric.id)}</option>)}
                </select>
              </label>
            ))}
          </div>
        </div>
        <Suspense fallback={<StateCard variant="loading" title="Memuat heatmap korelasi" description="Visualisasi korelasi dimuat khusus untuk halaman analitik." />}>
          <GovCorrelationHeatmap rows={current} metrics={tableMetrics} year={year} onSelect={(x, y) => { setXMetric(x); setYMetric(y); }} />
        </Suspense>
      </section>
      <section className="grid gap-5 lg:grid-cols-2">
        <div className="min-w-0">
          <h2 className="mb-3 font-sans text-2xl font-semibold text-ink-900">{labelFor(xMetric)} × {labelFor(yMetric)}</h2>
          <p className="mb-4 font-mono text-xs text-ink-500">r = {correlationValue === null ? 'Data tidak cukup' : correlationValue.toFixed(2)} · n = {points.length} provinsi · {year}</p>
          <Suspense fallback={<StateCard variant="loading" title="Memuat sebaran metrik" description="Visualisasi sebaran dimuat terpisah." />}>
            <MetricChart title="Sebaran antarwilayah" description="Pilih pasangan sel matriks untuk mengubah sumbu." data={points} xKey={`_derived_${xMetric}`} yKey={`_derived_${yMetric}`} kind="scatter" />
          </Suspense>
        </div>
        <div className="min-w-0">
          <h2 className="mb-3 font-sans text-2xl font-semibold text-ink-900">Catatan analitik</h2>
          <div className="divide-y divide-paper-300 border-y border-paper-300">
            {insights.map((insight, index) => <article key={insight.id} className="py-4">
              <p className="font-mono text-xs text-gov-primary">{String(index + 1).padStart(2, '0')} / {insight.sources.map(getIgsLabel).join(' · ')}</p>
              <h3 className="mt-1 font-semibold text-ink-900">{insight.title}</h3>
              <p className="mt-2 text-sm leading-6 text-ink-500">{insight.narrative}</p>
            </article>)}
          </div>
        </div>
      </section>
      <section>
        <h2 className="font-sans text-2xl font-semibold text-ink-900">Cakupan dataset</h2>
        <p className="mt-1 text-sm text-ink-500">Jumlah baris di bawah adalah baris sumber, bukan jumlah wilayah unik. Berkas yang hilang ditampilkan secara eksplisit.</p>
        <div className="mt-4 overflow-auto border border-paper-300 bg-paper-50">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="bg-paper-100 font-mono text-[10px] uppercase tracking-wider text-ink-500"><tr><th className="p-3">Dataset</th><th className="p-3">Baris</th><th className="p-3">Kolom</th><th className="p-3">Status</th><th className="p-3">Sumber yang dicatat</th></tr></thead>
            <tbody>{datasets.map((dataset) => <tr key={dataset.id} className="border-t border-paper-200"><td className="p-3 font-medium">{getIgsLabel(dataset.id)}</td><td className="p-3 font-mono">{dataset.rows.toLocaleString('id-ID')}</td><td className="p-3 font-mono">{dataset.fields.length}</td><td className="p-3">{dataset.missing ? 'Berkas tidak tersedia' : 'Tersedia'}</td><td className="p-3 text-xs text-ink-500">{dataset.source}</td></tr>)}</tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-ink-500">Tabel ini merangkum cakupan baris dan kolom pada tiap berkas; jumlah baris bukan jumlah wilayah unik.</p>
      </section>
      <p className="text-xs text-ink-500">File sumber dan definisi kolom dapat ditinjau melalui <Link href="/gov" className="font-semibold text-gov-primary">ikhtisar Gov Stats</Link>. Missing values tetap null dan tidak diimputasi.</p>
      <section aria-label="Pandangan lintas dataset">
        <Suspense fallback={<StateCard variant="loading" title="Memuat pandangan lintas dataset" description="Delapan visualisasi analitik dimuat terpisah." />}>
          <CrossDatasetViews views={crossDatasetViews} metrics={metrics} />
        </Suspense>
      </section>
    </div>
  );
}
