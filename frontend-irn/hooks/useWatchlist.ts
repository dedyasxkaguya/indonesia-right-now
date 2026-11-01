'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export interface WatchEntry {
  id: string;
  label: string;
  q?: string;
  pub?: string;
  cat?: string;
  since?: string;
  addedAt: number;
  lastChecked: number;
  matchCount: number;
  hasNew: boolean;
}

const STORAGE_KEY = 'irn:watchlist:v1';
const POLL_INTERVAL_MS = 60 * 1000; // 60 seconds (F16 spec)

function loadEntries(): WatchEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as WatchEntry[];
  } catch {
    return [];
  }
}

function saveEntries(entries: WatchEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch { /* storage full or unavailable */ }
}

function generateId(): string {
  return `w-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function useWatchlist() {
  const [entries, setEntries] = useState<WatchEntry[]>([]);
  const pollerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setEntries(loadEntries());
  }, []);

  const persist = useCallback((updated: WatchEntry[]) => {
    setEntries(updated);
    saveEntries(updated);
  }, []);

  const addEntry = useCallback((params: Omit<WatchEntry, 'id' | 'addedAt' | 'lastChecked' | 'matchCount' | 'hasNew'>) => {
    const entry: WatchEntry = {
      ...params,
      id: generateId(),
      addedAt: Date.now(),
      lastChecked: Date.now(),
      matchCount: 0,
      hasNew: false,
    };
    setEntries((prev) => {
      const updated = [entry, ...prev];
      saveEntries(updated);
      return updated;
    });
  }, []);

  const removeEntry = useCallback((id: string) => {
    setEntries((prev) => {
      const updated = prev.filter((e) => e.id !== id);
      saveEntries(updated);
      return updated;
    });
  }, []);

  const clearNew = useCallback((id: string) => {
    setEntries((prev) => {
      const updated = prev.map((e) => e.id === id ? { ...e, hasNew: false } : e);
      saveEntries(updated);
      return updated;
    });
  }, []);

  const clearAllNew = useCallback(() => {
    setEntries((prev) => {
      const updated = prev.map((e) => ({ ...e, hasNew: false }));
      saveEntries(updated);
      return updated;
    });
  }, []);

  // Poll: fetch /api/news and diff match counts
  useEffect(() => {
    async function poll() {
      const current = loadEntries();
      if (!current.length) return;

      try {
        const res = await fetch('/api/news?max_items=200', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json() as { ok: boolean; data: { items: { title: string; publisher: string; categories: string[] }[] } };
        if (!data.ok) return;

        const items = data.data.items;
        const updated = current.map((entry) => {
          const matches = items.filter((item) => {
            if (entry.q) {
              const q = entry.q.toLowerCase();
              if (!item.title.toLowerCase().includes(q) && !item.publisher.toLowerCase().includes(q)) return false;
            }
            if (entry.pub && item.publisher !== entry.pub) return false;
            if (entry.cat && !item.categories.includes(entry.cat)) return false;
            return true;
          });
          const prevCount = entry.matchCount;
          const newCount = matches.length;
          return {
            ...entry,
            matchCount: newCount,
            lastChecked: Date.now(),
            hasNew: newCount > prevCount || entry.hasNew,
          };
        });
        saveEntries(updated);
        setEntries(updated);
      } catch { /* network unavailable — keep existing state */ }
    }

    function start() {
      if (pollerRef.current) clearInterval(pollerRef.current);
      pollerRef.current = setInterval(() => { void poll(); }, POLL_INTERVAL_MS);
    }

    function stop() {
      if (pollerRef.current) {
        clearInterval(pollerRef.current);
        pollerRef.current = null;
      }
    }

    function onVisibilityChange() {
      if (document.visibilityState === 'hidden') {
        stop();
        return;
      }
      void poll();
      start();
    }

    void poll();
    start();
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  const hasAnyNew = entries.some((e) => e.hasNew);
  const totalNew = entries.reduce((acc, e) => acc + (e.hasNew ? 1 : 0), 0);

  return { entries, hasAnyNew, totalNew, addEntry, removeEntry, clearNew, clearAllNew, persist };
}
