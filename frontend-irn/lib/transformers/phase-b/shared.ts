import type { MetricResult, ProvinceMetricRow } from '@/lib/types/datasets';

export function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function provinceYearKey(code: string, year: number): string {
  return `${code}::${year}`;
}

export function groupByProvince<T extends { kode_wilayah: string }>(rows: readonly T[]): Record<string, T[]> {
  return rows.reduce<Record<string, T[]>>((groups, row) => {
    (groups[row.kode_wilayah] ??= []).push(row);
    return groups;
  }, {});
}

export function createMetricResult<T extends ProvinceMetricRow>(
  rows: readonly T[],
  incomplete = false,
): MetricResult<T> {
  if (incomplete || rows.length === 0) {
    return { byProvince: {}, insufficient: true };
  }
  return { byProvince: groupByProvince(rows), insufficient: false };
}
