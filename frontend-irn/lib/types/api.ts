import type { z } from 'zod';
import type { fetchResponseSchema, newsResponseSchema } from '@/lib/api/schemas';

export type NewsSource = {
  url: string;
  publisher: string;
  status: 'ok' | 'error';
  fetched_at: string;
  items: number;
  error: { code: string; message: string } | null;
};

export type NewsItem = {
  id: string;
  title: string;
  url: string;
  publisher: string;
  publisher_domain: string;
  author: string | null;
  published_at: string;
  date_confidence: string;
  summary: string | null;
  content: string | null;
  categories: string[];
  language: string | null;
  source_url: string;
  fetched_at: string;
};

export type NewsStats = {
  sources_total: number;
  sources_ok: number;
  sources_failed: number;
  items_fetched: number;
  items_kept: number;
  items_deduped: number;
};

export type NewsData = {
  schema_version: number;
  generated_at: string;
  date: string;
  date_tz: string;
  query: Record<string, unknown>;
  stats: NewsStats;
  sources: NewsSource[];
  items: NewsItem[];
  snapshot: { written: boolean; filename: string; path: string; dry_run: boolean };
};

export type ApiError = { code: string; message: string; details?: unknown };
export type ApiMeta = { request_id: string; duration_ms: number; service: string; version: string };
export type NewsResponse = { ok: boolean; data: NewsData | null; error: ApiError | null; meta?: ApiMeta };

export type FetchNewsItem = {
  id: string;
  title: string;
  snippet: string | null;
  url: string | null;
  source_name: string | null;
  source_verified: boolean;
  published_text: string | null;
  duration_text: string | null;
  views_text: string | null;
  badges: string[];
  extras: Record<string, unknown>;
};


export type FetchAIStats = {
  guard_status: 'pass' | 'error' | 'blocked';
  guard_confidence: number;
  chunks_total: number;
  chunks_ok: number;
  chunks_failed: number;
  items_raw: number;
  items_kept: number;
  items_omitted: number;
  deduped: number;
  language: string;
  model: string;
  cached: boolean;
  duration_ms: number;
};

export type FetchData = {
  url: string;
  final_url: string;
  mode: string;
  engine: string;
  title: string;
  truncated: boolean;
  length: number;
  http_status: number;
  screenshot_png_base64: string | null;
  duration_ms: number;
  news_items: FetchNewsItem[];
  raw: string | null;
  ai: FetchAIStats;
  saved: { written: boolean; path: string; filename: string };
};

export type FetchResponse = { ok: boolean; data: FetchData | null; error: ApiError | null; meta?: ApiMeta };
export type ParsedNewsResponse = z.infer<typeof newsResponseSchema>;
export type ParsedFetchResponse = z.infer<typeof fetchResponseSchema>;
