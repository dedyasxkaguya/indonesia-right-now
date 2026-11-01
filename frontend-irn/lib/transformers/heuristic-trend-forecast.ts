import type { NewsItem } from '@/lib/types/api';

export type TrendForecastResult = {
  actuals: { hour: number; count: number }[];
  slope: number;
  intercept: number;
  projectedNextHour: number;
  method: 'linear-regression-12h';
  insufficient: boolean;
};

const HOUR_MS = 60 * 60 * 1000;
const WINDOW_HOURS = 12;

export function computeTrendForecast(items: NewsItem[], now: number): TrendForecastResult {
  const counts = Array<number>(WINDOW_HOURS).fill(0);

  for (const item of items) {
    const timestamp = Date.parse(item.published_at);
    if (!Number.isFinite(timestamp) || timestamp > now) continue;
    const hoursAgo = Math.floor((now - timestamp) / HOUR_MS);
    if (hoursAgo < 0 || hoursAgo >= WINDOW_HOURS) continue;
    counts[WINDOW_HOURS - 1 - hoursAgo] += 1;
  }

  const presentHours = counts.filter((value) => value > 0).length;
  const n = WINDOW_HOURS;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  counts.forEach((y, x) => {
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
  });

  const denominator = n * sumXX - sumX * sumX;
  const slope = denominator === 0 ? 0 : (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;
  const projectedNextHour = Math.max(0, slope * WINDOW_HOURS + intercept);

  return {
    actuals: counts.map((count, hour) => ({ hour, count })),
    slope,
    intercept,
    projectedNextHour,
    method: 'linear-regression-12h',
    insufficient: presentHours < 3,
  };
}
