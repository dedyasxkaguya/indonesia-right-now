import type { NewsItem } from '@/lib/types/api';

export type DateConfidenceDistribution = {
  exact: number;
  approx: number;
  unknown: number;
  total: number;
  pctExact: number;
  pctApprox: number;
  pctUnknown: number;
  insufficient: boolean;
};

const round1 = (value: number) => Math.round(value * 10) / 10;

export function computeDateConfidenceDistribution(items: NewsItem[]): DateConfidenceDistribution {
  const total = items.length;
  const exact = items.filter((item) => item.date_confidence === 'exact').length;
  const approx = items.filter((item) => item.date_confidence === 'approx').length;
  const unknown = items.filter((item) => item.date_confidence === 'unknown').length;

  return {
    exact,
    approx,
    unknown,
    total,
    pctExact: total === 0 ? 0 : round1((exact / total) * 100),
    pctApprox: total === 0 ? 0 : round1((approx / total) * 100),
    pctUnknown: total === 0 ? 0 : round1((unknown / total) * 100),
    insufficient: total === 0,
  };
}
