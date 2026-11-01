'use client';

import React, { useState } from 'react';
import { Bell } from 'lucide-react';
import { useWatchlist } from '@/hooks/useWatchlist';
import { WatchlistDropdown } from './WatchlistDropdown';

export function WatchlistBell() {
  const [open, setOpen] = useState(false);
  const { hasAnyNew, totalNew, entries, removeEntry, clearNew, clearAllNew } = useWatchlist();

  return (
    <div className="relative">
      <button
        aria-label={`Watchlist${totalNew > 0 ? `, ${totalNew} baru` : ''}`}
        className="relative inline-flex size-11 items-center justify-center rounded-btn text-ink-700 transition-colors hover:bg-paper-200 hover:text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red focus-visible:ring-offset-2"
        onClick={() => setOpen((v) => !v)}
        type="button"
      >
        <Bell aria-hidden="true" className="size-4.5" />
        {hasAnyNew && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-brand-red font-mono text-[9px] font-bold text-paper-50">
            {totalNew > 9 ? '9+' : totalNew}
          </span>
        )}
      </button>

      {open && (
        <WatchlistDropdown
          entries={entries}
          onClearNew={clearNew}
          onClearAllNew={clearAllNew}
          onRemove={removeEntry}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}
