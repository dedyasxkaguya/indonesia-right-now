'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { storage, WATCHLIST_CHANGE_EVENT } from '@/lib/storage';
import type { NewsItem } from '@/lib/types/api';
import type { NotebookEntry } from '@/lib/types/storage';

/**
 * Bookmark state backed by the Dexie `notebook` table (entries with kind = 'bookmark').
 * Kept separate from `useWatchlist` (Phase 5 F16): bookmarks are saved articles,
 * watchlist entries are persisted search queries.
 */
export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<NotebookEntry[]>([]);
  const [ready, setReady] = useState(false);
  const [pending, setPending] = useState<Set<string>>(() => new Set());

  const refresh = useCallback(async () => {
    try {
      const entries = await storage.dexie.listBookmarks();
      setBookmarks(entries);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    void storage.migrate().catch(() => undefined).then(refresh);
    const onChange = () => { void refresh(); };
    window.addEventListener(WATCHLIST_CHANGE_EVENT, onChange);
    window.addEventListener('irn:notebook-change', onChange);
    window.addEventListener('storage', onChange);
    return () => {
      window.removeEventListener(WATCHLIST_CHANGE_EVENT, onChange);
      window.removeEventListener('irn:notebook-change', onChange);
      window.removeEventListener('storage', onChange);
    };
  }, [refresh]);

  const urls = useMemo(() => new Set(bookmarks.map((entry) => entry.url)), [bookmarks]);

  const markPending = useCallback((url: string, value: boolean) => {
    setPending((current) => {
      const next = new Set(current);
      if (value) next.add(url);
      else next.delete(url);
      return next;
    });
  }, []);

  const toggle = useCallback(async (article: NewsItem) => {
    markPending(article.url, true);
    try {
      if (urls.has(article.url)) await storage.dexie.deleteBookmark(article.url);
      else await storage.dexie.saveBookmark(article);
      await refresh();
    } finally {
      markPending(article.url, false);
    }
  }, [markPending, refresh, urls]);

  const removeMany = useCallback(async (targetUrls: string[]) => {
    await storage.dexie.deleteBookmarks(targetUrls);
    await refresh();
  }, [refresh]);

  return {
    bookmarks,
    count: bookmarks.length,
    ready,
    isBookmarked: (url: string) => urls.has(url),
    isPending: (url: string) => pending.has(url),
    toggle,
    removeMany,
  };
}
