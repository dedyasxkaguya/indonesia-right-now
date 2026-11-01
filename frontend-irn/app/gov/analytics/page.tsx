import type { Metadata } from 'next';
import { GovAnalyticsView } from '@/components/igs/GovAnalyticsView';
import { crossDatasetViews, derivedRows, metricDefinitions, provinces, sourceManifest } from '@/lib/data';

export const metadata: Metadata = { title: 'Analitik wilayah' };

export default function Page() {
  const provinceCodes = new Set(provinces.map((region) => region.kode_wilayah));
  const rows = derivedRows.filter((row) => provinceCodes.has(String(row.kode_wilayah)));
  const provincialViews = crossDatasetViews.map((view) => ({
    ...view,
    rows: view.rows.filter((row) => provinceCodes.has(String(row.kode_wilayah))),
  }));
  return <GovAnalyticsView rows={rows} metrics={metricDefinitions} datasets={sourceManifest.datasets} crossDatasetViews={provincialViews} />;
}
