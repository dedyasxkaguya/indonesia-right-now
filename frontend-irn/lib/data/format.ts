import type { DatasetRow } from './schemas';
import type { GovMetricId } from './types';

export function getMetricValue(row: DatasetRow, metric: GovMetricId): number | null {
  const value = row[`_derived_${metric}`];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function formatValue(value: number | null | undefined, decimals = 1): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'Data tidak tersedia';
  const maximumFractionDigits = Number.isFinite(decimals)
    ? Math.min(4, Math.max(0, Math.trunc(decimals)))
    : 1;
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits }).format(value);
}
