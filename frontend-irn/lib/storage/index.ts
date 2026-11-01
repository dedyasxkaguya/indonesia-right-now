import { newsroomDatabase } from '@/lib/storage/dexie-schema';
import { migrateStorage } from '@/lib/storage/migrations';
import type { NewsData, NewsItem } from '@/lib/types/api';
import type { NewsSnapshot, NotebookAnalysisRecord, NotebookEntry, ReaderCacheEntry } from '@/lib/types/storage';

export const WATCHLIST_CHANGE_EVENT = 'irn:watchlist-change';
const READER_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

function notifyWatchlistChange(): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(WATCHLIST_CHANGE_EVENT));
}

function notifyNotebookChange(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event('irn:notebook-change'));
  if ('BroadcastChannel' in window) {
    const channel = new BroadcastChannel('irn:notebook');
    channel.postMessage({ type: 'changed' });
    channel.close();
  }
}

export const storage = {
  migrate: migrateStorage,
  local: {
    get<T>(key: string): T | null {
      if (typeof window === 'undefined') return null;
      try {
        const value = window.localStorage.getItem(`irn:${key}`);
        return value === null ? null : JSON.parse(value) as T;
      } catch {
        return null;
      }
    },
    set<T>(key: string, value: T): void {
      if (typeof window !== 'undefined') window.localStorage.setItem(`irn:${key}`, JSON.stringify(value));
    },
    remove(key: string): void {
      if (typeof window !== 'undefined') window.localStorage.removeItem(`irn:${key}`);
    },
  },
  dexie: {
    async saveSnapshot(data: NewsData): Promise<void> {
      const existing = await newsroomDatabase.snapshots.where('generatedAt').equals(data.generated_at).first();
      if (existing) return;
      await newsroomDatabase.snapshots.add({ generatedAt: data.generated_at, date: data.date, data });
    },
    async listSnapshots(): Promise<NewsSnapshot[]> {
      return newsroomDatabase.snapshots.orderBy('generatedAt').reverse().toArray();
    },
    async saveBookmark(article: NewsItem): Promise<void> {
      const savedAt = new Date().toISOString();
      const existing = await newsroomDatabase.notebook.where('[kind+url]').equals(['bookmark', article.url]).first();
      await newsroomDatabase.notebook.put({ id: existing?.id, kind: 'bookmark', url: article.url, title: article.title, savedAt, article });
      notifyWatchlistChange();
    },
    async listBookmarks(): Promise<NotebookEntry[]> {
      return newsroomDatabase.notebook.orderBy('savedAt').reverse().filter((entry) => entry.kind === 'bookmark').toArray();
    },
    async hasBookmark(url: string): Promise<boolean> {
      return (await newsroomDatabase.notebook.where('[kind+url]').equals(['bookmark', url]).count()) > 0;
    },
    async deleteBookmark(url: string): Promise<void> {
      await newsroomDatabase.notebook.where('[kind+url]').equals(['bookmark', url]).delete();
      notifyWatchlistChange();
    },
    async deleteBookmarks(urls: string[]): Promise<void> {
      await newsroomDatabase.transaction('rw', newsroomDatabase.notebook, async () => {
        for (const url of urls) await newsroomDatabase.notebook.where('[kind+url]').equals(['bookmark', url]).delete();
      });
      notifyWatchlistChange();
    },
    async saveNote(entry: Omit<NotebookEntry, 'id' | 'kind' | 'savedAt'>): Promise<void> {
      const existing = await newsroomDatabase.notebook.where('[kind+url]').equals(['note', entry.url]).first();
      await newsroomDatabase.notebook.put({ ...entry, id: existing?.id, kind: 'note', savedAt: new Date().toISOString() });
    },
    notebook: {
      async list(): Promise<NotebookAnalysisRecord[]> {
        return newsroomDatabase.notebookRecords.orderBy('analyzedAt').reverse().toArray();
      },
      async save(record: NotebookAnalysisRecord): Promise<void> {
        await newsroomDatabase.notebookRecords.put(record);
        notifyNotebookChange();
      },
      async delete(id: string): Promise<void> {
        await newsroomDatabase.notebookRecords.delete(id);
        notifyNotebookChange();
      },
      async clear(): Promise<void> {
        await newsroomDatabase.notebookRecords.clear();
        notifyNotebookChange();
      },
      async exportJSONL(): Promise<string> {
        const records = await newsroomDatabase.notebookRecords.orderBy('analyzedAt').toArray();
        return records.map((record) => JSON.stringify(record)).join('\n');
      },
    },
    async saveReaderCache(entry: ReaderCacheEntry): Promise<void> {
      await newsroomDatabase.readerCache.put(entry);
    },
    async getReaderCache(url: string): Promise<ReaderCacheEntry | null> {
      const entry = await newsroomDatabase.readerCache.get(url);
      if (!entry) return null;
      if (Date.now() - Date.parse(entry.fetchedAt) > READER_CACHE_TTL_MS) {
        await newsroomDatabase.readerCache.delete(url);
        return null;
      }
      return entry;
    },
  },
};
