const numberFormatter = new Intl.NumberFormat('id-ID');
const decimalFormatter = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 });

export function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

export function formatPercent(value: number): string {
  return `${decimalFormatter.format(value)}%`;
}

export function formatMinutes(value: number): string {
  return `${decimalFormatter.format(value)} menit`;
}

export function formatDateTime(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 'Waktu tidak tersedia';
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jakarta' }).format(date);
}
