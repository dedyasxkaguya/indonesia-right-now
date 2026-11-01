'use client';

import { Info } from 'lucide-react';
import { useExplain } from '@/components/features/explain/ExplainProvider';
import type { ExplainComputeContext } from '@/lib/explain/registry';

type ExplainTriggerProps = { metricId: string; className?: string; context?: ExplainComputeContext };

export function ExplainTrigger({ metricId, className, context }: ExplainTriggerProps) {
  const { openExplain } = useExplain();
  return <button aria-label="Penjelasan metrik" className={`inline-flex size-7 items-center justify-center rounded-full text-ink-400 transition-colors hover:bg-paper-200 hover:text-brand-red focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red ${className ?? ''}`} onClick={() => openExplain(metricId, context)} title="Penjelasan metrik" type="button"><Info aria-hidden="true" className="size-4" /></button>;
}
