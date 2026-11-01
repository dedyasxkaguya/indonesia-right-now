import { formatInTimeZone } from 'date-fns-tz';
import type { NewsItem } from '@/lib/types/api';

export type TemporalHotspotsResult = {
  hours: { hour: number; count: number }[];
  top3: number[];
  insufficient: boolean;
};

const JAKARTA_TZ = 'Asia/Jakarta';

export function computeTemporalHotspots(items: NewsItem[]): TemporalHotspotsResult {
  const hours = Array.from({ length: 24 }, (_, hour) => ({ hour, count: 0 }));

  for (const item of items) {
    const timestamp = Date.parse(item.published_at);
    if (!Number.isFinite(timestamp)) continue;
    const hour = Number(formatInTimeZone(new Date(timestamp), JAKARTA_TZ, 'H'));
    if (Number.isInteger(hour) && hour >= 0 && hour < 24) hours[hour].count += 1;
  }

  const top3 = [...hours]
    .sort((a, b) => b.count - a.count || a.hour - b.hour)
    .slice(0, 3)
    .map((entry) => entry.hour);

  return { hours, top3, insufficient: items.length === 0 };
}
