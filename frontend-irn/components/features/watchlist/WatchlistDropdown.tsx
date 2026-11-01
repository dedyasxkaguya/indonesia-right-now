'use client';

import React, { useState } from 'react';
import { X, Settings } from 'lucide-react';
import type { WatchEntry } from '@/hooks/useWatchlist';
import { WatchlistManager } from './WatchlistManager';
import { formatDistanceToNow } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

interface WatchlistDropdownProps {
  entries: WatchEntry[];
  onRemove: (id: string) => void;
  onClearNew: (id: string) => void;
  onClearAllNew: () => void;
  onClose: () => void;
}

export function WatchlistDropdown({ entries, onRemove, onClearNew, onClearAllNew, onClose }: WatchlistDropdownProps) {
  const [managerOpen, setManagerOpen] = useState(false);

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      <div className="absolute right-0 top-full z-50 mt-2 w-80 border border-paper-300 bg-paper-50 shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-paper-300 px-4 py-3">
          <span className="font-mono text-xs font-semibold uppercase tracking-wider text-ink-700">
            Watchlist
          </span>
          <div className="flex items-center gap-2">
            <button
              aria-label="Kelola watchlist"
              className="rounded p-1 text-ink-500 transition-colors hover:bg-paper-200 hover:text-ink-900"
              onClick={() => { setManagerOpen(true); }}
              type="button"
            >
              <Settings aria-hidden="true" className="size-3.5" />
            </button>
            <button
              aria-label="Tutup watchlist"
              className="rounded p-1 text-ink-500 transition-colors hover:bg-paper-200 hover:text-ink-900"
              onClick={onClose}
              type="button"
            >
              <X aria-hidden="true" className="size-3.5" />
            </button>
          </div>
        </div>

        {/* Entries */}
        <div className="max-h-80 overflow-y-auto">
          {entries.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-ink-500">Belum ada watchlist.</p>
              <button
                className="mt-2 font-mono text-xs text-brand-red underline underline-offset-2"
                onClick={() => setManagerOpen(true)}
                type="button"
              >
                Tambah entri
              </button>
            </div>
          ) : (
            <ul>
              {entries.map((entry) => (
                <li
                  className={`flex items-start gap-3 border-b border-paper-200 px-4 py-3 last:border-0 ${entry.hasNew ? 'bg-brand-red/5' : ''}`}
                  key={entry.id}
                >
                  {entry.hasNew && (
                    <span className="mt-1 size-2 shrink-0 rounded-full bg-brand-red" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-xs font-semibold text-ink-900">{entry.label}</span>
                      <span className="shrink-0 font-mono text-[10px] text-ink-400">
                        {entry.matchCount} hasil
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {entry.q && <span className="rounded-sm bg-paper-200 px-1 font-mono text-[9px] text-ink-600">q:{entry.q}</span>}
                      {entry.pub && <span className="rounded-sm bg-paper-200 px-1 font-mono text-[9px] text-ink-600">{entry.pub}</span>}
                      {entry.cat && <span className="rounded-sm bg-amber-100 px-1 font-mono text-[9px] text-ink-600">{entry.cat}</span>}
                    </div>
                    <p className="mt-1 font-mono text-[9px] text-ink-400">
                      Dicek {formatDistanceToNow(entry.lastChecked, { locale: localeId, addSuffix: true })}
                    </p>
                    {entry.hasNew && (
                      <button
                        className="mt-1 font-mono text-[9px] text-brand-red underline underline-offset-2"
                        onClick={() => onClearNew(entry.id)}
                        type="button"
                      >
                        Tandai sudah dilihat
                      </button>
                    )}
                  </div>
                  <button
                    aria-label={`Hapus ${entry.label}`}
                    className="mt-0.5 shrink-0 rounded p-0.5 text-ink-400 transition-colors hover:bg-paper-200 hover:text-ink-900"
                    onClick={() => onRemove(entry.id)}
                    type="button"
                  >
                    <X aria-hidden="true" className="size-3" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {entries.some((e) => e.hasNew) && (
          <div className="border-t border-paper-300 px-4 py-2">
            <button
              className="w-full text-center font-mono text-[10px] text-ink-500 underline underline-offset-2 hover:text-ink-700"
              onClick={onClearAllNew}
              type="button"
            >
              Tandai semua sudah dilihat
            </button>
          </div>
        )}
      </div>

      {managerOpen && (
        <WatchlistManager onClose={() => setManagerOpen(false)} />
      )}
    </>
  );
}
