import crossPhaseBJson from '@/lib/data/derived/cross-dataset-phase-b.json';

export type InsightPairRow = { kode: number; name: string; a: number; b: number };

export type CrossInsight = {
  id: string;
  title: string;
  description: string;
  metric_a: { label: string; source: string };
  metric_b: { label: string; source: string };
  chart: 'scatter-quadrant' | 'scatter' | 'bubble';
  data: { rows: InsightPairRow[]; insufficient?: boolean };
  quadrant_labels?: { tl: string; tr: string; bl: string; br: string };
};

const raw = crossPhaseBJson as { schema_version: number; tahun: number; rows: CrossInsight[] };

export const CROSS_INSIGHT_YEAR: number = raw.tahun;
export const CROSS_INSIGHTS: CrossInsight[] = raw.rows;

export function getInsight(id: string): CrossInsight | null {
  return CROSS_INSIGHTS.find((insight) => insight.id === id) ?? null;
}

export function medianOf(values: number[]): number {
  const sorted = [...values].filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
  if (!sorted.length) return Number.NaN;
  const midpoint = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[midpoint] : (sorted[midpoint - 1] + sorted[midpoint]) / 2;
}
