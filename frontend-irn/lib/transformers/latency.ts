import type { NewsItem } from '@/lib/types/api';

const ranges = [
  { label: '0–5 mnt', max: 5 },
  { label: '5–15 mnt', max: 15 },
  { label: '15–30 mnt', max: 30 },
  { label: '30–60 mnt', max: 60 },
  { label: '1–3 jam', max: 180 },
  { label: '> 3 jam', max: Number.POSITIVE_INFINITY },
];

export function computeLatency(items: NewsItem[]): { median: number; p95: number; buckets: { label: string; count: number }[]; insufficient: boolean } {
  const values = items.map((item) => (Date.parse(item.fetched_at) - Date.parse(item.published_at)) / 60_000)
    .filter((value) => Number.isFinite(value) && value >= 0)
    .sort((a, b) => a - b);
  const percentile = (ratio: number) => values.length ? values[Math.ceil(values.length * ratio) - 1] : 0;
  return {
    median: values.length % 2 === 0 && values.length > 0 ? (values[values.length / 2 - 1] + values[values.length / 2]) / 2 : percentile(0.5),
    p95: percentile(0.95),
    buckets: ranges.map(({ label, max }, index) => ({
      label,
      count: values.filter((value) => value <= max && (index === 0 || value > ranges[index - 1].max)).length,
    })),
    insufficient: values.length === 0,
  };
}
