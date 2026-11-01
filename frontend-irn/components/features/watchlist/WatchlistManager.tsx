'use client';

import React, { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Plus, Trash2 } from 'lucide-react';
import { useWatchlist } from '@/hooks/useWatchlist';

interface WatchlistManagerProps {
  onClose: () => void;
}

export function WatchlistManager({ onClose }: WatchlistManagerProps) {
  const { entries, addEntry, removeEntry } = useWatchlist();
  const [label, setLabel] = useState('');
  const [q, setQ] = useState('');
  const [pub, setPub] = useState('');
  const [cat, setCat] = useState('');
  const [error, setError] = useState('');

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!label.trim()) {
      setError('Label wajib diisi.');
      return;
    }
    if (!q.trim() && !pub.trim() && !cat.trim()) {
      setError('Minimal satu filter wajib diisi (q, publisher, atau kategori).');
      return;
    }
    addEntry({
      label: label.trim(),
      q: q.trim() || undefined,
      pub: pub.trim() || undefined,
      cat: cat.trim() || undefined,
    });
    setLabel('');
    setQ('');
    setPub('');
    setCat('');
    setError('');
  }

  return (
    <Dialog.Root open onOpenChange={(open) => { if (!open) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink-900/40 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 border border-paper-300 bg-paper-50 shadow-xl focus:outline-none">
          <div className="flex items-center justify-between border-b border-paper-300 px-6 py-4">
            <Dialog.Title className="font-sans text-h3 text-ink-900">
              Kelola Watchlist
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                aria-label="Tutup dialog watchlist"
                className="rounded p-1 text-ink-500 transition-colors hover:bg-paper-200 hover:text-ink-900"
                type="button"
              >
                <X aria-hidden="true" className="size-4" />
              </button>
            </Dialog.Close>
          </div>

          <div className="space-y-6 p-6">
            {/* Add form */}
            <form className="space-y-3" onSubmit={handleAdd}>
              <p className="font-mono text-[10px] uppercase tracking-wider text-ink-500">Tambah entri baru</p>
              <div>
                <label className="mb-1 block font-mono text-xs text-ink-700" htmlFor="wl-label">
                  Label <span className="text-brand-red">*</span>
                </label>
                <input
                  className="w-full min-h-11 bg-paper-50 border border-paper-300 px-3 py-2 font-mono text-xs text-ink-900 focus:border-brand-red focus:outline-none"
                  id="wl-label"
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="mis. Karhutla Kalimantan"
                  type="text"
                  value={label}
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="mb-1 block font-mono text-[10px] text-ink-600" htmlFor="wl-q">Kata kunci</label>
                  <input
                    className="w-full min-h-11 bg-paper-50 border border-paper-300 px-2 py-1.5 font-mono text-xs text-ink-900 focus:border-brand-red focus:outline-none"
                    id="wl-q"
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="q=..."
                    type="text"
                    value={q}
                  />
                </div>
                <div>
                  <label className="mb-1 block font-mono text-[10px] text-ink-600" htmlFor="wl-pub">Publisher</label>
                  <input
                    className="w-full min-h-11 bg-paper-50 border border-paper-300 px-2 py-1.5 font-mono text-xs text-ink-900 focus:border-brand-red focus:outline-none"
                    id="wl-pub"
                    onChange={(e) => setPub(e.target.value)}
                    placeholder="kompas.com"
                    type="text"
                    value={pub}
                  />
                </div>
                <div>
                  <label className="mb-1 block font-mono text-[10px] text-ink-600" htmlFor="wl-cat">Kategori</label>
                  <input
                    className="w-full min-h-11 bg-paper-50 border border-paper-300 px-2 py-1.5 font-mono text-xs text-ink-900 focus:border-brand-red focus:outline-none"
                    id="wl-cat"
                    onChange={(e) => setCat(e.target.value)}
                    placeholder="politics"
                    type="text"
                    value={cat}
                  />
                </div>
              </div>
              {error && <p className="font-mono text-xs text-data-danger">{error}</p>}
              <button
                className="inline-flex min-h-11 items-center gap-2 bg-brand-red px-4 py-2 font-mono text-xs font-semibold text-paper-50 transition-colors hover:bg-brand-redDeep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red focus-visible:ring-offset-2"
                type="submit"
              >
                <Plus aria-hidden="true" className="size-3.5" />
                Tambah
              </button>
            </form>

            {/* Entries list */}
            {entries.length > 0 && (
              <div>
                <p className="mb-3 font-mono text-[10px] uppercase tracking-wider text-ink-500">Entri tersimpan ({entries.length})</p>
                <ul className="divide-y divide-paper-200 border border-paper-300">
                  {entries.map((entry) => (
                    <li className="flex items-center justify-between px-4 py-3" key={entry.id}>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-ink-900">{entry.label}</p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {entry.q && <span className="rounded-sm bg-paper-200 px-1 font-mono text-[9px] text-ink-600">q:{entry.q}</span>}
                          {entry.pub && <span className="rounded-sm bg-paper-200 px-1 font-mono text-[9px] text-ink-600">{entry.pub}</span>}
                          {entry.cat && <span className="rounded-sm bg-amber-100 px-1 font-mono text-[9px] text-ink-600">{entry.cat}</span>}
                        </div>
                        <p className="mt-1 font-mono text-[9px] text-ink-400">{entry.matchCount} hasil cocok</p>
                      </div>
                      <button
                        aria-label={`Hapus watchlist ${entry.label}`}
                        className="ml-4 shrink-0 rounded p-1 text-ink-400 transition-colors hover:bg-paper-200 hover:text-data-danger"
                        onClick={() => removeEntry(entry.id)}
                        type="button"
                      >
                        <Trash2 aria-hidden="true" className="size-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
