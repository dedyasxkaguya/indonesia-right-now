'use client';

import * as Popover from '@radix-ui/react-popover';
import { ListFilter, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { FilterState } from '@/hooks/useFilterState';

type FilterPopoverProps = {
  categories: string[];
  publishers: string[];
  state: FilterState;
  onChangeCategories: (value: string[]) => void;
  onChangePublishers: (value: string[]) => void;
  onChangeSince: (value: string) => void;
};

const times = [{ id: '24h', label: '24 jam' }, { id: '7d', label: '7 hari' }, { id: '30d', label: '30 hari' }];

export function FilterPopover({ categories, publishers, state, onChangeCategories, onChangePublishers, onChangeSince }: FilterPopoverProps) {
  function toggle(current: string[], value: string, update: (next: string[]) => void) {
    update(current.includes(value) ? current.filter((entry) => entry !== value) : [...current, value].sort());
  }
  return <Popover.Root>
    <Popover.Trigger asChild><Button variant="secondary"><ListFilter aria-hidden="true" className="size-4" /> + Filter</Button></Popover.Trigger>
    <Popover.Portal>
      <Popover.Content align="start" className="z-[60] max-h-[70vh] w-[min(22rem,calc(100vw-2rem))] overflow-y-auto border border-paper-300 bg-paper-50 p-4 shadow-xl" sideOffset={8}>
        <div className="flex items-center justify-between"><p className="font-sans text-sm font-semibold text-ink-900">Filter berita</p><Popover.Close aria-label="Tutup filter" className="inline-flex size-8 items-center justify-center rounded-btn text-ink-500 hover:bg-paper-200"><X aria-hidden="true" className="size-4" /></Popover.Close></div>
        <fieldset className="mt-5"><legend className="mb-2 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-500">Rentang waktu</legend><div className="space-y-2">{times.map((time) => <label className="flex items-center gap-2 text-sm text-ink-700" key={time.id}><input checked={state.since === time.id} className="accent-[#D32F2F]" name="filter-since" onChange={() => onChangeSince(time.id)} type="radio" />{time.label}</label>)}</div></fieldset>
        <fieldset className="mt-5"><legend className="mb-2 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-500">Kategori</legend><div className="max-h-40 space-y-2 overflow-y-auto">{categories.map((category) => <label className="flex items-center gap-2 text-xs text-ink-700" key={category}><input checked={state.categories.includes(category)} className="accent-[#D32F2F]" onChange={() => toggle(state.categories, category, onChangeCategories)} type="checkbox" />{category}</label>)}</div></fieldset>
        <fieldset className="mt-5"><legend className="mb-2 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-500">Publisher</legend><div className="max-h-40 space-y-2 overflow-y-auto">{publishers.map((publisher) => <label className="flex items-start gap-2 text-xs text-ink-700" key={publisher}><input checked={state.publishers.includes(publisher)} className="mt-0.5 accent-[#D32F2F]" onChange={() => toggle(state.publishers, publisher, onChangePublishers)} type="checkbox" /><span className="break-words">{publisher}</span></label>)}</div></fieldset>
        <Popover.Arrow className="fill-paper-50" />
      </Popover.Content>
    </Popover.Portal>
  </Popover.Root>;
}
