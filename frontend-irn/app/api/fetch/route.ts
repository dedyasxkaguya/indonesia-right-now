import { NextRequest, NextResponse } from 'next/server';
import { fetchRequestSchema, fetchResponseSchema } from '@/lib/api/schemas';
import { BackendRequestError, postFetch } from '@/lib/api/server';

export const runtime = 'nodejs';

const userMessages: Record<string, string> = {
  FETCH_SSRF_BLOCKED: 'URL mengarah ke alamat privat/lokal — tidak diizinkan.',
  FETCH_AI_GUARD_BLOCKED: 'Konten halaman terindikasi mengandung prompt-injection. Analisis dibatalkan.',
  FETCH_AI_EXTRACTOR_FAILED: 'AI tidak menemukan item berita yang dapat diekstrak.',
  FETCH_TIMEOUT: 'Halaman memakan waktu terlalu lama. Coba URL lain atau ulangi.',
  FETCH_FORBIDDEN: 'Halaman menolak permintaan analisis.',
  FETCH_NO_CONTENT: 'Tidak ada konten yang dapat dianalisis dari URL tersebut.',
  BACKEND_OFFLINE: 'Layanan berita tidak dapat dijangkau. Coba lagi beberapa saat lagi.',
  UPSTREAM_SCHEMA_MISMATCH: 'Format data dari server tidak sesuai.',
  UPSTREAM_TIMEOUT: 'Server memerlukan waktu terlalu lama untuk merespons.',
  VALIDATION_ERROR: 'Input tidak valid.',
};

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, data: null, error: { code: 'VALIDATION_ERROR', message: userMessages.VALIDATION_ERROR } },
      { status: 400 },
    );
  }

  const parsed = fetchRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, data: null, error: { code: 'VALIDATION_ERROR', message: userMessages.VALIDATION_ERROR } },
      { status: 400 },
    );
  }

  const { url, mode, include_raw } = parsed.data;

  try {
    let result: unknown;
    if (include_raw || mode === 'markdown' || mode === 'reader' || mode === 'html') {
      // Bypass postFetch for modes that need raw content (Reader /baca path)
      const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:8000';
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60_000);
      try {
        const response = await fetch(`${backendUrl.replace(/\/$/, '')}/fetch`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ url, mode, save: false, include_raw }),
          signal: controller.signal,
          cache: 'no-store',
        });
        result = await response.json();
      } finally {
        clearTimeout(timeout);
      }
    } else {
      // Default path (analisis-url, mode=text, no raw)
      result = await postFetch(url, mode);
    }

    const parsedResult = fetchResponseSchema.safeParse(result);
    if (!parsedResult.success) {
      return NextResponse.json(
        { ok: false, data: null, error: { code: 'UPSTREAM_SCHEMA_MISMATCH', message: userMessages.UPSTREAM_SCHEMA_MISMATCH } },
        { status: 502 },
      );
    }

    if (!parsedResult.data.ok && parsedResult.data.error) {
      return NextResponse.json(
        {
          ...parsedResult.data,
          error: {
            ...parsedResult.data.error,
            message: userMessages[parsedResult.data.error.code] ?? parsedResult.data.error.message,
          },
        },
        { status: 502 },
      );
    }

    return NextResponse.json(parsedResult.data);
  } catch (error) {
    const code = error instanceof BackendRequestError ? error.code : 'BACKEND_OFFLINE';
    const message = userMessages[code] ?? userMessages.BACKEND_OFFLINE;
    return NextResponse.json(
      { ok: false, data: null, error: { code, message } },
      { status: error instanceof BackendRequestError ? error.status : 503 },
    );
  }
}