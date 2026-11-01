import type {
  MetricResult,
  RoadAuthorityGapRow,
  RoadConditionRow,
} from '@/lib/types/datasets';
import { createMetricResult, isFiniteNumber, provinceYearKey } from './shared';

export function computeRoadAuthorityGap(
  roadRows: readonly RoadConditionRow[],
): MetricResult<RoadAuthorityGapRow> {
  const grouped = new Map<string, {
    nama_provinsi: string;
    tahun: number;
    nasional?: number | null;
    kabkota?: number | null;
  }>();
  roadRows.forEach((row) => {
    const key = provinceYearKey(row.kode_wilayah, row.tahun);
    const group = grouped.get(key) ?? { nama_provinsi: row.nama_provinsi, tahun: row.tahun };
    if (row.tingkat_kewenangan === 'Nasional') group.nasional = row.persen_mantap;
    if (row.tingkat_kewenangan === 'Kabupaten/Kota') group.kabkota = row.persen_mantap;
    grouped.set(key, group);
  });

  const rows: RoadAuthorityGapRow[] = [];
  let incomplete = false;
  grouped.forEach((group, key) => {
    if (group.nasional === undefined || group.kabkota === undefined) return;
    if (!isFiniteNumber(group.nasional) || !isFiniteNumber(group.kabkota)) {
      incomplete = true;
      return;
    }
    rows.push({
      kode_wilayah: key.split('::')[0],
      nama_provinsi: group.nama_provinsi,
      tahun: group.tahun,
      jalan_nasional_mantap_persen: group.nasional,
      jalan_kabkota_mantap_persen: group.kabkota,
      kesenjangan_jalan_persen_poin: group.nasional - group.kabkota,
    });
  });
  return createMetricResult(rows, incomplete);
}
