import type {
  ElectrificationRow,
  InfrastructureAccessRow,
  MetricResult,
  RoadConditionRow,
  WaterSanitationRow,
} from '@/lib/types/datasets';
import { createMetricResult, isFiniteNumber, provinceYearKey } from './shared';

export function computeInfrastructureAccess(
  electrificationRows: readonly ElectrificationRow[],
  waterRows: readonly WaterSanitationRow[],
  roadRows: readonly RoadConditionRow[],
): MetricResult<InfrastructureAccessRow> {
  const waterByKey = new Map(waterRows.map((row) => [provinceYearKey(row.kode_wilayah, row.tahun), row]));
  const roadsByKey = new Map<string, RoadConditionRow>();
  roadRows.forEach((row) => {
    if (row.tingkat_kewenangan === 'Kabupaten/Kota') {
      roadsByKey.set(provinceYearKey(row.kode_wilayah, row.tahun), row);
    }
  });

  const rows: InfrastructureAccessRow[] = [];
  let incomplete = false;
  electrificationRows.forEach((electricity) => {
    const key = provinceYearKey(electricity.kode_wilayah, electricity.tahun);
    const water = waterByKey.get(key);
    const road = roadsByKey.get(key);
    if (!water || !road) return;

    const values = [
      electricity.rasio_elektrifikasi_total_persen,
      water.persen_air_minum_layak,
      water.persen_sanitasi_layak,
      road.persen_mantap,
    ];
    if (!values.every(isFiniteNumber)) {
      incomplete = true;
      return;
    }
    rows.push({
      kode_wilayah: electricity.kode_wilayah,
      nama_provinsi: electricity.nama_provinsi,
      tahun: electricity.tahun,
      akses_layanan_dasar: 0.3 * values[0] + 0.3 * values[1] + 0.2 * values[2] + 0.2 * values[3],
    });
  });
  return createMetricResult(rows, incomplete);
}
