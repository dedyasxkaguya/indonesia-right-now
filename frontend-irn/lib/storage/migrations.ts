import { newsroomDatabase } from '@/lib/storage/dexie-schema';

export async function migrateStorage(): Promise<void> {
  await newsroomDatabase.open();
  try { localStorage.setItem('irn:storage-version:v1', String(newsroomDatabase.verno)); } catch { /* IndexedDB is the source of truth. */ }
}
