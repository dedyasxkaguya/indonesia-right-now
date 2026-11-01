import { z } from 'zod';

const apiErrorSchema = z.object({ code: z.string(), message: z.string(), details: z.unknown().optional() });
const apiMetaSchema = z.object({ request_id: z.string(), duration_ms: z.number(), service: z.string(), version: z.string() }).optional();

export const newsSourceSchema = z.object({
  url: z.string(),
  publisher: z.string(),
  status: z.enum(['ok', 'error']),
  fetched_at: z.string(),
  items: z.number(),
  error: z.object({ code: z.string(), message: z.string() }).nullable(),
});

export const newsItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  url: z.string(),
  publisher: z.string(),
  publisher_domain: z.string(),
  author: z.string().nullable(),
  published_at: z.string(),
  date_confidence: z.string(),
  summary: z.string().nullable(),
  content: z.string().nullable(),
  categories: z.array(z.string()),
  language: z.string().nullable(),
  source_url: z.string(),
  fetched_at: z.string(),
});

export const newsStatsSchema = z.object({
  sources_total: z.number(),
  sources_ok: z.number(),
  sources_failed: z.number(),
  items_fetched: z.number(),
  items_kept: z.number(),
  items_deduped: z.number(),
});

export const newsDataSchema = z.object({
  schema_version: z.number(),
  generated_at: z.string(),
  date: z.string(),
  date_tz: z.string(),
  query: z.record(z.unknown()),
  stats: newsStatsSchema,
  sources: z.array(newsSourceSchema),
  items: z.array(newsItemSchema),
  snapshot: z.object({ written: z.boolean(), filename: z.string(), path: z.string(), dry_run: z.boolean() }),
});

export const newsResponseSchema = z.object({
  ok: z.boolean(),
  data: newsDataSchema.nullable(),
  error: apiErrorSchema.nullable(),
  meta: apiMetaSchema,
});

export const fetchNewsItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  snippet: z.string().nullable(),
  url: z.string().nullable(),
  source_name: z.string().nullable(),
  source_verified: z.boolean(),
  published_text: z.string().nullable(),
  duration_text: z.string().nullable(),
  views_text: z.string().nullable(),
  badges: z.array(z.string()),
  extras: z.record(z.unknown()),
});

export const fetchAIStatsSchema = z.object({
  guard_status: z.enum(['pass', 'error', 'blocked']),
  guard_confidence: z.number(),
  chunks_total: z.number(),
  chunks_ok: z.number(),
  chunks_failed: z.number(),
  items_raw: z.number(),
  items_kept: z.number(),
  items_omitted: z.number(),
  deduped: z.number(),
  language: z.string(),
  model: z.string(),
  cached: z.boolean(),
  duration_ms: z.number(),
});

export const fetchDataSchema = z.object({
  url: z.string(),
  final_url: z.string(),
  mode: z.string(),
  engine: z.string(),
  title: z.string(),
  truncated: z.boolean(),
  length: z.number(),
  http_status: z.number(),
  screenshot_png_base64: z.string().nullable(),
  duration_ms: z.number(),
  news_items: z.array(fetchNewsItemSchema),
  raw: z.string().nullable(),
  ai: fetchAIStatsSchema,
  saved: z.object({
    written: z.boolean().optional(),
    path: z.string().optional(),
    filename: z.string().optional(),
  }).nullish().transform((value) => ({ written: value?.written ?? false, path: value?.path ?? '', filename: value?.filename ?? '' })),
});

export const fetchResponseSchema = z.object({
  ok: z.boolean(),
  data: fetchDataSchema.nullable(),
  error: apiErrorSchema.nullable(),
  meta: apiMetaSchema,
});

export const fetchRequestSchema = z.object({
  url: z.string().trim().min(1).max(2048).url().refine((value) => {
    const normalized = value.toLowerCase();
    return normalized.startsWith('http://') || normalized.startsWith('https://');
  }, 'URL harus menggunakan HTTP atau HTTPS.'),
  mode: z.enum(['text', 'markdown', 'html', 'reader']).optional().default('text'),
  include_raw: z.boolean().optional().default(false),
});

