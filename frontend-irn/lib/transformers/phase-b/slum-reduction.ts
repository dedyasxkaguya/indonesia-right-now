import type { MetricResult, SlumAreaRow, SlumReductionRow } from '@/lib/types/datasets';
import { createMetricResult, isFiniteNumber } from './shared';

export function computeSlumReduction(
  slumRows: readonly SlumAreaRow[],
): MetricResult<SlumReductionRow> {
  const rows: SlumReductionRow[] = [];
  let incomplete = false;
  slumRows.forEach((row) => {
    const baseline = row.luas_sk_kumuh_awal_ha;
    const reduced = row.pengurangan_kumuh_kumulatif_ha;
    if (!isFiniteNumber(baseline) || !isFiniteNumber(reduced) || baseline <= 0) {
      incomplete = true;
      return;
    }
    rows.push({
      kode_wilayah: row.kode_wilayah,
      nama_provinsi: row.nama_provinsi,
      tahun: row.tahun,
      pengurangan_kumuh_persen: (reduced / baseline) * 100,
    });
  });
  return createMetricResult(rows, incomplete);
}
