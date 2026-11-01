'use client';

import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';

type SearchBarProps = { value: string; onChange: (value: string) => void };

export function SearchBar({ value, onChange }: SearchBarProps) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  useEffect(() => {
    if (draft === value) return;
    const timer = window.setTimeout(() => onChange(draft), 250);
    return () => window.clearTimeout(timer);
  }, [draft, onChange, value]);
  return <label className="flex min-h-11 items-center gap-2 border border-paper-300 bg-paper-50 px-3 focus-within:border-brand-red">
    <Search aria-hidden="true" className="size-4 shrink-0 text-ink-400" />
    <span className="sr-only">Cari berita</span>
    <input className="min-w-0 flex-1 bg-transparent font-mono text-sm text-ink-900 outline-none placeholder:text-ink-400" data-news-search onChange={(event) => setDraft(event.target.value)} placeholder="Cari berita…" type="search" value={draft} />
  </label>;
}
