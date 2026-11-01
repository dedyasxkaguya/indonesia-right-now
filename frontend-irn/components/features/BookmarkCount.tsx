'use client';

import { Bookmark } from 'lucide-react';
import Link from 'next/link';
import { useBookmarks } from '@/hooks/useBookmarks';

export function BookmarkCount() {
  const { count } = useBookmarks();
  return <Link aria-label={`Tersimpan, ${count} artikel`} className="relative inline-flex size-11 items-center justify-center rounded-btn text-ink-700 hover:bg-paper-200 hover:text-brand-red focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red" href="/tersimpan" title="Artikel tersimpan">
    <Bookmark aria-hidden="true" className="size-5" />
    {count > 0 ? <span className="absolute -right-1 -top-1 inline-flex min-w-4 items-center justify-center rounded-pill bg-brand-red px-1 font-mono text-[9px] leading-4 text-paper-50">{count}</span> : null}
  </Link>;
}
