import 'server-only';
import { fetchResponseSchema, newsResponseSchema } from '@/lib/api/schemas';
import type { FetchResponse, NewsData, NewsResponse } from '@/lib/types/api';

const backendUrl = (process.env.BACKEND_URL ?? 'http://localhost:8000').replace(/\/$/, '');

export class BackendRequestError extends Error {
  constructor(public readonly code: string, message: string, public readonly status: number) {
    super(message);
    this.name = 'BackendRequestError';
  }
}

type BackendRequestInit = RequestInit & { next?: { revalidate?: number } };

async function requestJson<T>(path: string, init: BackendRequestInit, schema: { parse: (value: unknown) => T }, timeoutMs: number): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${backendUrl}${path}`, { ...init, signal: controller.signal });
    const payload: unknown = await response.json();
    try {
      return schema.parse(payload);
    } catch {
      throw new BackendRequestError('UPSTREAM_SCHEMA_MISMATCH', 'Format data dari server tidak sesuai.', 502);
    }
  } catch (error) {
    if (error instanceof BackendRequestError) throw error;
    if (error instanceof Error && error.name === 'AbortError') {
      throw new BackendRequestError('UPSTREAM_TIMEOUT', 'Server memerlukan waktu terlalu lama untuk merespons.', 504);
    }
    throw new BackendRequestError('BACKEND_OFFLINE', 'Layanan berita tidak dapat dijangkau. Coba lagi beberapa saat lagi.', 503);
  } finally {
    clearTimeout(timeout);
  }
}

export async function getNews(query = ''): Promise<NewsResponse> {
  const suffix = query ? `?${query}` : '';
  return requestJson(`/news${suffix}`, { method: 'GET', next: { revalidate: 60 } }, newsResponseSchema, 15_000);
}

export async function postNews(options: {
  sources?: { name: string; url: string }[];
  since?: string;
  max_items?: number;
  category?: string[];
  publisher?: string[];
  keyword?: string[];
  exclude?: string[];
}): Promise<NewsResponse> {
  const body: Record<string, unknown> = {
    since: options.since ?? '24h',
    max_items: options.max_items ?? 100,
    dry_run: false,
  };
  if (options.sources?.length) body.sources = options.sources;
  if (options.category?.length) body.category = options.category;
  if (options.publisher?.length) body.publisher = options.publisher;
  if (options.keyword?.length) body.keyword = options.keyword;
  if (options.exclude?.length) body.exclude = options.exclude;

  return requestJson('/news', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    next: { revalidate: 60 },
  }, newsResponseSchema, 60_000);
}

export async function postFetch(url: string, mode: 'text' | 'markdown' = 'text'): Promise<FetchResponse> {
  return requestJson('/fetch', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ url, mode, save: false, include_raw: mode === 'markdown' }),
    cache: 'no-store',
  }, fetchResponseSchema, 60_000);
}
