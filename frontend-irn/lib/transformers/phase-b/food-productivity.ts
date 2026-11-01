import type {
  AgricultureRow,
  FoodProductivityRow,
  MetricResult,
  PopulationRow,
} from '@/lib/types/datasets';
import { populationWeightedAverage } from '../../utils/weighting';
import { createMetricResult, isFiniteNumber, provinceYearKey } from './shared';

type ProductivityGroup = {
  nama_provinsi: string;
  tahun: number;
  values: { value: number; population: number }[];
};

export function computeFoodProductivity(
  agricultureRows: readonly AgricultureRow[],
  populationRows: readonly PopulationRow[],
): MetricResult<FoodProductivityRow> {
  const populationByKey = new Map(populationRows.map((row) => [
    provinceYearKey(row.kode_wilayah, row.tahun_anggaran),
    row.jumlah_penduduk_total_ribu_jiwa,
  ]));
  const grouped = new Map<string, ProductivityGroup>();
  let incomplete = false;
  agricultureRows.forEach((row) => {
    if (row.produktivitas_ton_per_ha === null) return;
    const key = provinceYearKey(row.kode_wilayah, row.tahun);
    const population = populationByKey.get(key);
    if (!isFiniteNumber(row.produktivitas_ton_per_ha) || !isFiniteNumber(population) || population <= 0) {
      incomplete = true;
      return;
    }
    const group = grouped.get(key) ?? {
      nama_provinsi: row.nama_provinsi,
      tahun: row.tahun,
      values: [],
    };
    group.values.push({ value: row.produktivitas_ton_per_ha, population });
    grouped.set(key, group);
  });

  const rows: FoodProductivityRow[] = [];
  grouped.forEach((group, key) => {
    const average = populationWeightedAverage(group.values);
    if (!Number.isFinite(average)) {
      incomplete = true;
      return;
    }
    rows.push({
      kode_wilayah: key.split('::')[0],
      nama_provinsi: group.nama_provinsi,
      tahun: group.tahun,
      produktivitas_rata_rata_ton_per_ha: average,
    });
  });
  return createMetricResult(rows, incomplete);
}
