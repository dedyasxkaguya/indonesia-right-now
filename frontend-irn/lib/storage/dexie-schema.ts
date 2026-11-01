import Dexie, { type Table } from 'dexie';
import type { NewsSnapshot, NotebookAnalysisRecord, NotebookEntry, ReaderCacheEntry } from '@/lib/types/storage';

export class NewsroomDatabase extends Dexie {
  notebook!: Table<NotebookEntry, number>;
  readerCache!: Table<ReaderCacheEntry, string>;
  snapshots!: Table<NewsSnapshot, number>;
  notebookRecords!: Table<NotebookAnalysisRecord, string>;

  constructor() {
    super('indonesia-right-now');
    this.version(1).stores({
      notebook: '++id, kind, url, savedAt, title, [kind+url]',
      readerCache: 'url, fetchedAt',
      snapshots: '++id, &generatedAt, date',
    });
    this.version(2).stores({
      notebook: '++id, kind, url, savedAt, title, &[kind+url]',
      readerCache: 'url, fetchedAt',
      snapshots: '++id, &generatedAt, date',
    });
    this.version(3).stores({
      notebook: '++id, kind, url, savedAt, title, &[kind+url]',
      readerCache: 'url, fetchedAt',
      snapshots: '++id, &generatedAt, date',
      notebookRecords: 'id, url, analyzedAt, title',
    });
  }
}

export const newsroomDatabase = new NewsroomDatabase();
