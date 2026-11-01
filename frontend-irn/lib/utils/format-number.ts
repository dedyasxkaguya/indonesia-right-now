const compactId = new Intl.NumberFormat('id-ID', { notation: 'compact', maximumFractionDigits: 1 });
const plainId = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 4 });
const fullRupiahId = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 });

function boundedDigits(digits: number): number {
  return Number.isFinite(digits) ? Math.min(4, Math.max(0, Math.trunc(digits))) : 2;
}

export function formatCompactNumber(value: number | null | undefined): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'Data belum tersedia';
  return compactId.format(value);
}

export function formatDecimal(value: number | null | undefined, digits = 2): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'Data belum tersedia';
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits: boundedDigits(digits) }).format(value);
}

export function formatPercentOne(value: number | null | undefined): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'Data belum tersedia';
  return `${new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 }).format(value)}%`;
}

export function formatInteger(value: number | null | undefined): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'Data belum tersedia';
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(value);
}

/** Rp compact: Rp 12,5 T / Rp 345,2 M / Rp 78,1 jt. Input in rupiah. */
export function formatRupiahCompact(value: number | null | undefined): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'Data belum tersedia';
  if (Math.abs(value) >= 1e12) return `Rp ${compactId.format(value / 1e12)} T`;
  if (Math.abs(value) >= 1e9) return `Rp ${compactId.format(value / 1e9)} M`;
  if (Math.abs(value) >= 1e6) return `Rp ${compactId.format(value / 1e6)} jt`;
  return `Rp ${plainId.format(value)}`;
}

export function formatRupiahByUnit(
  value: number | null | undefined,
  unit: string,
  style: 'compact' | 'full' = 'compact',
): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'Data belum tersedia';
  const normalizedUnit = unit.toLocaleLowerCase('id-ID');
  const scale = normalizedUnit.includes('miliar') || normalizedUnit.includes('milyar')
    ? 1e9
    : normalizedUnit.includes('juta')
      ? 1e6
      : normalizedUnit.includes('ribu')
        ? 1e3
        : 1;
  const rupiah = value * scale;
  if (!Number.isFinite(rupiah)) return 'Data belum tersedia';
  return style === 'compact'
    ? formatRupiahCompact(rupiah)
    : `Rp ${fullRupiahId.format(rupiah)}`;
}
