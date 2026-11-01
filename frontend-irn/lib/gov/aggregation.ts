import { populationWeightedAverage } from '../utils/weighting';
import type { DatasetRow } from '../data/schemas';

export const NATIONAL_REGION_CODE = 'nasional';
export const POPULATION_FIELD = 'jumlah_penduduk_total_ribu_jiwa';

export function populationWeightedMean(rows: DatasetRow[], field: string): number | null {
  const values = rows.flatMap((row) => {
    const value = row[field];
    const population = row[POPULATION_FIELD];
    return typeof value === 'number'
      && Number.isFinite(value)
      && typeof population === 'number'
      && Number.isFinite(population)
      && population > 0
      ? [{ value, population }]
      : [];
  });
  if (!values.length) return null;
  const result = populationWeightedAverage(values);
  return Number.isFinite(result) ? result : null;
}
