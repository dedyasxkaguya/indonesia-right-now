'use client';

import { fetchResponseSchema, newsResponseSchema } from '@/lib/api/schemas';
import { storage } from '@/lib/storage';
import type { FetchData, NewsResponse } from '@/lib/types/api';

const fetchRequestsInFlight = new Map<string, Promise<FetchData>>();

export async function fetchNewsClient(url: string): Promise<NewsResponse> {
  const response = await fetch(url);
  const payload: unknown = await response.json();
  const parsed = newsResponseSchema.safeParse(payload);
  if (!parsed.success) throw new Error('Format data dari server tidak sesuai.');
  if (!response.ok || !parsed.data.ok || !parsed.data.data) {
    throw new Error(parsed.data.error?.message ?? 'Layanan berita tidak dapat dijangkau.');
  }
  void storage.dexie.saveSnapshot(parsed.data.data).catch(() => undefined);
  return parsed.data;
}

export function fetchUrlClient(url: string, mode: 'text' | 'markdown' = 'text'): Promise<FetchData> {
  const key = `${mode}:${url}`;
  const existing = fetchRequestsInFlight.get(key);
  if (existing) return existing;

  const request = (async () => {
    const response = await fetch('/api/fetch', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url, mode, include_raw: mode === 'markdown' }),
    });
    const payload: unknown = await response.json();
    const parsed = fetchResponseSchema.safeParse(payload);
    if (!parsed.success) throw new Error('Format data dari server tidak sesuai.');
    if (!response.ok || !parsed.data.ok || !parsed.data.data) {
      throw new Error(parsed.data.error?.message ?? 'Analisis belum dapat diselesaikan.');
    }
    return parsed.data.data;
  })();
  fetchRequestsInFlight.set(key, request);
  void request.finally(() => {
    if (fetchRequestsInFlight.get(key) === request) fetchRequestsInFlight.delete(key);
  }).catch(() => undefined);
  return request;
}
