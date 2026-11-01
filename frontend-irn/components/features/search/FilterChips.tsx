'use client';

import { X } from 'lucide-react';
import type { FilterState } from '@/hooks/useFilterState';

type FilterChipsProps = { state: FilterState; onRemove: (type: keyof FilterState, value?: string) => void };

export function FilterChips({ state, onRemove }: FilterChipsProps) {
  const chips: { type: keyof FilterState; value: string; className: string }[] = [
    ...(state.q ? [{ type: 'q' as const, value: state.q, className: 'bg-paper-200 text-ink-700' }] : []),
    ...state.categories.map((value) => ({ type: 'categories' as const, value, className: 'bg-amber-500/15 text-ink-900' })),
    ...state.publishers.map((value) => ({ type: 'publishers' as const, value, className: 'bg-paper-200 text-ink-700' })),
    ...(state.since !== '24h' ? [{ type: 'since' as const, value: state.since, className: 'bg-brand-red/10 text-brand-red' }] : []),
  ];
  if (!chips.length) return null;
  return <ul aria-label="Filter aktif" className="flex flex-wrap gap-2">{chips.map((chip) => <li className={`inline-flex max-w-full items-center gap-1 rounded-pill px-2.5 py-1 font-mono text-[10px] ${chip.className}`} key={`${chip.type}:${chip.value}`}>
    <span className="max-w-[16rem] truncate">{chip.value}</span>
    <button aria-label={`Hapus filter ${chip.value}`} className="inline-flex size-5 shrink-0 items-center justify-center rounded-full hover:bg-paper-50/70" onClick={() => onRemove(chip.type, chip.type === 'q' || chip.type === 'since' ? undefined : chip.value)} type="button"><X aria-hidden="true" className="size-3" /></button>
  </li>)}</ul>;
}
