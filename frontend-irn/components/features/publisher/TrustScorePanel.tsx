'use client';

import { ExplainTrigger } from '@/components/features/explain/ExplainTrigger';
import type { TrustScore } from '@/lib/transformers/trust-score';

const labels: { key: keyof TrustScore['subScores']; label: string }[] = [
  { key: 'freshness', label: 'Kesegaran' },
  { key: 'completeness', label: 'Kelengkapan' },
  { key: 'reliability', label: 'Keandalan sumber' },
];

export function TrustScorePanel({ score }: { score: TrustScore }) {
  return <section className="border-y border-paper-300 py-7">
    <div className="flex items-center gap-1"><h2 className="font-sans text-h3 text-ink-900">Skor kepercayaan</h2><ExplainTrigger context={{ publisherDomain: score.publisherDomain }} metricId="trust-score" /></div>
    <p className="mt-4 font-mono text-6xl font-semibold leading-none text-ink-900">{score.insufficient ? '—' : score.score}<span className="ml-2 text-base font-normal text-ink-500">/ 100</span></p>
    <p className="mt-2 text-xs text-ink-500">Heuristik kelengkapan metadata dan status feed. Bukan jaminan kebenaran.</p>
    <div className="mt-6 space-y-4">{labels.map(({ key, label }) => <div key={key}>
      <div className="mb-1 flex items-center justify-between gap-3"><span className="flex items-center gap-1 font-mono text-xs text-ink-500">{label}<ExplainTrigger context={{ publisherDomain: score.publisherDomain }} metricId="trust-score" /></span><span className="font-mono text-xs text-ink-900">{score.insufficient ? '—' : score.subScores[key]}</span></div>
      <div aria-label={`${label}: ${score.subScores[key]} dari 100`} className="h-1.5 bg-paper-200" role="img"><div className="h-full bg-brand-red" style={{ width: `${score.subScores[key]}%` }} /></div>
    </div>)}</div>
  </section>;
}
