import type { Metadata } from 'next';
import { GovOverview } from '@/components/igs/GovOverview';
import { KrisisHariIni } from '@/components/gov/KrisisHariIni';
import { derivedRows, provinces, kabkota, metricDefinitions, regions, sourceManifest } from '@/lib/data';
import { CROSS_INSIGHTS, CROSS_INSIGHT_YEAR } from '@/lib/gov/cross-insights';

export const revalidate = 60;

export const metadata: Metadata = { title: 'Ikhtisar' };

export default async function GovHomePage() {
  const provinceCodes = new Set(provinces.map((region) => region.kode_wilayah));
  const rows = derivedRows.filter((row) => provinceCodes.has(String(row.kode_wilayah)));
  const sourceRowCount = sourceManifest.datasets.reduce((total, dataset) => total + dataset.rows, 0);
  const insights = CROSS_INSIGHTS.map((insight) => ({
    id: insight.id,
    title: insight.title,
    metricALabel: insight.metric_a.label,
    metricBLabel: insight.metric_b.label,
    year: CROSS_INSIGHT_YEAR,
    rows: insight.data.rows.map((row) => ({ a: row.a, b: row.b })),
  }));
  const crisis = await KrisisHariIni();
  return (
    <>
      <GovOverview rows={rows} regions={regions} metrics={metricDefinitions} provinceCount={provinces.length} regionCount={provinces.length + kabkota.length} sourceRowCount={sourceRowCount} datasetCount={sourceManifest.datasets.filter((dataset) => !dataset.missing).length} insights={insights} />
      <div className="pb-8">{crisis}</div>
    </>
  );
}
